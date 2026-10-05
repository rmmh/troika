import {expect,test} from '@playwright/test';
import {launchNativeSoftware} from './softwareBrowser';

test('rule loom downloads, grows and edits circular cellular rules entirely from the keyboard',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launchNativeSoftware(page,'comet','/p0220','Comet Rule Loom');
 await expect(screen).toContainText('Top:000..111 Bottom:seed');
 for(let n=0;n<10;n++)await page.keyboard.press('n');
 await expect(screen).toContainText('Gens: 10');
 await page.screenshot({path:test.info().outputPath('native-rule-loom.png'),fullPage:true});
 await page.keyboard.press('Enter');await expect(screen).toContainText('Gens: 0');
 await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');
 await page.keyboard.press('n');await expect(screen).toContainText('Gens: 1');
 await page.keyboard.press('r');await expect(screen).toContainText('Gens: 0');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
