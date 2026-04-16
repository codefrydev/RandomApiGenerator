const {
  SAMPLE_JSON_MAX_CHARS,
  SAMPLE_JSON_MAX_DEPTH,
  SAMPLE_JSON_MAX_KEYS,
  ALLOWED_METHODS,
} = require('./constants.cjs');
const { sanitizePathSegment } = require('./sanitize.cjs');

function countJsonKeys(node, depth) {
  if (depth > SAMPLE_JSON_MAX_DEPTH) {
    return { ok: false, error: 'advanced JSON is nested too deeply' };
  }
  if (node === null || typeof node !== 'object') {
    return { ok: true, count: 0 };
  }
  if (Array.isArray(node)) {
    let total = 0;
    for (const item of node) {
      const r = countJsonKeys(item, depth + 1);
      if (!r.ok) return r;
      total += r.count;
    }
    return { ok: true, count: total };
  }
  let total = Object.keys(node).length;
  if (total > SAMPLE_JSON_MAX_KEYS) {
    return { ok: false, error: 'advanced JSON has too many keys' };
  }
  for (const v of Object.values(node)) {
    const r = countJsonKeys(v, depth + 1);
    if (!r.ok) return r;
    total += r.count;
    if (total > SAMPLE_JSON_MAX_KEYS) {
      return { ok: false, error: 'advanced JSON has too many keys' };
    }
  }
  return { ok: true, count: total };
}

function resolveEndpointMethod(ep, defaultMethod) {
  const d = ALLOWED_METHODS.has(defaultMethod) ? defaultMethod : 'GET';
  if (ep && typeof ep.method === 'string' && ALLOWED_METHODS.has(ep.method)) {
    return ep.method;
  }
  return d;
}

function validateEndpointExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return { ok: false, error: 'named examples required when body source is named example' };
  }
  if (examples.length > 20) {
    return { ok: false, error: 'too many named examples' };
  }
  const seen = new Set();
  for (const ex of examples) {
    if (!ex || typeof ex.name !== 'string' || !ex.name.trim()) {
      return { ok: false, error: 'each example needs a name' };
    }
    if (seen.has(ex.name)) {
      return { ok: false, error: `duplicate example name: ${ex.name}` };
    }
    seen.add(ex.name);
    if (typeof ex.body !== 'string' || ex.body.trim() === '') {
      return { ok: false, error: 'each example needs a JSON body string' };
    }
    if (ex.body.length > SAMPLE_JSON_MAX_CHARS) {
      return { ok: false, error: 'example body text is too large' };
    }
    let parsed;
    try {
      parsed = JSON.parse(ex.body);
    } catch {
      return { ok: false, error: 'invalid JSON in named example body' };
    }
    if (parsed === null || typeof parsed !== 'object') {
      return { ok: false, error: 'named example body must be a JSON object or array' };
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      return { ok: false, error: 'named example array must not be empty' };
    }
    const keyCheck = countJsonKeys(parsed, 0);
    if (!keyCheck.ok) {
      return { ok: false, error: keyCheck.error };
    }
  }
  return { ok: true };
}

/**
 * @param {unknown[]} config
 * @param {string} [defaultMethod='GET'] - Used when an endpoint omits `method` (matches UI global default).
 */
function validateEndpointsConfig(config, defaultMethod = 'GET') {
  if (!Array.isArray(config) || config.length === 0) {
    return { ok: false, error: 'endpoints must be a non-empty array' };
  }
  if (config.length > 50) {
    return { ok: false, error: 'too many endpoints' };
  }
  const dm = ALLOWED_METHODS.has(defaultMethod) ? defaultMethod : 'GET';
  const seenRoutes = new Set();
  for (const ep of config) {
    if (!ep || typeof ep.path !== 'string') {
      return { ok: false, error: 'each endpoint needs a path string' };
    }
    const routeMethod = resolveEndpointMethod(ep, dm);
    const routeKey = `${sanitizePathSegment(ep.path)}|${routeMethod}`;
    if (seenRoutes.has(routeKey)) {
      return {
        ok: false,
        error: `duplicate route for path "/${sanitizePathSegment(ep.path)}" and method ${routeMethod}`,
      };
    }
    seenRoutes.add(routeKey);

    if (ep.delayMs !== undefined && ep.delayMs !== null) {
      const d = Number(ep.delayMs);
      if (!Number.isFinite(d) || d < 0 || d > 120_000) {
        return { ok: false, error: 'delayMs must be between 0 and 120000' };
      }
    }
    if (ep.httpStatus !== undefined && ep.httpStatus !== null) {
      const s = Number(ep.httpStatus);
      if (!Number.isFinite(s) || s < 100 || s > 599) {
        return { ok: false, error: 'httpStatus must be between 100 and 599' };
      }
    }
    if (ep.activeExampleIndex !== undefined && ep.activeExampleIndex !== null) {
      const ai = Number(ep.activeExampleIndex);
      if (!Number.isFinite(ai) || ai < 0 || ai > 100) {
        return { ok: false, error: 'activeExampleIndex invalid' };
      }
    }

    const src = ep.responseSource === 'example' ? 'example' : 'generated';
    if (src === 'example') {
      const ve = validateEndpointExamples(ep.examples);
      if (!ve.ok) return ve;
      const idx = Math.min(
        ep.examples.length - 1,
        Math.max(0, Math.floor(Number(ep.activeExampleIndex ?? 0))),
      );
      if (idx < 0 || idx >= ep.examples.length) {
        return { ok: false, error: 'activeExampleIndex out of range for examples' };
      }
    }

    const mode = ep.responseMode === 'sampleJson' ? 'sampleJson' : 'schema';
    if (mode === 'sampleJson') {
      if (typeof ep.sampleJson !== 'string' || ep.sampleJson.trim() === '') {
        return { ok: false, error: 'advanced JSON mode requires non-empty JSON text' };
      }
      if (ep.sampleJson.length > SAMPLE_JSON_MAX_CHARS) {
        return { ok: false, error: 'advanced JSON text is too large' };
      }
      let parsed;
      try {
        parsed = JSON.parse(ep.sampleJson);
      } catch {
        return { ok: false, error: 'invalid JSON in advanced mode' };
      }
      if (parsed === null || typeof parsed !== 'object') {
        return { ok: false, error: 'advanced JSON must be a JSON object or array' };
      }
      if (Array.isArray(parsed) && parsed.length === 0) {
        return { ok: false, error: 'advanced JSON array must not be empty' };
      }
      const keyCheck = countJsonKeys(parsed, 0);
      if (!keyCheck.ok) {
        return { ok: false, error: keyCheck.error };
      }
    } else {
      if (!Array.isArray(ep.schema) || ep.schema.length === 0) {
        return { ok: false, error: 'each endpoint needs a non-empty schema' };
      }
      if (ep.schema.length > 100) {
        return { ok: false, error: 'schema too large' };
      }
      const seenFieldNames = new Set();
      for (const field of ep.schema) {
        if (!field || typeof field.name !== 'string' || typeof field.type !== 'string') {
          return { ok: false, error: 'schema fields need name and type' };
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
          return { ok: false, error: `invalid field name: ${field.name}` };
        }
        if (seenFieldNames.has(field.name)) {
          return { ok: false, error: `duplicate schema field name: ${field.name}` };
        }
        seenFieldNames.add(field.name);
      }
    }
  }
  return { ok: true };
}

module.exports = { countJsonKeys, validateEndpointsConfig, resolveEndpointMethod };
