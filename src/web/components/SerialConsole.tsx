import { useEffect, useRef, useState } from 'preact/hooks';
import { EmulatorController, useEmulator } from '../emulator';

export function SerialConsole({ emu }: { emu: EmulatorController }) {
  useEmulator(emu);
  const [line, setLine] = useState('');
  const outputRef = useRef<HTMLPreElement>(null);
  const visible = emu.textDevice.hasActivity();

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const send = () => {
    if (!line) {
      emu.textDevice.queueText('\n');
    } else {
      emu.textDevice.queueText(line + '\n');
    }
    setLine('');
    emu.notify();
  };

  if (!visible) return null;

  return (
    <section class="panel serial">
      <h2>
        Serial Console
        <span class={emu.textDevice.isUnlocked() ? 'lock-state unlocked' : 'lock-state'}>
          {emu.textDevice.isUnlocked() ? 'Unlocked' : 'Locked'}
        </span>
        <button
          class="mini"
          onClick={() => {
            emu.textDevice.reset();
            emu.notify();
          }}
          title="clear terminal output and pending input"
        >
          Clear
        </button>
      </h2>
      <pre ref={outputRef} class="serial-output">{emu.textDevice.outputText()}</pre>
      <div class="serial-input-row">
        <span class="serial-prompt">&gt;</span>
        <input
          value={line}
          spellcheck={false}
          onInput={(e) => setLine((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          title="type a line and press Enter to send it to _PB"
        />
        <button onClick={send}>Send</button>
      </div>
    </section>
  );
}
