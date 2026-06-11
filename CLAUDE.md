# CLAUDE.md

Troika is a balanced-ternary fantasy CPU: 9-trit trytes valued -9841..9841,
3^9 = 19,683 trytes of memory, machine state stored in memory, human-readable
tribble machine code. `spec.txt` (CPU) and `assembler.txt` (assembler) are the
source of truth; the TypeScript implementation in `src/` is canonical.
`sim.py`/`sim_test.py` are the old partial Python 2 reference — historical,
don't extend them.

## Commands

```sh
npm test                 # vitest, full suite
npx vitest run test/asm.test.ts   # one file
npm run typecheck        # tsc --noEmit (esbuild does the emitting)
npm run dev              # web debugger, esbuild serve + watch
npm run repl             # terminal interactive assembler
npm run build            # bundle web app into dist/
```

## Layout

- `src/core/` — platform-agnostic emulator: `tryte.ts` (conversions, trit ops),
  `decode.ts` (instruction shapes + `instructionLength`), `machine.ts`
  (`Machine.step/run`, traps, sleep, MMIO), `disasm.ts`, `devices.ts`
- `src/asm/` — platform-agnostic assembler: `lexer.ts` → `macros.ts`
  (TokenStream, expansion, `$$`/ID stack) → `assemble.ts` (parser, encoder,
  jump relaxation, `Session` for incremental use), `stdlib.ts` (ife/else/end)
- `src/cli/repl.ts` — Node readline REPL over `Session` + `Machine`
- `src/web/` — Preact debugger; `emulator.ts` is the non-Preact controller
  (rAF loop, breakpoints, subscribe/version store), components read the
  mutable `Machine` directly and re-render via `useEmulator`
- `test/` — `machine.test.ts` is the conformance corpus ported from
  `sim_test.py`; its `runTest` harness (load at `_AA`, P=`_AA`, S=`_ZZ`,
  inputs into registers A.., strings into memory with pointer in register)
  is exported and reused by `opcodes.test.ts`

## Core invariants

- Trytes are plain `number`s; memory is `Int16Array(19683)`, index =
  addr + 9841. Always wrap arithmetic with `norm()` (JS `%` is signed — the
  double-mod in `norm` is required). No Tryte class; keep the hot loop
  allocation-free.
- `DIGITS = 'ABCDEFGHIJKLM_NOPQRSTUVWXYZ'` (A=-13, `_`=0, Z=+13). Registers
  live at memory addresses -13..13: P (PC) = +3, S = +6, Z = +13. Z reads 0
  but writes land in backing RAM. Register access costs 0 cycles.
- Operand decode resolves each slot exactly once to a "place": register
  address, memory address (`M`/`O` modes consume one operand tryte), or
  immediate (`IMM_TAG + value`; writes discarded — a hardware-valid NOP).
  sim.py double-reads memory-mode destinations; do not copy that behavior.
- Predicates (G/L/E/N) skip the ENTIRE following instruction when false
  (`instructionLength`, 1 cycle per skipped tryte) — newer spec.txt behavior,
  not sim.py's skip-one-tryte.
- Cycle model: 1 cycle per memory access outside the register band (fetches
  always charge 1), +8 for Q. The timing chart in spec.txt is derived from
  this, asserted row-by-row in `test/timing.test.ts`.
- Instruction lengths: op `_` (NOP), `J`, `D` are always 1 tryte; `V`/`I`/`F`
  take a literal tribble (no second operand tryte); `T` appends a truth-table
  tryte. `decode.ts` is the single source for lengths — executor,
  predicate-skip, and disassembler all share it.
- Traps/interrupts: vectors `_OA` (div0, 41), `_OB`..`_OJ` (lines 0-8),
  return PC saved to `_OZ` (67); no implicit stack. H mask trit 0 → handler
  returns to the H itself (re-sleeps); trit 1 → returns past it (wakes);
  T → ignored. Mask trit 0 is the most significant (matches T-table order).
- Q rounds to nearest, ties toward zero. F: ±1..±8 shift, +9..+13 rotl 1..5,
  -9..-12 rotr 1..4, A(-13) = abs. D copies one tryte per execution; `_`
  operand = register at address 0, not incremented.

## Assembler notes

- Pipeline: lexer → `TokenStream` (macros expand as tokens are pulled;
  outward-in; meta-tokens evaluated eagerly at expansion in body order) →
  statement parser → layout with monotone short→long jump relaxation →
  fixups. Diagnostics accumulate; assembly never throws mid-stream.
- Tribble runs of length ≥3 are verbatim machine code; length 1-2 start a
  mnemonic (`MA 5` = opcode M, operand A from the run). Operand inflection:
  tribble = register, numeric = immediate, lowercase ident = memory label,
  `B/3` = offset mode. `M`/`O`/`_` are addressing modes, rejected as register
  operands (except in D and class-2 literal slots).
- Small-literal compression: `M a n` → `V a n`, `A a n` → `I a n` for
  |n| ≤ 13 — remember this when writing test expectations (use literals > 13
  to see the uncompressed form).
- Control-flow stdlib emits COMPLEMENT predicates (ife → N) with one
  `if_false_N` label family; the walkthrough lives in assembler.txt §6.
- `Session` (REPL/editor) re-assembles the full accumulated source per line
  with `allowPending: true` and diffs trytes; error lines are not committed.

## Conventions

- ESM throughout (`"type": "module"`); strict TS with
  `noUncheckedIndexedAccess` (hence the `!` on indexed reads of known-shape
  data). `src/core` and `src/asm` must stay free of DOM/Node imports.
- Tests build expectations with `fromTribbles('MA_')` / `fromTrits('T01...')`
  rather than raw numbers.
- When emulator behavior and a spec file disagree, fix one of them in the
  same change and note it — the specs have known errata history (see git log
  for spec.txt / assembler.txt).
