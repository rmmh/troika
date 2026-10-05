import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
import {robotsSolution,morrisReference,MORRIS_CELLS} from '../retroArcadeReference';
function chooser(page:Page,columns:number){let cursor=0;return async(square:number)=>{const dr=Math.floor(square/columns)-Math.floor(cursor/columns),dc=square%columns-cursor%columns;for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');cursor=square;await page.keyboard.press('Enter');};}
test('Scrap Robots uses its finite teleport and lures every robot into destruction',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'salvage','/p0240','Scrap Robots'),choose=chooser(page,8);
 for(const square of robotsSolution())if(square===64)await page.keyboard.press('t');else await choose(square);
 await expect(screen).toContainText('All robots became scrap!');await page.screenshot({path:test.info().outputPath('native-robots-escape.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Orchard Snake rejects reversal, grows on fruit and reports a wall crash',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'orchard','/p0241','Orchard Snake');await page.keyboard.press('a');await expect(screen).toContainText('Cannot reverse into body');await page.keyboard.press('n');await page.keyboard.press('n');await expect(screen).toContainText('Ticks: 2');await page.screenshot({path:test.info().outputPath('native-snake-growth.png'),fullPage:true});
 await page.keyboard.press('w');await page.keyboard.press('n');await page.keyboard.press('n');await page.keyboard.press('n');await page.keyboard.press('n');await expect(screen).toContainText('Crash! R starts a new snake');await page.screenshot({path:test.info().outputPath('native-snake-crash.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Nine Mens Morris plays through placement, mills and a complete movement phase',async({page})=>{
 test.setTimeout(240_000);const screen=await launch(page,'chess','/p0242','Nine Mens Morris'),choose=chooser(page,7),model=morrisReference();let seed=31,millShot=false,movementShot=false;
 for(let step=0;step<900&&!model.status;step++){const options=model.options();seed=seed*48271%2147483647;for(const p of options[seed%options.length]!){await choose(MORRIS_CELLS[p]!);model.play(MORRIS_CELLS[p]!);}await expect(screen).toContainText(`Moves: ${model.moves}`);const side=model.turn===1?'A':'B';await expect(screen).toContainText(model.status===3?'Draw: 50 moves':model.status?`${model.status===1?'A':'B'} wins the mill game`:model.pendingRemoval?`${side}: remove enemy man`:model.state.placed[model.turn-1]!<9?`${side}: place a man`:`${side}: move a man`);if(model.pendingRemoval&&!millShot){await expect(screen).toContainText('remove enemy man');await page.screenshot({path:test.info().outputPath('native-morris-mill.png'),fullPage:true});millShot=true;}if(model.state.placed.every(n=>n===9)&&!model.pendingRemoval&&!model.status&&!movementShot){await expect(screen).toContainText('move a man');await page.screenshot({path:test.info().outputPath('native-morris-movement.png'),fullPage:true});movementShot=true;}}
 expect(model.status).not.toBe(0);await expect(screen).toContainText(model.status===3?'Draw: 50 moves':`${model.status===1?'A':'B'} wins the mill game`);await page.screenshot({path:test.info().outputPath('native-morris-ending.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Pocket Pin Bowling adjusts to lane drift over five complete scored frames',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'scorebook','/p0243','Pocket Pin Bowling'),choose=chooser(page,7);
 for(const [i,aim]of[2,4,1,3,0,2,1,3,2,4].entries()){await choose(42+aim);await page.keyboard.press('n');await expect(screen).toContainText(`Rolls: ${i+1}`);if(i===0)await page.screenshot({path:test.info().outputPath('native-bowling-first-ball.png'),fullPage:true});}
 await expect(screen).toContainText('Win! score:  40');await page.screenshot({path:test.info().outputPath('native-bowling-score.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
