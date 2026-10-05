/** A headless server can dedicate its 729 screen cells to the native offline
 * checker's reference window: nine 0/1 trits per cell cover 6561 blocks.
 * All FAT/tree/duplicate/tail validation remains;
 * larger volumes still use multiple bounded passes. Duplicate names use a
 * transient native hash index in the same screen RAM, with exact collision checks.
 * Never use with a display or another consumer of -9841..-9113.
 * No host filesystem inspection occurs. */
export function headlessFatCheck(source: string): string {
  const marker = 'fs_check_reachability:';
  const parts = source.split(marker);
  if (parts.length !== 2) throw new Error('FAT checker source contract changed');
  let tail = parts[1]!;
  const replace = (before: string, after: string) => {
    if (tail.split(before).length !== 2) throw new Error(`FAT checker source contract changed: ${before}`);
    tail = tail.replace(before, after);
  };
  replace(`      M E fs_check_name
      M F 18
fs_check_clear:
      W E Z
      I E 1
      I F -1
      N F Z J fs_check_clear`, `      M E -9841 M F 729 K E F`);
  replace(`        ifl E 18
          A E fs_check_name
          R F E
          ifn F Z
            M A -11
            J fs_check_scan_error
          end
          W E 1
        end`, `        ifl E 6561
          C S fs_check_mark
          ifn E Z
            M A -11
            J fs_check_scan_error
          end
          R E F A E G W F E
        end`);
  replace(`      R E fs_check_target
      M F J
      S F E
      A F fs_check_name
      R E F`, `      M E J R F fs_check_target S E F C S fs_check_mark`);
  replace('L G 18', 'L G 6561');
  tail += PACKED_REFERENCES;
  const start = 'fs_check_duplicates:', end = '\nfs_check:\n';
  const prefix = parts[0]!;
  if (prefix.split(start).length !== 2 || prefix.split(end).length !== 2) throw new Error('FAT duplicate checker source contract changed');
  let indexed = prefix.slice(0,prefix.indexOf(start)) + HEADLESS_DUPLICATES + prefix.slice(prefix.indexOf(end));
  // The hash index occupies the first 243 screen cells; tail reads use the
  // next 243, leaving directory and FAT caches intact. Reachability later
  // overwrites both scratch areas. Full-block files have no padding to read.
  const tailRead = `          R C fs_chain_block
          M D fs_buffer
          C S fs_read_block
          N A Z O S P
          W fs_enum_tag -1
          R K fs_found_used
          M J fs_buffer`;
  if (indexed.split(tailRead).length !== 2) throw new Error('FAT tail checker source contract changed');
  indexed = indexed.replace(tailRead, `          R K fs_found_used E K 243 J fs_check_tree
          R C fs_chain_block
          M D -9598
          C S fs_read_block
          N A Z O S P
          R K fs_found_used
          M J -9598`);
  return '; Headless profile: phased duplicate index / 729-cell packed reference window.\n' + indexed + marker + tail;
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

/** E=window-relative block (0..6560); returns F=word address, G=one-trit
 * mask and E=existing mark. A (chain cursor) and J (physical FAT target) survive.
 * Q rounds to nearest; subtracting four makes division by nine floor for every
 * nonnegative offset, including zero. Nine set trits sum to 9841 without wrap.
 */
const PACKED_REFERENCES = `
fs_check_mark:
      M F E I F -4 Q F 9
      M G F P G 9 S E G
      M G @fs_check_powers A G E R G G
      A F -9841 R E F B E G O S P
fs_check_powers: 1 3 9 27 81 243 729 2187 6561
`;
