import { encodeText } from '../core/textEncoding';
const counted = (s: string) => `${s.length}:${s}`;
// Harmless guest payload: on load, replace the marker with the submitted source.
export const XSS_LAB_SAMPLE = ': LOAD 0 FIELD@ 1 TEXT! ;';
export function xssPreviewPage(unsafe: boolean): number[] {
  const title = unsafe ? 'Unsafe template' : 'Literal template';
  const route = unsafe ? '/app/xunsafe' : '/app/xsafe';
  return encodeText(`PAGE 1\nH ${counted(title)}\nT 54:${'unchanged'.padEnd(54)}\nF ${counted(route)}\nI 3:src ${counted(XSS_LAB_SAMPLE)}\nS 7:Preview\nL 9:Lab index 7:/xsslab\n`);
}
export function xssLabPage(): number[] {
  const lines = [
    ['H', 'Template lab'], ['T', 'Compare code and text.'],
    ['T', 'Unsafe runs submitted Forth.'], ['T', 'Literal keeps it as text.'],
    ['T', 'Preview the supplied sample.'], ['T', 'Watch the unchanged marker.'],
  ].map(([type, text]) => `${type} ${counted(text!)}`);
  return encodeText(`PAGE 1\n${lines.join('\n')}\nL 15:Unsafe template 6:/xedit\nL 16:Literal template 6:/xsafe\nL 12:Saved unsafe 8:/xunsafe\nL 10:Read notes 9:/xssnotes\nL 4:Home 6:/index\n`);
}
export const XSS_LAB_NOTES = `Template lab

The two fixtures accept the same src field. Preview stores a page on the BBS disk. The unsafe template writes submitted text into a C record. The literal template writes it into a counted T record. Both preserve the field as literal input text.

The supplied sample defines LOAD. In the unsafe page, the browser compiles it and LOAD copies the field into the marker. In the literal page, the marker stays unchanged and the sample appears as text. Merely counting a string does not make it safe when its record type explicitly means executable source.

This is an intentional stored-XSS analogue inside the fictional Troika browser, not JavaScript in the host browser. The native compiler, memory bounds and handler instruction budget still apply. The sample only changes guest page text. Bad source or an over-budget handler can fail the page; F1 returns home. The lab index always opens a clean unsafe editor, so a broken saved preview can be replaced. There is no host eval, DOM access or host credential access.

Each mode has one public preview slot; another visitor can replace it. The preview survives a server-disk cold boot. Normal forum replies and shared uploads never use this template. Use literal records for untrusted content; the flawed fixture exists only for this demonstration.
`;
