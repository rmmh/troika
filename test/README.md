# Native world test diagnostics

`npm test` runs at most eight workers because each world test drives several
emulated CPUs. Guest cycle limits and individual wall-clock timeouts still apply.

Every test that creates a `World` through `addMachine` and drives `runCycles`
gets a diagnostic journal in `test-results/world-diagnostics/`. Filenames include
the worker PID and test ID; the JSON includes the test name. Failures print the
absolute report path. These ignored artifacts remain available after worker
termination. Successful tests mark their report `test passed`.

Reports contain recent samples of simulated cycles, CPU PCs and disassembly,
registers and stack pointers, sleep state, next network event, pending disk completion time,
selected native protocol/FS/browser state cells, and the client screen. The
state-cell interpretation assumes the native firmware layout; arbitrary guest
programs may use those cells differently. Call stacks identify the test's wait
loop. `worldTestStage(label)` adds a more useful action label.

A synchronous guard checks the wall-clock budget between simulation chunks and
throws with a report just before Vitest's timeout. This works while the event
loop is busy. Samples are also written before and after a chunk about once per
second, with atomic file replacement and eight samples retained. If a host-side
bug never returns from a chunk, the last `entering simulation chunk` report
survives. This does not interrupt an infinite loop inside the emulator; a parent
runner or manual termination is still needed. Direct `advanceTo` calls and
single-machine tests are not covered by this world wrapper.

To investigate a timeout, compare the last samples and action:

- Advancing world cycles alone do not prove useful guest progress.
- A stable PC may be an ordinary poll loop; inspect stream state, filesystem
  handles, pending hardware events, the action being awaited, and disassembly.
- An infinite sleep with no pending event may explain why an awaited condition
  cannot become true.
- A stale entering-chunk report can indicate a host-side wedge, but a slow chunk
  or external process termination can produce the same last observation.

Rerun the named test with `npm test -- test/name.test.ts` to compare behavior
without full-suite contention. Do not raise a timeout solely because it expired.
`worldDiagnostics.test.ts` verifies reports using guest jump/halt loops and a
separate host process containing an intentional infinite loop; its parent kills
that process after one second and checks the surviving journal.

Browser screenshots and retained failure traces live separately in
`test-results/ui/`, so starting Playwright does not erase native timeout journals.
