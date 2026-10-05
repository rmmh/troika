import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function edit(page:Page,text:string){await page.keyboard.press('Enter');for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
async function reopen(page:Page,title:string){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');await expect(page.getByRole('status')).toHaveText('Program path');await page.keyboard.type('/game');await page.keyboard.press('Enter');await expect(page.getByTestId('world-screen')).toContainText(title);await expect(page.getByTestId('world-screen')).toContainText('Loaded from disk');}
test('supper scheduler recalculates the critical path and saves repaired dependencies',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'lentil','/p0223','Supper Scheduler');
 await expect(screen).toContainText('Finish all: 52 min');await page.keyboard.press('ArrowDown');await expect(screen).toContainText('Slack 25 min');
 await page.keyboard.press('ArrowUp');await edit(page,'Soak|40|');await expect(screen).toContainText('Finish all: 62 min');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(screen).toContainText('Start 40; finish 60');await expect(screen).toContainText('CRITICAL: no spare time');
 await page.screenshot({path:test.info().outputPath('native-supper-critical-path.png'),fullPage:true});
 await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await edit(page,'Soak|40|4');await expect(screen).toContainText('CYCLE blocks selected task');
 await edit(page,'Soak|40|');await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Supper Scheduler');await expect(screen).toContainText('Finish all: 62 min');await expect(screen).toContainText('Soak|40|');
});
test('batch inventory allocates FIFO lots, rejects shortages and restores saved expiry day',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'pickle','/p0224','Batch Inventory');
 await edit(page,':use lentil 10');await expect(screen).toContainText('lentil|0|4');await page.keyboard.press('ArrowDown');await expect(screen).toContainText('lentil|5|8');
 await edit(page,':use lentil 6');await expect(screen).toContainText('Insufficient usable stock');await page.keyboard.press('F1');await expect(screen).toContainText('lentil|5|8');
 await edit(page,':day 9');await expect(screen).toContainText('Day 9; usable 12');await expect(screen).toContainText('Expired lots 1');
 await page.screenshot({path:test.info().outputPath('native-batch-fifo-expiry.png'),fullPage:true});
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Batch Inventory');await expect(screen).toContainText('Day 9; usable 12');
 await page.keyboard.press('ArrowDown');await expect(screen).toContainText('lentil|5|8');await edit(page,':day 8');await edit(page,':use lentil 5');await expect(screen).toContainText('lentil|0|8');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
