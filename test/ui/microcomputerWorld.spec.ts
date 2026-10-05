import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
import {BUS_SOLUTION,pantrySolutions} from '../microcomputerGamesReference';
function chooser(page:Page,columns:number){let cursor=0;return async(square:number)=>{const dr=Math.floor(square/columns)-Math.floor(cursor/columns),dc=square%columns-cursor%columns;for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');cursor=square;await page.keyboard.press('Enter');};}
test('Bus Pilot edits a looping route, single-steps it, and completes all stops',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'nightbus','/p0221','Bus Pilot'),choose=chooser(page,6);
 for(const [i,op]of [...BUS_SOLUTION].entries())for(let press=0;press<'.FLRJS'.indexOf(op);press++)await choose(36+i);
 await page.keyboard.press('n');await page.keyboard.press('n');await page.keyboard.press('n');await expect(screen).toContainText('stops 1/3');
 await page.screenshot({path:test.info().outputPath('native-bus-pilot-stepping.png'),fullPage:true});
 await page.keyboard.press('g');await expect(screen).toContainText('All stops served; home!');await expect(screen).toContainText('Ticks: 18');
 await page.keyboard.press('b');await expect(screen).toContainText('Ticks: 0');await page.keyboard.press('g');await expect(screen).toContainText('All stops served; home!');
 await page.screenshot({path:test.info().outputPath('native-bus-pilot-complete.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('Pantry Cover explains a clash and accepts exact meals in all three pantries',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'mushroom','/p0222','Pantry Cover'),choose=chooser(page,8);
 await choose(0);await expect(screen).toContainText('P1 missing: CDEF');await choose(24);await expect(screen).toContainText('P1 overlap: A');await choose(24);await choose(0);
 for(let puzzle=0;puzzle<3;puzzle++){for(const row of pantrySolutions(puzzle)[0]!)await choose(row*8);await page.keyboard.press('n');await expect(screen).toContainText(`Pantry ${puzzle+1} covered!`);await page.screenshot({path:test.info().outputPath(`native-pantry-${puzzle+1}-complete.png`),fullPage:true});if(puzzle<2){await page.keyboard.press('p');await expect(screen).toContainText(`P${puzzle+2} missing: ABCDEF`);}}
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
