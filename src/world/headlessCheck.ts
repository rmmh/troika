/** A headless server can dedicate its 729 screen cells to the native offline
 * checker's reference window. All FAT/tree/duplicate/tail validation remains;
 * larger volumes still use multiple bounded passes. Duplicate names use a
 * transient native hash index in the same screen RAM, with exact collision checks.
 * Never use with a display or another consumer of -9841..-9113.
 * No host filesystem inspection occurs. */
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
  const start = 'fs_check_duplicates:', end = '\nfs_check:\n';
  const prefix = parts[0]!;
  if (prefix.split(start).length !== 2 || prefix.split(end).length !== 2) throw new Error('FAT duplicate checker source contract changed');
  const indexed = prefix.slice(0,prefix.indexOf(start)) + HEADLESS_DUPLICATES + prefix.slice(prefix.indexOf(end));
  return '; Headless profile: phased duplicate index / 729-cell reference window.\n' + indexed + marker + tail;
}

/** Native scratch index: at most 81 {hash,length,iterator position} records.
 * Hashes only filter candidates: equal hashes always compare complete names.
 * The reachability phase later overwrites this screen RAM; no disk writes. */
const HEADLESS_DUPLICATES = `
$fs_dup_count: -9120
$fs_dup_scan: -9119
$fs_dup_hash: -9118
$fs_dup_length: -9117
$fs_dup_position: -9116
fs_check_duplicates:
      W fs_dup_count Z
fs_dup_entry:
      C S fs_enum_next N A Z O S P E B Z J fs_duplicates_done
      R E fs_file_used W fs_dup_position E
      R I fs_slot M K I/1 W fs_dup_length K I I 2 M J fs_check_name M H Z
fs_dup_hash_name:
      R E I W J E P H 31 A H E I I 1 I J 1 I K -1 N K Z J fs_dup_hash_name
      W fs_dup_hash H W fs_dup_scan Z
fs_dup_candidate:
      R E fs_dup_scan R F fs_dup_count ifge E F J fs_dup_store end
      P E 3 M I -9841 A I E R E I R F fs_dup_hash N E F J fs_dup_advance
      M E I/1 R F fs_dup_length N E F J fs_dup_advance
      ; A hash match is only a candidate. Re-read the earlier directory slot.
      M E I/2 I E -1 W fs_file_used E C S fs_enum_next N A Z O S P E B Z J fs_corrupt
      R I fs_slot I I 2 M J fs_check_name R K fs_dup_length
fs_dup_exact:
      R E I R F J N E F J fs_dup_restore I I 1 I J 1 I K -1 N K Z J fs_dup_exact
      J fs_corrupt
fs_dup_restore:
      R E fs_dup_position W fs_file_used E
fs_dup_advance:
      R E fs_dup_scan I E 1 W fs_dup_scan E J fs_dup_candidate
fs_dup_store:
      R E fs_dup_count ifge E 81 J fs_corrupt end M F E P F 3 A F -9841
      R G fs_dup_hash W F G R G fs_dup_length M F/1 G R G fs_dup_position M F/2 G
      I E 1 W fs_dup_count E J fs_dup_entry
fs_duplicates_done:
      W fs_file_used Z W fs_enum_tag -1 M A Z O S P
`;
