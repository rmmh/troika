// Macro engine: a token stream that expands macro invocations as tokens are
// pulled. Expansion is outward-in: arguments are substituted un-expanded and
// the spliced body is re-examined at the head of the stream, so nested
// invocations expand when they are reached.
//
// Meta-tokens (evaluated at expansion time, in body order):
//   $$        the expansion instance's unique ID (same value throughout a body)
//   push_id   push the instance ID onto the compile-time ID stack
//   peek_id   read the top of the ID stack (usable as an ident suffix)
//   pop_id    read and remove the top of the ID stack (usable as a suffix)

import type { Diagnostic, Token } from './lexer';

export interface Macro {
  name: string;
  arity: number;
  body: Token[];
}

const MAX_EXPANSIONS = 10000;
const META = /^(.*?)(push_id|peek_id|pop_id)$/;

export class TokenStream {
  private pos = 0;
  private idCounter = 0;
  private idStack: number[] = [];
  private expansions = 0;
  readonly macros = new Map<string, Macro>();

  constructor(
    private buf: Token[],
    private diagnostics: Diagnostic[],
  ) {}

  private diag(tok: Token, severity: 'error' | 'warning', message: string): void {
    this.diagnostics.push({ severity, message, line: tok.line, col: tok.col });
  }

  peekRaw(ahead = 0): Token | undefined {
    return this.buf[this.pos + ahead];
  }

  nextRaw(): Token | undefined {
    return this.buf[this.pos++];
  }

  /** Next token, expanding macro invocations. */
  next(): Token | undefined {
    for (;;) {
      const t = this.buf[this.pos];
      if (!t) return undefined;
      if (t.kind === 'ident') {
        const m = this.macros.get(t.text);
        if (m && this.expansions < MAX_EXPANSIONS) {
          this.pos++;
          this.expand(m, t);
          continue;
        }
      }
      this.pos++;
      return t;
    }
  }

  /** Parse a macro declaration; the leading '$' token has been consumed. */
  parseDeclaration(dollar: Token): void {
    const name = this.nextRaw();
    if (name?.kind !== 'ident') {
      this.diag(dollar, 'error', 'expected lowercase macro name after $');
      return;
    }
    let arity = -1; // -1: constant form ($name: token)
    let t = this.nextRaw();
    if (t?.kind === 'symbol' && t.text === '/') {
      const n = this.nextRaw();
      if (n?.kind !== 'numeric' || n.value < 0) {
        this.diag(name, 'error', 'expected non-negative arity after /');
        return;
      }
      arity = n.value;
      t = this.nextRaw();
    }
    if (!(t?.kind === 'symbol' && t.text === ':')) {
      this.diag(name, 'error', "expected ':' in macro declaration");
      return;
    }

    const body: Token[] = [];
    if (arity === -1) {
      const b = this.nextRaw();
      if (!b) this.diag(name, 'error', 'missing constant value');
      else body.push(b);
      arity = 0;
    } else {
      for (;;) {
        const b = this.nextRaw();
        if (!b) {
          this.diag(name, 'error', `macro '${name.text}' not terminated with 'end'`);
          break;
        }
        if (b.kind === 'ident' && b.text === 'end') break;
        if (b.kind === 'symbol' && b.text === '$') {
          const nx = this.peekRaw();
          if (nx?.kind === 'numeric') {
            this.nextRaw();
            body.push({ kind: 'param', text: '$' + nx.text, value: nx.value, line: b.line, col: b.col });
          } else if (nx?.kind === 'symbol' && nx.text === '$') {
            this.nextRaw();
            body.push({ kind: 'genid', text: '$$', value: 0, line: b.line, col: b.col });
          } else {
            this.diag(b, 'error', 'expected $N parameter or $$ in macro body');
          }
          continue;
        }
        body.push(b);
      }
    }

    if (this.macros.has(name.text)) this.diag(name, 'warning', `macro '${name.text}' redefined`);
    this.macros.set(name.text, { name: name.text, arity, body });
  }

  private expand(m: Macro, inv: Token): void {
    if (++this.expansions >= MAX_EXPANSIONS) {
      this.diag(inv, 'error', 'macro expansion limit exceeded');
      return;
    }
    const args: Token[] = [];
    for (let i = 0; i < m.arity; i++) {
      const a = this.nextRaw();
      if (!a) {
        this.diag(inv, 'error', `macro '${m.name}' expects ${m.arity} argument(s)`);
        return;
      }
      args.push(a);
    }

    const id = ++this.idCounter;
    const out: Token[] = [];
    for (const bt of m.body) {
      if (bt.kind === 'param') {
        if (bt.value < 1 || bt.value > args.length) {
          this.diag(inv, 'error', `$${bt.value} out of range in macro '${m.name}'`);
        } else {
          out.push(args[bt.value - 1]!);
        }
      } else if (bt.kind === 'genid') {
        const prev = out[out.length - 1];
        if (prev?.kind === 'ident') {
          out[out.length - 1] = { ...prev, text: prev.text + id };
        } else {
          out.push({ kind: 'numeric', text: String(id), value: id, line: inv.line, col: inv.col });
        }
      } else if (bt.kind === 'ident' && META.test(bt.text)) {
        const [, prefix, op] = META.exec(bt.text)!;
        if (op === 'push_id') {
          if (prefix) this.diag(inv, 'error', `'${bt.text}': push_id cannot take a prefix`);
          else this.idStack.push(id);
        } else {
          const val = op === 'pop_id' ? this.idStack.pop() : this.idStack[this.idStack.length - 1];
          if (val === undefined) {
            this.diag(inv, 'error', `${op} with empty ID stack (unbalanced if/else/end?)`);
          } else if (prefix) {
            out.push({ kind: 'ident', text: prefix + val, value: 0, line: inv.line, col: inv.col });
          } else {
            out.push({ kind: 'numeric', text: String(val), value: val, line: inv.line, col: inv.col });
          }
        }
      } else {
        // Body tokens report the invocation site in diagnostics.
        out.push({ ...bt, line: inv.line, col: inv.col });
      }
    }
    this.buf.splice(this.pos, 0, ...out);
  }
}
