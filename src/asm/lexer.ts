// Tokenizer for the Troika inline assembler. Four source token classes
// (TRIBBLE runs, idents, numerics, symbols) plus two internal kinds emitted
// by macro-declaration parsing ('param' for $N, 'genid' for $$).

import { fromTrits } from '../core/tryte';

export interface Diagnostic {
  severity: 'error' | 'warning';
  message: string;
  line: number; // 1-based
  col: number; // 1-based
}

export type TokenKind = 'tribble' | 'ident' | 'numeric' | 'symbol' | 'param' | 'genid';

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

export function lex(src: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let line = 1;
  let col = 1;
  let i = 0;

  const push = (kind: TokenKind, text: string, value = 0) => {
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
