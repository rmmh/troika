import { encodeText } from '../core/textEncoding';

const counted = (text: string) => `${text.length}:${text}`;
const cells = ['line', ...Array.from({ length: 14 }, (_, i) => `o${i + 1}`)];
const initialize = encodeText('Pile: 21 Bot: 0').map((value, i) => `${value} ${cells[i]} !`).join(' ');
const [playing, invalid, won, lost] = encodeText('.?WL');

// These are static disk bytes. The native Forth VM owns every move, display
// update and outcome; the host neither evaluates a move nor supplies a score.
export const TAKEAWAY_GAME_SOURCE = `
${cells.map(name => `VARIABLE ${name}`).join(' ')}
VARIABLE mark VARIABLE pile VARIABLE done
: show pile @ 10 /MOD 28 + o6 ! 28 + o7 ! line 15 1 TEXT! mark 1 2 TEXT! ;
: bad ${invalid} mark ! show ;
: finish done ! mark ! show ;
: LOAD ${initialize} 21 pile ! 0 done ! ${playing} mark ! show ;
: SUBMIT done @ IF show EXIT THEN
  0 FIELD@ 1 = IF @ 28 - ELSE DROP bad EXIT THEN
  DUP 1 < IF DROP bad EXIT THEN DUP 3 > IF DROP bad EXIT THEN
  DUP pile @ > IF DROP bad EXIT THEN
  pile @ SWAP - pile !
  pile @ 0 = IF ${won} 1 finish EXIT THEN
  pile @ 4 /MOD DROP DUP 0 = IF DROP 1 THEN
  DUP 28 + o14 ! pile @ SWAP - pile !
  pile @ 0 = IF ${lost} 1 finish ELSE ${playing} 0 finish THEN ;
`.trim();

export function takeawayGamePage(): number[] {
  return encodeText(`PAGE 1\n${[
    `H ${counted('Takeaway')}`,
    `T ${counted('Pile: 21 Bot: 0')}`,
    `T ${counted('.')}`,
    `T ${counted('Take 1-3. Last stone wins.')}`,
    `T ${counted('W win, L lose, ? invalid.')}`,
    `T ${counted('Bot shows its last move.')}`,
    'F 9:/app/take', 'I 4:take 0:', 'S 4:Take',
    'L 7:Restart 5:/take', 'L 5:Rules 10:/takerules', 'L 4:Home 6:/index',
    `C ${counted(TAKEAWAY_GAME_SOURCE)}`,
  ].join('\n')}\n`);
}

export const TAKEAWAY_RULES = `Takeaway\n\nStart with 21 stones. You move first. Enter a single digit from 1 to 3 and press Enter to take that many stones. Backspace replaces the previous move. The bot then takes 1 to 3 stones. Whoever takes the last stone wins.\n\nPile is the number remaining after both moves; Bot shows the bot's last move. The status is . while playing, ? after invalid input, W after your win and L after your loss. Invalid input does not consume a turn. A finished game ignores input until Restart or a fresh page load.\n\nStrategy: leave a multiple of four for your opponent. After their move, take enough to make the pair of moves add to four. The bot uses this strategy whenever it can; otherwise it takes one. There is no randomness or hidden state supplied by the host.\n\nThe page's trusted Forth program checks moves, chooses the bot's move and updates the display entirely inside the native client. Moves are not posted to a server. Scores are not persistent. Download these rules with F3 or get /takerules /rules from the file console.\n`;
