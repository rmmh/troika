# Native world test diagnostics

`npm test` runs at most eight workers because each world test drives several
emulated CPUs. Guest cycle limits and individual wall-clock timeouts still apply.
GitHub Checks uses two workers to reduce contention on hosted runners. Checks
run independently on master pushes and pull requests; Pages deployment requires
a successful production build, but does not wait for the simulation/browser suite.

`npm run test:noticeboard` runs the noticeboard unit tests and all four independent
world scenarios with two workers. The world cases share only fixture code; each
creates fresh CPUs, network devices and disks, including real cold reboots from
retained server media. Splitting the cases lets Vitest schedule them on separate
workers instead of serializing all four inside one file.

Local performance measurement: the original four world cases took 106 seconds
serially. CPU hot-path changes, a cached NIC deadline and active-only disk
scheduling reduced that work to about 40 seconds. With two workers, the full
noticeboard group (including eight unit tests) finished in 23.8 seconds. Hosted
runner timings still depend on available CPU; no timeouts or assertions were
relaxed. Scheduler tests compare complete snapshots against the original
coordinator across I/O, actions and restores. Instruction fetch tests cover
self-modifying code, restored memory and changing MMIO instruction words.

A second profile of all four world cases attributed about 21% of sampled CPU
time to the coordinator itself and 11% to device ticking. Excluding indefinitely
sleeping hosts from instruction-boundary scans and retaining an ordered device
list reduced the full two-worker noticeboard run to 22.2 seconds locally.
Sleeping hosts rejoin on hardware events, queued actions and paused-world input;
snapshot restore reconstructs the scheduling index. Device-list tests preserve
attachments/replacements during callbacks and mutable device hooks. This does
not yet run machines ahead on independent local clocks.

Instruction execution now uses numeric opcode dispatch and exact bounded integer
reciprocals to extract the three fields, removing the 59,049-byte instruction
lookup table. With numeric dispatch fixed, an ABBA comparison of the two-worker
noticeboard group measured table runs of 21.21/21.63 seconds and reciprocal runs
of 20.55/21.83 seconds. The averages (21.42 vs 21.19 seconds) are within run
variation: this demonstrates no clear regression, not a proven cache speedup.
All twelve tests passed in every run.

`npm run bench:tribbles` compares interleaved, separate and packed tables against
division and reciprocal extraction, checking every one of the 19,683 valid words
before timing. It measures all three fields and opcode-only extraction with
ascending, shuffled and hot 64-word inputs; these are synthetic inputs, not guest
traces. Floating reciprocal multiplication fails exactness and is excluded.
`npm run bench:opcodes` bundles temporary CPU variants with signed or zero-based
numeric opcode switches and interleaved, packed or reciprocal extraction. It
compares complete CPU state for every instruction word in three starting states
per variant, then times three CPU programs in randomized order over nine rounds.
Neither benchmark edits the production CPU.

On Node 26.11.1 / V8 14.6 on a Ryzen 5950X, reciprocal CPU loops measured
116.20/67.65/108.20 ms with signed opcodes versus 114.35/66.41/108.66 ms with
zero-based opcodes (copy, arithmetic, stack respectively). The mixed, small
differences do not justify changing the signed opcode numbering. These local
measurements do not establish performance on the Node 20 CI runtime or browsers.
The isolated three-field extraction benchmark measured interleaved tables at
2.37/2.41/2.13 ns per word versus integer reciprocals at 2.67/2.48/2.39 ns
(ascending, shuffled, hot respectively). The small extraction-only penalty did
not produce a clear noticeboard regression, while reciprocal extraction needs
no lookup storage.

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
