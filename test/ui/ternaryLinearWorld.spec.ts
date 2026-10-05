import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
async function exit(page:Page){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(page.getByTestId('world-screen')).toContainText('Welcome to Troika World',{timeout:45_000});}
test('Ternary Matrix Workshop switches from row reduction to a full nullspace basis',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'ternary','/p0401','Ternary Matrix Workshop');
 await enter(page,'R 2 3|121212');await expect(screen).toContainText('Rank 1; nullity 2');await expect(screen).toContainText('1: 1 2 1');await expect(screen).toContainText('2: 0 0 0');
 await page.screenshot({path:test.info().outputPath('native-ternary-rref.png'),fullPage:true});
 await enter(page,'R 2 2|000');await expect(screen).toContainText('Invalid input');await enter(page,'N 1 5|00000');await expect(screen).toContainText('Rank 0; nullity 5');await expect(screen).toContainText('v1: 1 0 0 0 0');await expect(screen).toContainText('v5: 0 0 0 0 1');
 await page.screenshot({path:test.info().outputPath('native-ternary-nullspace.png'),fullPage:true});await exit(page);
});
test('Ternary Recurrence Finder reports a periodic rule and the maximal finite-prefix order',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'signals','/p0402','Ternary Recurrence Finder');
 await enter(page,'012012012012');await expect(screen).toContainText('Order: 2');await expect(screen).toContainText('C:111');await expect(screen).toContainText('Next 6: 012012');await expect(screen).toContainText('Finite prefix; not a law');
 await page.screenshot({path:test.info().outputPath('native-ternary-recurrence.png'),fullPage:true});
 await enter(page,'3');await expect(screen).toContainText('Invalid input');await enter(page,'0'.repeat(23)+'1');await expect(screen).toContainText('Order: 24');await expect(screen).toContainText('C:1'+'0'.repeat(23)+'2');await expect(screen).toContainText('Next 6: 000000');
 await page.screenshot({path:test.info().outputPath('native-ternary-order-bound.png'),fullPage:true});await exit(page);
});
