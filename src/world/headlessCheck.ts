/** A headless server can dedicate its 729 screen cells to the native offline
 * checker's reference window. All FAT/tree/duplicate/tail validation remains;
 * larger volumes still use multiple bounded passes. Never use with a display
 * or another consumer of -9841..-9113. No host filesystem inspection occurs. */
export function headlessFatCheck(source: string): string {
  const marker = 'fs_check_reachability:';
  const parts = source.split(marker);
  if (parts.length !== 2) throw new Error('FAT checker source contract changed');
  let tail = parts[1]!;
  for (const [before, after, count] of [
    ['M E fs_check_name', 'M E -9841', 1],
    ['A E fs_check_name', 'A E -9841', 1],
    ['A F fs_check_name', 'A F -9841', 1],
    ['M F 18', 'M F 729', 1],
    ['ifl E 18', 'ifl E 729', 1],
    ['L G 18', 'L G 729', 1],
  ] as const) {
    if (tail.split(before).length !== count + 1) throw new Error(`FAT checker source contract changed: ${before}`);
    tail = tail.replaceAll(before, after);
  }
  return '; Headless profile: reference window uses all 729 screen cells.\n' + parts[0] + marker + tail;
}
