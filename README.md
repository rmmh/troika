# Troika

A fun-sized **balanced ternary** fantasy computer: 9-trit trytes
(-9841..9841), 3⁹ = 19,683 trytes of memory, registers stored *in* memory,
and human-readable machine code (`AXY` means `X = X + Y`).

This repo contains the spec plus a complete TypeScript implementation:

| Piece | Where |
|---|---|
| CPU spec | `spec.txt` |
| Assembler spec | `assembler.txt` |
| Emulator core (cycle-accurate, full ISA) | `src/core/` |
| Assembler (macros, control flow, relaxation) | `src/asm/` |
| Terminal REPL | `src/cli/repl.ts` |
| Web debugger (Preact) | `src/web/` |
| Tests (vitest) | `test/` |
| Python 2 reference implementation (partial, historical) | `sim.py`, `sim_test.py` |

## Quick start

```sh
npm install
npm test          # full test suite
npm run dev       # web debugger at http://localhost:8000 (esbuild serve)
npm run repl      # interactive assembler in the terminal
npm run build     # bundle into dist/
npm run typecheck
```

## Web debugger

Type assembly in the editor (it re-assembles as you type), hit **Load**, then
**Run**/**Step**. The canvas shows all 19,683 trytes of memory (white = PC,
cyan = S, red = breakpoints); click any cell to inspect or edit it. Click
disassembly rows to toggle breakpoints. The speed slider runs from single
cycles up past the native 3¹² Hz clock.

## REPL

```
troika> M A 83
_AA: MA_ _PO
troika> A A B
_AC: AAB
troika> .step 2
PC=_AD (-361)  +3 cycles
troika> .regs
```

`.help` lists the commands (`.step`, `.run`, `.regs`, `.mem`, `.dis`,
`.org`, `.reset`).

## Assembly cheat sheet

```asm
$msg: 200          ; constant (0-ary macro)

      M A msg      ; immediate: M A _ [200]
      M B A        ; registers
loop: R C A        ; C = *A
      ifn C Z      ; stdlib control flow (complement predicate + label)
        I A 1
        J loop     ; short relative or long MP_ form, chosen automatically
      end
      S A B
      H Z Z        ; sleep forever

@200               ; origin directive
TEST_STRING_ 0     ; verbatim tribbles and bare numerics emit data
buf//27            ; reserve uninitialized space
```

Operand inflection: a bare tribble is a register, a number is an immediate,
a lowercase ident is a memory reference (label), and `B/3` is
register-plus-offset. Three or more consecutive tribbles (`MA_`) bypass the
sugar and emit verbatim machine code.

Parameterized macros:

```asm
$mod/2: MX $1 QX $2 PX $2 S $1 X end
mod A B            ; A = A mod B (balanced)
```
