import { expect, test, type Page } from '@playwright/test';
import { HANOI_SOLUTION } from '../classicGames2Reference';

async function launch(page:Page,host:string,path:string,title:string) {
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type(`get http://${host}.world${path} /game`);await page.keyboard.press('Enter');
  await expect(screen).toContainText(/(?:^|\n)\s*ok\s*(?:\n|$)/,{timeout:45_000});
  await page.keyboard.type('programs');await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/game');await page.keyboard.press('Enter');
  await expect(screen).toContainText(title);
  return screen;
}

test('Hanoi shows peg selection and completes a fifteen-move keyboard solution',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'puzzlebox','/p0179','Four-Disk Hanoi');
  await expect(screen).toContainText('Move all disks from A to C');
  await page.screenshot({path:test.info().outputPath('native-hanoi-start.png'),fullPage:true});
  let column=0;
  for(const next of HANOI_SOLUTION) {
    for(let i=0;i<Math.abs(next-column);i++)await page.keyboard.press(next>column?'ArrowRight':'ArrowLeft');
    await page.keyboard.press('Enter');column=next;
  }
  await expect(screen).toContainText('Tower transferred! R retry');
  await expect(screen).toContainText(/Moves:\s+15/);
  await page.screenshot({path:test.info().outputPath('native-hanoi-solved.png'),fullPage:true});
  await page.keyboard.type('r');await expect(screen).toContainText('Move all disks from A to C');
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Lantern Word exposes its clue and reveals a solved word from keyboard guesses',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'letters','/p0180','Lantern Word Guess');
  await expect(screen).toContainText('Clue: three-state numbers');
  let row=0,column=0;
  for(const letter of new Set('TERNARY')) {
    const square=8+letter.charCodeAt(0)-65,nextRow=Math.floor(square/8),nextColumn=square%8;
    for(let i=0;i<Math.abs(nextRow-row);i++)await page.keyboard.press(nextRow>row?'ArrowDown':'ArrowUp');
    for(let i=0;i<Math.abs(nextColumn-column);i++)await page.keyboard.press(nextColumn>column?'ArrowRight':'ArrowLeft');
    await page.keyboard.press('Enter');row=nextRow;column=nextColumn;
  }
  await expect(screen).toContainText('Word found! R restarts');
  await expect(screen).toContainText(/T\s+E\s+R\s+N\s+A\s+R\s+Y/);
  await page.screenshot({path:test.info().outputPath('native-lantern-word.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Ferry Crossing shows both banks and completes seven safe crossings',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'creek','/p0181','Ferry Crossing');
  let row=0;
  for(const next of [2,4,1,2,3,4,2]) {
    for(let i=0;i<Math.abs(next-row);i++)await page.keyboard.press(next>row?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');row=next;
  }
  await expect(screen).toContainText(/Trips:\s+7/);
  await expect(screen).toContainText('All safe on the east bank!');
  await page.screenshot({path:test.info().outputPath('native-ferry-crossing.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
