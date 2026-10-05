/** Observe native browser transfer counters; never advance or synthesize progress. */
export function downloadProgress(machine: { peek(address: number): number }): { label: string; percent?: number } | undefined {
  const active = machine.peek(2532), state = machine.peek(2504), mode = machine.peek(2511);
  // These addresses are reused by other applications. Only the active browser
  // owns this protocol state, and failed/completed transfers must disappear.
  if (active !== 1 || state < 1 || state > 3 || mode < 1 || mode > 3) return;
  const software = mode === 3;
  if (state < 3 || machine.peek(6221) !== 1 || machine.peek(6225) !== 200)
    return { label: software ? 'Connecting to software server' : 'Connecting to file server' };
  const total = machine.peek(6216), received = machine.peek(6217);
  if (total < 0 || received < 0) return { label: 'Waiting for download' };
  const percent = total === 0 ? 100 : Math.min(100, Math.floor(received * 100 / total));
  return { label: percent === 100 ? (software ? 'Saving and starting software' : 'Saving file') : (software ? 'Downloading software' : 'Downloading file'), percent };
}
