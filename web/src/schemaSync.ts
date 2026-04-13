import type { SchemaField, SchemaFieldType } from './types'

const FIELD_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/** Example values for one row (index 0) — mirrors server-side generators loosely. */
export function exampleValueForType(type: SchemaFieldType, index: number): unknown {
  switch (type) {
    case 'string':
      return `string_${index}`
    case 'number':
      return index * 7 + 1
    case 'integer':
      return index + 1
    case 'float':
      return Math.round((index * 1.37 + 0.5) * 100) / 100
    case 'boolean':
      return index % 2 === 0
    case 'email':
      return `user${index}@example.com`
    case 'uuid':
      return '00000000-0000-4000-8000-000000000001'
    case 'date':
      return new Date(Date.now() + index * 86400000).toISOString()
    case 'name':
      return `Name ${index}`
    default:
      return `value_${index}`
  }
}

/** Pretty-printed flat object JSON from the field list (stays in sync with the table). */
export function schemaToFormattedSampleJson(schema: SchemaField[]): string {
  const obj: Record<string, unknown> = {}
  for (const field of schema) {
    obj[field.name] = exampleValueForType(field.type, 0)
  }
  return JSON.stringify(obj, null, 2)
}

function inferTypeFromValue(v: unknown): SchemaFieldType {
  if (v === null) return 'string'
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'number') {
    return Number.isInteger(v) ? 'integer' : 'float'
  }
  if (typeof v === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email'
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    ) {
      return 'uuid'
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return 'date'
    if (v.length < 48) return 'name'
    return 'string'
  }
  return 'string'
}

function isFlatPrimitive(v: unknown): boolean {
  if (v === null) return true
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean'
}

/**
 * If the JSON is a flat object (or a non-empty array whose first element is a flat object),
 * returns inferred schema. Nested objects/arrays in values return null.
 */
export function tryInferFlatSchemaFromSampleJson(text: string): SchemaField[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  let obj: Record<string, unknown>
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null
    const first = parsed[0]
    if (first === null || typeof first !== 'object' || Array.isArray(first)) return null
    obj = first as Record<string, unknown>
  } else if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    obj = parsed as Record<string, unknown>
  } else {
    return null
  }
  const keys = Object.keys(obj)
  if (keys.length === 0) return null
  for (const k of keys) {
    if (!FIELD_NAME_RE.test(k)) return null
    if (!isFlatPrimitive(obj[k])) return null
  }
  return keys.map((name) => ({
    name,
    type: inferTypeFromValue(obj[name]),
  }))
}
