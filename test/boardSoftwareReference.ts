/** Independent test models. Production games never import or execute these. */
export function boardSoftwareReference(id:string) {
  const size = id==='eight-queens' ? 64 : id==='lights-out' ? 25 : 9;
  const cells = Array<string>(size).fill('.');
  let moves = 0, status = 0, player = 'X';
  const cross = (square:number) => {
    const row = Math.floor(square/5), col = square%5;
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) if (Math.abs(r-row)+Math.abs(c-col)<=1) {
      const i=r*5+c; cells[i]=cells[i]==='.' ? '*' : '.';
    }
  };
  if (id==='lights-out') for (const square of [0,6,12,18,24]) cross(square);
  if (id==='eight-puzzle') cells.splice(0,9,...'1234.8765');
  return {
    get board() {return cells.join('');},
    get moves() {return moves;},
    get status() {return status;},
    play(square:number) {
      if (status && id!=='eight-queens') return;
      if (id==='lights-out') {cross(square); moves++; status=cells.every(c=>c==='.') ? 1 : 0; return;}
      if (id==='noughts-crosses') {
        if (cells[square]!=='.') return;
        cells[square]=player; moves++;
        const lines = [0,1,2].flatMap(n=>[[n*3,n*3+1,n*3+2],[n,n+3,n+6]]).concat([[0,4,8],[2,4,6]]);
        status=lines.some(line=>line.every(i=>cells[i]===player)) ? (player==='X' ? 1 : 2) : (moves===9 ? 3 : 0);
        player=player==='X' ? 'O' : 'X'; return;
      }
      if (id==='eight-puzzle') {
        const empty=cells.indexOf('.');
        if (Math.abs(Math.floor(empty/3)-Math.floor(square/3))+Math.abs(empty%3-square%3)!==1) return;
        [cells[empty],cells[square]]=[cells[square]!,cells[empty]!]; moves++; status=cells.join('')==='12345678.' ? 1 : 0; return;
      }
      if (id==='eight-queens') {
        if (cells[square]==='Q') {cells[square]='.'; moves++; status=0; return;}
        const row=Math.floor(square/8), col=square%8;
        if (cells.some((c,i)=>c==='Q' && (Math.floor(i/8)===row || i%8===col || Math.abs(Math.floor(i/8)-row)===Math.abs(i%8-col)))) return;
        cells[square]='Q'; moves++; status=cells.filter(c=>c==='Q').length===8 ? 1 : 0; return;
      }
      throw new Error(`No board reference for ${id}`);
    },
  };
}
