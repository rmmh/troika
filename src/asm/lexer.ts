// Tokenizer for the Troika inline assembler. Source token classes cover
// TRIBBLE runs, idents, numerics, quoted text, and symbols; two internal kinds
// are emitted by macro-declaration parsing ('param' for $N, 'genid' for $$).

import { digitValue, fromTrits } from '../core/tryte';

export interface Diagnostic {
  severity: 'error' | 'warning';
  message: string;
  line: number; // 1-based
  col: number; // 1-based
}

export type TokenKind = 'tribble' | 'ident' | 'numeric' | 'string' | 'symbol' | 'param' | 'genid';

export interface Token {
  kind: TokenKind;
  text: string;
  /** Parsed value for numeric and param tokens. */
  value: number;
  line: number;
  col: number;
}

const isUpper = (c: string) => (c >= 'A' && c <= 'Z') || c === '_';
const isLower = (c: string) => c >= 'a' && c <= 'z';
const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdentCont = (c: string) => isUpper(c) || isLower(c) || isDigit(c);

/** Match textarea line endings and ignore an optional Unicode file marker. */
export function normalizeSource(src: string): string {
  return src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function lex(src: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  src = normalizeSource(src);
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let line = 1;
  let col = 1;
  let i = 0;

  const push = (kind: TokenKind, text: string, value = 0) => {
    if (kind === 'numeric' && !Number.isSafeInteger(value)) {
      diagnostics.push({ severity: 'error', message: 'numeric literal exceeds the exact integer range (-9007199254740991..9007199254740991)', line, col });
      value = 0; // Keep recovery tokens finite; callers reject error results.
    }
    tokens.push({ kind, text, value, line, col });
    col += text.length;
    i += text.length;
  };

  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') {
      line++;
      col = 1;
      i++;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      col++;
      i++;
    } else if (c === ';') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (isUpper(c)) {
      let j = i + 1;
      while (j < src.length && isUpper(src[j]!)) j++;
      push('tribble', src.slice(i, j));
    } else if (isLower(c)) {
      let j = i + 1;
      while (j < src.length && isIdentCont(src[j]!)) j++;
      push('ident', src.slice(i, j));
    } else if (c === '"') {
      const startLine = line;
      const startCol = col;
      let j = i + 1;
      let value = '';
      let terminated = false;
      while (j < src.length) {
        const ch = src[j]!;
        if (ch === '"') {
          terminated = true;
          j++;
          break;
        }
        if (ch === '\n' || ch === '\r') break;
        if (ch === '\\') {
          const esc = src[j + 1];
          if (esc === undefined || esc === '\n' || esc === '\r') break;
          const decoded = esc === 'n' ? '\n' : esc === '0' ? '\0' : esc === '"' ? '"' : esc === '\\' ? '\\' : esc;
          value += decoded;
          j += 2;
        } else {
          value += ch;
          j++;
        }
      }
      if (!terminated) {
        diagnostics.push({ severity: 'error', message: 'unterminated string literal', line: startLine, col: startCol });
        // Recover at the next line instead of interpreting the broken string's
        // contents as instructions, labels, or macro declarations.
        while (j < src.length && src[j] !== '\n' && src[j] !== '\r') j++;
        col += j - i;
        i = j;
      } else {
        tokens.push({ kind: 'string', text: value, value: 0, line, col });
        col += j - i;
        i = j;
      }
    } else if (c === '0' && src[i + 1] === 's') {
      // Balanced septemvigesimal tryte literal: 0s followed by 1-3 tribbles
      // (e.g. 0sNNN = 757). A distinct token class, so it self-delimits and
      // is insensitive to surrounding whitespace, unlike a bare tribble run.
      let j = i + 2;
      while (j < src.length && j < i + 5 && isUpper(src[j]!)) j++;
      if (j === i + 2) {
        diagnostics.push({ severity: 'error', message: 'empty 0s literal', line, col });
        col += 2;
        i += 2;
      } else {
        let v = 0;
        for (let k = i + 2; k < j; k++) v = v * 27 + digitValue(src[k]!);
        push('numeric', src.slice(i, j), v);
      }
    } else if (isDigit(c) || ((c === '-' || c === '+') && isDigit(src[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < src.length && isDigit(src[j]!)) j++;
      const text = src.slice(i, j);
      push('numeric', text, parseInt(text, 10));
    } else if (c === '#') {
      let j = i + 1;
      while (j < src.length && 'T01'.includes(src[j]!)) j++;
      if (j === i + 1) {
        diagnostics.push({ severity: 'error', message: 'empty ternary literal', line, col });
        col++;
        i++;
      } else {
        push('numeric', src.slice(i, j), fromTrits(src.slice(i + 1, j)));
      }
    } else if (':/@$'.includes(c)) {
      push('symbol', c);
    } else {
      diagnostics.push({
        severity: 'error',
        message: `unexpected character ${JSON.stringify(c)}`,
        line,
        col,
      });
      col++;
      i++;
    }
  }

  return { tokens, diagnostics };
}
