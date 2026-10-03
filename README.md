# Troika

A fun-sized **balanced ternary** fantasy computer: 9-trit trytes
(-9841..9841), 3⁹ = 19,683 trytes of memory, registers stored *in* memory,
and human-readable machine code (`AXY` means `X = X + Y`).

This repo contains the spec plus a complete TypeScript implementation:

| Piece | Where |
|---|---|
| CPU spec | `spec.txt` |
| Assembler spec | `assembler.txt` |
| Display and audio references | `display.txt`, `sound.txt` |
| Emulator core (cycle-accurate, full ISA) | `src/core/` |
| Assembler (macros, control flow, relaxation) | `src/asm/` |
| Terminal REPL | `src/cli/repl.ts` |
| Web debugger (Preact) | `src/web/` |
| Unit/integration tests (Vitest) | `test/` |
| Browser tests (Playwright) | `test/ui/` |

## Quick start

```sh
npm ci
npm test          # unit and integration tests
npm run dev       # web debugger at http://localhost:8000 (esbuild serve)
npm run repl      # interactive assembler in the terminal
npm run build     # bundle into dist/
npm run typecheck
npm run bench     # local assembler, CPU, APU, and renderer benchmarks
```

For browser regressions, install Chromium once with
`npx playwright install chromium`, then run `npm run test:ui`. Pull requests
run typecheck, both test suites, and the production build; Pages deployment
waits for those checks.

The development server watches source, HTML, CSS, demo additions, and assembly
includes. Set `PORT=8080 npm run dev` to use another port.

## Web debugger

Type assembly in the editor, which assembles as you type, then choose **Load**
and **Run** or **Step**. **Open** imports an assembly file and **Save** downloads
the current source. **Changes not loaded** marks edits awaiting Load; **Reset**
restores the last loaded program, device state, and cycle count.

The canvas shows all 19,683 trytes of memory (white = PC, cyan = S, red =
breakpoints). Click a cell or register to inspect it. The **Memory address**
field accepts decimal addresses, tribbles (`_AA`), register names (`A`), and
loaded labels with offsets (`loop+2`). Addresses wrap around the CPU's memory
space. **Go** selects a cell; **Set PC here** changes the execution address.
The inspector accepts decimal values, tribbles, or trits prefixed with `#`.

Toggle breakpoints using source line numbers or disassembly rows. Register
buttons and breakpoint markers also support keyboard activation. **Profile**
records cycles by instruction address and displays source-line totals; click
the metrics to switch between cycles and percentages. Profile data is shown
for the loaded source and cleared by Load or Reset.

The speed slider runs from single cycles per second past the native 3¹² Hz
clock; **1×** restores native speed. Memory-panel tabs contain the CPU,
assembler, display, and sound references. The serial console appears when a
program uses it; Enter or **Send** queues a line, and scrolling up keeps older
output in view until you return to the bottom.

Drag pane dividers to resize them, or focus one and use Left/Right (Shift for
larger steps). Home selects the minimum width; double-click restores the
default.

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

`.help` lists the commands, including `.until`, `.break`, `.trace`, `.watch`,
and `.screenshot`. Addresses accept the same register, tribble, decimal, and
label-offset forms as the web debugger. See [repl.txt](repl.txt) for command
syntax and examples.

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
      H 0sAAA Z    ; sleep forever with every interrupt masked

@200               ; origin directive
TEST_STRING_ 0     ; verbatim tribbles and bare numerics emit data
buf//27            ; reserve uninitialized space
```

Operand inflection: a bare tribble is a register, a number is an immediate,
a lowercase ident is a memory reference (label), and `B/3` is
register-plus-offset. At statement start, three or more consecutive tribbles
(`MA_`) emit verbatim machine code. In operand position, a three-tribble value
is an immediate tryte literal.

Parameterized macros:

```asm
$mod/2: MX $1 QX $2 PX $2 S $1 X end
mod A B            ; A = A mod B (balanced)
```
