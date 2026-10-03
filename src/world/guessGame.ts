import { encodeText } from '../core/textEncoding';

const counted = (text: string) => `${text.length}:${text}`;
// Static character data becomes ordinary native Forth stores in LOAD. No host
// code runs game rules, chooses a target, validates guesses or updates a score.
const stores = (text: string, names: string[]) => encodeText(text).map((cell, i) => `${cell} ${names[i]} !`).join(' ');
const [question, lower, higher, equal, won] = encodeText('?<>=!');
export const GUESS_GAME_SOURCE = `
VARIABLE hint VARIABLE h1 VARIABLE h2 VARIABLE h3 VARIABLE h4 VARIABLE h5 VARIABLE h6
VARIABLE score VARIABLE s1 VARIABLE s2 VARIABLE s3 VARIABLE s4 VARIABLE s5 VARIABLE s6
VARIABLE rng VARIABLE target VARIABLE wins
: show hint 7 1 TEXT! wins @ 28 + s6 ! score 7 2 TEXT! ;
: next rng @ 17 * 43 + 97 /MOD DROP rng ! rng @ 9 /MOD DROP 1 + target ! ;
: bad ${question} h6 ! show ;
: LOAD ${stores('Hint: ?', ['hint','h1','h2','h3','h4','h5','h6'])}
  ${stores('Wins: 0', ['score','s1','s2','s3','s4','s5','s6'])}
  17 rng ! 0 wins ! next bad ;
: SUBMIT wins @ 9 = IF show EXIT THEN 0 FIELD@ 1 = IF @ 28 -
  DUP 1 < IF DROP bad EXIT THEN DUP 9 > IF DROP bad EXIT THEN
  DUP target @ = IF DROP wins @ 1 + wins !
    wins @ 9 = IF ${won} h6 ! ELSE ${equal} h6 ! next THEN
  ELSE target @ < IF ${lower} ELSE ${higher} THEN h6 ! THEN show
  ELSE DROP bad THEN ;
`.trim();

/** Initial on-disk page. The browser compiles and executes its C record. */
export function guessGamePage(): number[] {
  return encodeText(`PAGE 1\n${[
    `H ${counted('Guess the digit')}`,
    `T ${counted('Hint: ?')}`, `T ${counted('Wins: 0')}`,
    `T ${counted('Guess 1-9. < low, > high.')}`,
    `T ${counted('= round won; ! nine wins.')}`,
    `T ${counted('Backspace replaces a guess.')}`,
    'F 10:/app/guess', 'I 5:guess 0:', 'S 5:Guess', 'L 4:Home 6:/index',
    `C ${counted(GUESS_GAME_SOURCE)}`,
  ].join('\n')}\n`);
}
