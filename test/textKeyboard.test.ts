import { expect, test } from 'vitest';
import { textKeyCell, TEXT_KEYS } from '../src/core/textKeyboard';
import { encodeChar } from '../src/core/textEncoding';

test('physical text keys preserve every printable ASCII cell and case', () => {
  for (let code = 32; code <= 126; code++) {
    const key = String.fromCharCode(code); expect(textKeyCell({ key })).toBe(encodeChar(key));
  }
});
test('navigation controls are outside the printable encoding and support reverse Tab', () => {
  for (const [key, cell] of Object.entries({ Tab: TEXT_KEYS.next, ArrowLeft: TEXT_KEYS.left, ArrowRight: TEXT_KEYS.right,
    ArrowUp: TEXT_KEYS.up, ArrowDown: TEXT_KEYS.down, Backspace: TEXT_KEYS.backspace, Delete: TEXT_KEYS.delete, Enter: TEXT_KEYS.activate })) {
    expect(textKeyCell({ key })).toBe(cell); expect(cell).toBeGreaterThan(57);
  }
  expect(textKeyCell({ key: 'Tab', shiftKey: true })).toBe(TEXT_KEYS.previous);
});
test('text input leaves shortcuts, composition and unsupported keys to the host', () => {
  for (const modifier of ['ctrlKey','altKey','metaKey','isComposing']) expect(textKeyCell({ key: 'a', [modifier]: true })).toBeNull();
  for (const key of ['Escape','F1','Dead','é','😀']) expect(textKeyCell({ key })).toBeNull();
});
