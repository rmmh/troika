import { encodeText } from '../core/textEncoding';

const counted = (text: string) => `${text.length}:${text}`;
const variables = ['score', ...Array.from({ length: 9 }, (_, i) => `s${i + 1}`)];
const initialize = encodeText('Score: 0/2').map((cell, i) => `${cell} ${variables[i]} !`).join(' ');

// These bytes are initial disk content. Previewing and checking answers run
// only in the guest's bounded Forth VM; no host grader or dynamic source eval.
export const TRUST_LAB_SOURCE = `
${variables.map(name => `VARIABLE ${name}`).join(' ')}
: answer SWAP FIELD@ 1 = IF @ = ELSE DROP DROP 0 THEN ;
: check 0 FIELD@ 2 TEXT! 1 29 answer 2 30 answer + 28 + s7 ! score 10 12 TEXT! ;
: LOAD ${initialize} check ;
: SUBMIT check ;
`.trim();

export function trustLabPage(): number[] {
  return encodeText(`PAGE 1\n${[
    `H ${counted('Trust lab')}`,
    `T ${counted('Literal input preview:')}`,
    `T ${counted(' '.repeat(54))}`,
    'F 10:/app/trust',
    `I 6:sample ${counted('<b>Hello</b>')}`,
    `T ${counted('1. A forum reply should be:')}`,
    `T ${counted('1 text   2 a program')}`,
    'I 4:kind 0:',
    `T ${counted('2. A public upload is:')}`,
    `T ${counted('1 trusted   2 untrusted')}`,
    'I 5:trust 0:',
    'S 5:Check',
    `T ${counted('Score: 0/2')}`,
    `T ${counted('Enter answers 1 or 2.')}`,
    `T ${counted('XSS: data executed as code.')}`,
    'L 10:Read notes 11:/trustnotes',
    'L 4:Home 6:/index',
    `C ${counted(TRUST_LAB_SOURCE)}`,
  ].join('\n')}\n`);
}

export const TRUST_LAB_NOTES = `Trust lab\n\nA reply is text, not a program. Counted text records keep punctuation and newlines inside the supplied value. Copying field text into a preview must not reparse it as page records or source.\n\nA public upload is untrusted. Files World serves shared files as plain text using an explicit MIME policy, even if their contents resemble a page. Names and contents do not confer trust.\n\nCross-site scripting (XSS) occurs when untrusted input is interpreted as executable content in a trusted page. This lab demonstrates a data-only preview. A score of 2/2 means both answers match these rules; it does not certify an application as secure.\n\nThe trusted page code can read its fields and change text through bounded Forth words. It cannot evaluate field text as source. The preview and scoring run locally; Check does not publish the sample.\n`;
