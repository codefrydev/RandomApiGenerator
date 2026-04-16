import { useCallback, useMemo, useState } from 'react'
import type {
  EndpointExample,
  EndpointResponseMode,
  HttpMethod,
  MockDataMode,
  SchemaField,
} from '../types'
import { schemaToFormattedSampleJson, tryInferFlatSchemaFromSampleJson } from '../schemaSync'
import {
  flattenWorkspaceEndpoints,
  getSelectedEndpoint,
  addRouteToSelection,
  createDefaultPersistedState,
  removeSelectedRoute,
  updateSelectedEndpoint,
} from '../workspaceModel'
import { computeDisplayUrl, computePlaceholderUrl } from '../lib/buildAppUrls'
import { substitutePathVars } from '../lib/envSubstitute'
import { usePersistedAppState } from './usePersistedAppState'
import { useMockServerControls } from './useMockServerControls'
import { useRequestPlayback } from './useRequestPlayback'

export function useRandomApiApp() {
  const [tree, setTree] = useState(() => createDefaultPersistedState())
  const [schemaTab, setSchemaTab] = useState<'schema' | 'params' | 'code'>('schema')
  const [workspaceRenameOpen, setWorkspaceRenameOpen] = useState(false)
  const [collectionExpanded, setCollectionExpanded] = useState<Record<string, boolean>>({})

  const {
    electron,
    persistDisabled,
    persistBannerMessage,
    persistBannerDismissed,
    setPersistBannerDismissed,
  } = usePersistedAppState({ tree, setTree })

  const selectedWorkspace = tree.workspaces.find((w) => w.id === tree.selectedWorkspaceId)
  const selectedCollection = selectedWorkspace?.collections.find(
    (c) => c.id === tree.selectedCollectionId,
  )
  const selected = getSelectedEndpoint(tree)
  const flatEndpoints = flattenWorkspaceEndpoints(tree.workspaces, tree.selectedWorkspaceId)
  const requestMethod = tree.requestMethod
  const sampleCount = tree.sampleCount
  const mockDataMode: MockDataMode = tree.mockDataMode ?? 'seeded'

  const selectedEnv = useMemo(
    () => tree.environments.find((e) => e.id === tree.selectedEnvironmentId),
    [tree.environments, tree.selectedEnvironmentId],
  )

  const flatEndpointsForServer = useMemo(() => {
    const vars = selectedEnv?.variables ?? {}
    return flatEndpoints.map((ep) => ({
      ...ep,
      path: substitutePathVars(ep.path.replace(/^\/+/, ''), vars),
      method: ep.method ?? tree.requestMethod,
    }))
  }, [flatEndpoints, selectedEnv, tree.requestMethod])

  const {
    server,
    busy,
    lastKnownBaseUrl,
    handleStart: startServerBase,
    handleStop: stopServerBase,
    restartServerIfRunningWithMode,
  } = useMockServerControls(electron, flatEndpointsForServer, mockDataMode, tree.requestMethod)

  const request = useRequestPlayback()

  const effectiveMethod: HttpMethod = selected?.method ?? tree.requestMethod
  const effectivePathSegment = useMemo(() => {
    const raw = selected?.path.replace(/^\/+/, '') ?? ''
    return substitutePathVars(raw, selectedEnv?.variables ?? {})
  }, [selected?.path, selectedEnv?.variables])

  const running = server.status === 'running'
  const baseUrl = server.status === 'running' ? (server.baseUrl ?? '') : ''

  const displayUrl = useMemo(
    () =>
      computeDisplayUrl(running, baseUrl, effectivePathSegment, effectiveMethod, sampleCount),
    [running, baseUrl, effectivePathSegment, effectiveMethod, sampleCount],
  )

  const placeholderUrl = useMemo(
    () =>
      computePlaceholderUrl(
        baseUrl,
        lastKnownBaseUrl,
        effectivePathSegment,
        effectiveMethod,
        sampleCount,
      ),
    [baseUrl, lastKnownBaseUrl, effectivePathSegment, effectiveMethod, sampleCount],
  )

  const showCountQuery = effectiveMethod === 'GET' || effectiveMethod === 'HEAD'
  const showRequestBodyEditor =
    effectiveMethod === 'POST' || effectiveMethod === 'PUT' || effectiveMethod === 'PATCH'

  const requestCodeSpec = useMemo(() => {
    const url = displayUrl || placeholderUrl
    const trimmed = request.requestBody.trim()
    const jsonBody: string | undefined =
      showRequestBodyEditor && trimmed.length > 0 ? trimmed : undefined
    return { method: effectiveMethod, url, jsonBody }
  }, [
    displayUrl,
    placeholderUrl,
    effectiveMethod,
    request.requestBody,
    showRequestBodyEditor,
  ])

  const handleStart = useCallback(async () => {
    request.resetResponse()
    await startServerBase()
  }, [request, startServerBase])

  const handleStop = useCallback(async () => {
    request.resetResponse()
    await stopServerBase()
  }, [request, stopServerBase])

  const setMockDataMode = useCallback(
    (mode: MockDataMode) => {
      setTree((t) => ({ ...t, mockDataMode: mode }))
      void restartServerIfRunningWithMode(mode)
    },
    [restartServerIfRunningWithMode],
  )

  const updateEndpointPath = (path: string) => {
    setTree((t) => updateSelectedEndpoint(t, (ep) => ({ ...ep, path })))
  }

  const addRoute = () => setTree((t) => addRouteToSelection(t))

  const removeRoute = () => setTree((t) => removeSelectedRoute(t))

  const addField = () => {
    setTree((t) =>
      updateSelectedEndpoint(t, (ep) => {
        const schema: SchemaField[] = [
          ...ep.schema,
          { name: `field_${ep.schema.length + 1}`, type: 'string' },
        ]
        return {
          ...ep,
          schema,
          sampleJson: schemaToFormattedSampleJson(schema, t.mockDataMode ?? 'seeded'),
        }
      }),
    )
  }

  const updateField = (fieldIndex: number, patch: Partial<SchemaField>) => {
    setTree((t) =>
      updateSelectedEndpoint(t, (ep) => {
        const schema = ep.schema.map((f, fi) =>
          fi === fieldIndex ? { ...f, ...patch } : f,
        )
        return {
          ...ep,
          schema,
          sampleJson: schemaToFormattedSampleJson(schema, t.mockDataMode ?? 'seeded'),
        }
      }),
    )
  }

  const removeField = (fieldIndex: number) => {
    setTree((t) =>
      updateSelectedEndpoint(t, (ep) => {
        const schema = ep.schema.filter((_, fi) => fi !== fieldIndex)
        const nextSchema: SchemaField[] = schema.length ? schema : [{ name: 'id', type: 'integer' }]
        return {
          ...ep,
          schema: nextSchema,
          sampleJson: schemaToFormattedSampleJson(nextSchema, t.mockDataMode ?? 'seeded'),
        }
      }),
    )
  }

  const setEndpointResponseMode = (mode: EndpointResponseMode) => {
    setTree((t) =>
      updateSelectedEndpoint(t, (ep) => {
        if (mode === 'sampleJson') {
          const sampleJson =
            ep.sampleJson && ep.sampleJson.trim().length > 0
              ? ep.sampleJson
              : schemaToFormattedSampleJson(ep.schema, t.mockDataMode ?? 'seeded')
          return {
            ...ep,
            responseMode: 'sampleJson',
            sampleJson,
          }
        }
        const inferred = tryInferFlatSchemaFromSampleJson(ep.sampleJson ?? '')
        return {
          ...ep,
          responseMode: 'schema',
          schema: inferred ?? ep.schema,
        }
      }),
    )
  }

  const updateSampleJson = (text: string) => {
    setTree((t) =>
      updateSelectedEndpoint(t, (ep) => {
        const inferred = tryInferFlatSchemaFromSampleJson(text)
        if (inferred) {
          return {
            ...ep,
            sampleJson: text,
            schema: inferred,
          }
        }
        return { ...ep, sampleJson: text }
      }),
    )
  }

  const responseMode: EndpointResponseMode = selected?.responseMode ?? 'schema'

  const exampleResponseError = useMemo(() => {
    if (responseMode !== 'sampleJson' || !selected) return null
    const raw = selected.sampleJson ?? ''
    if (!raw.trim()) return 'Paste a JSON response body to define the shape.'
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed === null || typeof parsed !== 'object') {
        return 'The example must be a JSON object or array.'
      }
      if (Array.isArray(parsed) && parsed.length === 0) {
        return 'If you use an array, include at least one example item.'
      }
      return null
    } catch {
      return 'Invalid JSON — check commas and quotes.'
    }
  }, [responseMode, selected])

  const sendRequest = useCallback(async () => {
    await request.sendRequest(
      server,
      sampleCount,
      effectiveMethod,
      showRequestBodyEditor,
      effectivePathSegment,
    )
  }, [
    request,
    server,
    sampleCount,
    effectiveMethod,
    showRequestBodyEditor,
    effectivePathSegment,
  ])

  const setRequestMethod = (m: HttpMethod) => {
    setTree((t) => {
      const withRoute = updateSelectedEndpoint(t, (ep) => ({ ...ep, method: m }))
      return { ...withRoute, requestMethod: m }
    })
    request.setRequestBody('')
  }

  const updateEndpointMock = useCallback(
    (patch: {
      delayMs?: number | undefined
      httpStatus?: number | undefined
      responseSource?: 'generated' | 'example'
      activeExampleIndex?: number
      examples?: EndpointExample[]
    }) => {
      setTree((t) => updateSelectedEndpoint(t, (ep) => ({ ...ep, ...patch })))
    },
    [],
  )

  const isCollectionExpanded = (collectionId: string) => collectionExpanded[collectionId] !== false

  const toggleCollectionExpanded = (collectionId: string) => {
    setCollectionExpanded((prev) => {
      const wasOpen = prev[collectionId] !== false
      return { ...prev, [collectionId]: !wasOpen }
    })
  }

  return {
    tree,
    setTree,
    server,
    busy,
    preview: request.preview,
    rawBody: request.rawBody,
    fetchError: request.fetchError,
    responseMeta: request.responseMeta,
    schemaTab,
    setSchemaTab,
    bodyView: request.bodyView,
    setBodyView: request.setBodyView,
    requestBody: request.requestBody,
    setRequestBody: request.setRequestBody,
    persistDisabled,
    persistBannerMessage,
    persistBannerDismissed,
    setPersistBannerDismissed,
    workspaceRenameOpen,
    setWorkspaceRenameOpen,
    collectionExpanded,
    electron,
    selectedWorkspace,
    selectedCollection,
    selected,
    selectedEnv,
    flatEndpoints,
    requestMethod,
    effectiveMethod,
    sampleCount,
    mockDataMode,
    setMockDataMode,
    isCollectionExpanded,
    toggleCollectionExpanded,
    running,
    baseUrl,
    lastKnownBaseUrl,
    displayUrl,
    placeholderUrl,
    showCountQuery,
    showRequestBodyEditor,
    requestCodeSpec,
    updateEndpointPath,
    addRoute,
    removeRoute,
    addField,
    updateField,
    removeField,
    setEndpointResponseMode,
    updateSampleJson,
    responseMode,
    exampleResponseError,
    handleStart,
    handleStop,
    sendRequest,
    setRequestMethod,
    updateEndpointMock,
  }
}
