import { expect, test } from 'vitest'
import { gmActionFor } from '#lib/shared/gm-keys'
const k = (code: string, mods: Partial<KeyboardEvent> = {}) =>
  ({ code, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...mods })
test('Alt+Shift+N advances', () => expect(gmActionFor(k('KeyN', { altKey: true, shiftKey: true }))).toBe('advance'))
test('Alt+Shift+R resets', () => expect(gmActionFor(k('KeyR', { altKey: true, shiftKey: true }))).toBe('reset'))
test('plain N is not a GM key', () => expect(gmActionFor(k('KeyN'))).toBeNull())
test('Shift+N is not a GM key', () => expect(gmActionFor(k('KeyN', { shiftKey: true }))).toBeNull())
test('Alt+Shift+S is left for light', () => expect(gmActionFor(k('KeyS', { altKey: true, shiftKey: true }))).toBeNull())
test('Ctrl/Meta added is not a GM key', () =>
  expect(gmActionFor(k('KeyN', { altKey: true, shiftKey: true, metaKey: true }))).toBeNull())
