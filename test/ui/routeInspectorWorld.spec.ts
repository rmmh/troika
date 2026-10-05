import {expect,test} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
test('Route Inspector produces an optimal repeat-path plan and rejects disconnected routes',async({page})=>{
 test.setTimeout(180_000);
 const screen=await runNativeSoftware(page,'tram','/p0339','Route Inspector');
 async function enter(input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
 await enter('6|0102030405');
 await expect(screen).toContainText('extra=5 total=10');
 for(const path of ['repeat 0-1','repeat 2-0-3','repeat 4-0-5'])await expect(screen).toContainText(path);
 await expect(screen).toContainText('Closed tour is now possible');
 await page.screenshot({path:test.info().outputPath('tram-route-inspector.png'),fullPage:true});
 await enter('4|0123');await expect(screen).toContainText('IMPOSSIBLE: separate edges');
 await enter('2|09');await expect(screen).toContainText('Invalid input');
 await enter('2|0101');await expect(screen).toContainText('extra=0 total=2');await expect(screen).toContainText('No repeated paths needed');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
 await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
