/** Positive division. Wrapping in the intermediate product cancels in the
 * remainder, including 9841 / 2. Preserves D and G..L. */
export const POSITIVE_DIVISION = `
app_div:
 M C A M E A Q E B M F E P F B S C F
 ifl C Z I E -1 A C B end M A E O S P
`;

/** Binary XOR of two 0..4095 integers, evaluated by guest arithmetic. */
export const BINARY_XOR = `
app_xor:
 M G A M H B M K 1 M L Z M I 12 M B 2
app_xor_bit:
 M A G C S app_div M G A M J C
 M A H C S app_div M H A
 ifn J C A L K end P K 2 I I -1 N I Z J app_xor_bit
 M A L O S P
${POSITIVE_DIVISION}`;
