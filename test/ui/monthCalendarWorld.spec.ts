import {expect,test} from '@playwright/test';
import {launchNativeSoftware} from './softwareBrowser';
test('month calendar renders six-week months and leap February from native keyboard input',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launchNativeSoftware(page,'station','/p0227','Month Calendar');
 await page.keyboard.type('2020-08');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Su Mo Tu We Th Fr Sa');
 await expect(screen).toContainText('30 31');
 await page.screenshot({path:test.info().outputPath('native-six-week-calendar.png'),fullPage:true});
 for(let i=0;i<7;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('2000-02');await page.keyboard.press('Enter');await expect(screen).toContainText('27 28 29');
 for(let i=0;i<7;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('2000-13');await page.keyboard.press('Enter');await expect(screen).toContainText('Invalid input');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
