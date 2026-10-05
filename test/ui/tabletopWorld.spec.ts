import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
import {draughtsReference} from '../tabletopGamesReference';
function chooser(page:Page,columns:number){let cursor=0;return async(square:number)=>{const dr=Math.floor(square/columns)-Math.floor(cursor/columns),dc=square%columns-cursor%columns;for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');cursor=square;await page.keyboard.press('Enter');};}
test('Pocket Draughts plays a legal two-player match with captures and kings',async({page})=>{
 test.setTimeout(240_000);const screen=await launch(page,'cardtable','/p0228','Pocket Draughts'),choose=chooser(page,6),model=draughtsReference();let seed=5;
 for(let turn=0;turn<240&&!model.status;turn++){const choices=model.options();seed=seed*48271%2147483647;const[from,to]=choices[seed%choices.length]!;await choose(from);model.play(from);await choose(to);model.play(to);if(turn===5){await expect(screen).toContainText(`Moves: ${model.moves}`);await page.screenshot({path:test.info().outputPath('native-draughts-midgame.png'),fullPage:true});}}
 expect(model.status).not.toBe(0);await expect(screen).toContainText(model.status===3?'Draw: 80 moves':`${model.status===1?'A':'B'} wins:`);
 await page.screenshot({path:test.info().outputPath('native-draughts-finish.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Lunch Hex completes a slanted edge-to-edge connection',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'hexclub','/p0229','Lunch Hex'),choose=chooser(page,5);
 for(const i of[4,0,8,1,12,2,16,3,20])await choose(i);await expect(screen).toContainText('X joins top and bottom!');await page.screenshot({path:test.info().outputPath('native-hex-connection.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Dots and Boxes claims two boxes on a shared edge and finishes the table',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'puzzlebox','/p0230','Dots and Boxes'),choose=chooser(page,7);
 const used=new Set([1,7,15,3,11,17,9]);for(const i of used)await choose(i);await expect(screen).toContainText('A:2 B:0; turn A');await page.screenshot({path:test.info().outputPath('native-dots-double-box.png'),fullPage:true});
 for(let i=0;i<49;i++)if(!used.has(i)&&(Math.floor(i/7)%2)!==(i%7%2))await choose(i);await expect(screen).toContainText('wins!');await page.screenshot({path:test.info().outputPath('native-dots-finish.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Sea Battle reports sunk ships and allows inspection of incoming fire',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'creek','/p0231','Sea Battle'),choose=chooser(page,5);
 for(const i of[0,1,2])await choose(i);await expect(screen).toContainText('sunkA');await page.screenshot({path:test.info().outputPath('native-sea-enemy-hit.png'),fullPage:true});await page.keyboard.press('n');await expect(screen).toContainText(/Y\s+O\s+U\s+R\s+S/);await page.screenshot({path:test.info().outputPath('native-sea-own-fleet.png'),fullPage:true});await page.keyboard.press('n');await expect(screen).toContainText(/E\s+N\s+E\s+M\s+Y/);await choose(18);await choose(23);await expect(screen).toContainText('Enemy fleet sunk: you win!');await page.screenshot({path:test.info().outputPath('native-sea-victory.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
