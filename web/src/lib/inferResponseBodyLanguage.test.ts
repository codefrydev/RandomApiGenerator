import { describe, expect, it } from 'vitest'
import { inferResponseBodyLanguage } from './inferResponseBodyLanguage'

describe('inferResponseBodyLanguage', () => {
  it('detects JSON object and array', () => {
    expect(inferResponseBodyLanguage('{"a":1}')).toBe('json')
    expect(inferResponseBodyLanguage('[1,2]')).toBe('json')
  })

  it('treats placeholders and prose as plain', () => {
    expect(inferResponseBodyLanguage('(no content)')).toBe('plain')
    expect(inferResponseBodyLanguage('(HEAD — no body; status and size are still valid.)')).toBe('plain')
    expect(inferResponseBodyLanguage('not json')).toBe('plain')
  })
})
