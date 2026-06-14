# Microcorruption Translation Notes

This directory contains Troika translations of Microcorruption levels. They are
faithful ports of the puzzle shape, not MSP430 instruction-for-instruction ports.
When a verified listing is unavailable, prefer a small Troika challenge that
preserves the level's exploit class and document the assumption in the source.

For a strict source-of-truth audit against the original challenge bundle, see
[microcorruption-reference.md](./microcorruption-reference.md).

## Level Order

Canonical order provided by the project owner:

1. Tutorial
2. New Orleans
3. Sydney
4. Hanoi
5. Cusco
6. Reykjavik
7. Whitehorse
8. Montevideo
9. Johannesburg
10. Santa Cruz
11. Jakarta
12. Addis Ababa
13. Novosibirsk
14. Algiers
15. Vladivostok
16. Bangalore
17. Lagos
18. Chernobyl
19. Hollywood
20. Vancouver
21. Cold Lake
22. Churchill
23. Baku
24. St. John's
25. Halifax

Hollywood and later are pending until their puzzle mechanics are either
disassembled or reduced to a defensible Troika equivalent.

## Local Source Notes

Use `../ctf/microcorruption/levels.py` as the local payload/dump reference.
It contains solution payloads through Chernobyl, and `sim.txt` confirms unlocks
through Chernobyl. The extracted reference dumps also live under
`demos/orig/microcorruption-*.asm` after renaming the typo'd
`microcorruptiom-*.asm` files. Hollywood appears in the notes but is unresolved
there, so do not add a Troika translation until its symbolic password path is
reduced or a clean puzzle equivalent is chosen deliberately.

## Device Contract

Use the `_P*` text/lock device:

- `_PA`: status. Values greater than `3` mean RX input is available.
- `_PB`: RX data. Reads pop one encoded tryte, or `0` if empty.
- `_PC`: TX data. Writes append one encoded tryte to the serial console.
- `_PD`: control. Write `0` to clear input/output and relock.
- `_PE`: unlock. Write nonzero on success; reads `1` when unlocked.

All challenge success paths must write `_PE` and halt with `H Z Z`.

## Text And Strings

Use quoted assembler strings for readable text, terminated with `\0` in the
source, for example `"Password: \0"` or `"Access granted!\n\0"`. Strings are
one tryte per character at runtime. Lowercase is kept in the readable `__x`
row, uppercase in `_Mx`, space in `_M_`, and newline in `_N_`.

Prefer printable string literals and C-style null-terminated buffers because
the Microcorruption puzzles usually rely on C strings, stack frames, and
buffer overflows. Use raw tryte literals only for non-printable values or fixed
sentinel cells.

## Demo Pattern

Each translated level should be a standalone `.asm` demo with:

- `; title: Microcorruption NN - Name`
- no `$status` variable; use the `_PE` lock cell for success state
- quoted string literals for prompts, labels, and messages where possible
- include only the helper routines each level needs
- a known solve-path test in `test/demos.test.ts`

For overflow levels, keep the vulnerable memory layout visible in source:
`buf//N`, then the adjacent flag/token/return cell. Tests should prove the
intended exploit input reaches `_PE`.

Common serial/string helpers live under `include/`. Include the smallest set a
level needs, which avoids dead helper code in the assembled program:

  #include "include/puts.asm"
  #include "include/gets_line.asm"
  #include "include/streq.asm"

The web build expands includes before bundling demo text, so helper-only files
and `#include` lines are not shown in the frontend editor.
