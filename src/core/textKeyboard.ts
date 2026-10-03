import { encodeChar } from './textEncoding';

/** Text-display control cells, distinct from all Troika text characters. */
export const TEXT_KEYS = {
  next: 81, previous: 82, left: 83, right: 84,
  backspace: 86, delete: 87, activate: 88, up: 89, down: 90,
} as const;

/** Physical key translation only; guest firmware decides what each key does. */
export function textKeyCell(event: {
  key: string; shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean;
  metaKey?: boolean; isComposing?: boolean;
}): number | null {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return null;
  switch (event.key) {
    case 'Tab': return event.shiftKey ? TEXT_KEYS.previous : TEXT_KEYS.next;
    case 'ArrowLeft': return TEXT_KEYS.left;
    case 'ArrowRight': return TEXT_KEYS.right;
    case 'ArrowUp': return TEXT_KEYS.up;
    case 'ArrowDown': return TEXT_KEYS.down;
    case 'Backspace': return TEXT_KEYS.backspace;
    case 'Delete': return TEXT_KEYS.delete;
    case 'Enter': return TEXT_KEYS.activate;
  }
  return event.key.length === 1 && event.key >= ' ' && event.key <= '~' ? encodeChar(event.key) : null;
}
