import { useEffect, useMemo, useState } from 'preact/hooks';
import { EmulatorController } from '../emulator';
import { assemble, type AssembleResult } from '../../asm/assemble';
import { toTribbles } from '../../core/tryte';

const DEMO = `; Troika demo: tryte-string length.
; The assembler's macro stdlib (ife/ifn/ifl/ifg, else, end)
; expands to complement predicates and generated labels.

$msg: 200          ; address constant

      M A msg      ; A = pointer to the string
      M B A        ; B = start
loop: R C A        ; C = *A
      ifn C Z      ; while C != 0
        I A 1
        J loop
      end
      S A B        ; A = length in trytes
      H Z Z        ; sleep forever (debugger pauses)

@200
TEST_STRING_ 0     ; 4 trytes of data + terminator
`;

export function EditorPanel({ emu }: { emu: EmulatorController }) {
  const [src, setSrc] = useState(DEMO);
  const [debounced, setDebounced] = useState(DEMO);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(src), 200);
    return () => clearTimeout(t);
  }, [src]);

  const result: AssembleResult = useMemo(() => assemble(debounced), [debounced]);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  const emitted = result.chunks.reduce((n, c) => n + c.data.length, 0);

  return (
    <section class="panel editor">
      <h2>
        Assembler
        <button
          class="primary load"
          disabled={errors.length > 0}
          onClick={() => emu.load(result)}
          title="write the program into memory and point PC at it"
        >
          ⬇ Load
        </button>
      </h2>
      <textarea
        spellcheck={false}
        value={src}
        onInput={(e) => setSrc((e.target as HTMLTextAreaElement).value)}
      />
      <div class="asm-status">
        {errors.length === 0 ? (
          <span class="ok">
            ✓ {emitted} trytes in {result.chunks.length} chunk{result.chunks.length === 1 ? '' : 's'}
            {result.chunks.map((c) => ` · ${toTribbles(c.addr)}+${c.data.length}`)}
          </span>
        ) : null}
        <ul class="diagnostics">
          {result.diagnostics.map((d, i) => (
            <li key={i} class={d.severity}>
              {d.line}:{d.col} {d.severity}: {d.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
