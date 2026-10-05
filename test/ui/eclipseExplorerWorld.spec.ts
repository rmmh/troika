import {expect,test} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
test('native eclipse explorer reads cartridge years, browses facts and returns to programs',async({page})=>{
 test.setTimeout(180_000);
 const screen=await runNativeSoftware(page,'observatory','/p0317','Eclipse Explorer');
 await expect(screen).toContainText('UT=TD minus dT');await page.keyboard.type('S2024');await page.keyboard.press('Enter');await expect(screen).toContainText('2024-04-08 Gregorian');await expect(screen).toContainText('Magnitude 1.0566');await expect(screen).toContainText('18:18:29 TD Solar T');
 await page.screenshot({path:test.info().outputPath('native-eclipse-solar.png'),fullPage:true});
 await page.keyboard.type('d');await expect(screen).toContainText('Saros 139 Catalog 9561');await expect(screen).toContainText('DeltaT 74 seconds');await page.keyboard.type('d');await expect(screen).toContainText('Central seconds 268');
 await page.keyboard.press('ArrowRight');await expect(screen).toContainText('2024-10-02');for(let i=0;i<5;i++)await page.keyboard.press('Backspace');await page.keyboard.type('L2025');await page.keyboard.press('Enter');await expect(screen).toContainText('Pen magnitude 2.2595');await page.keyboard.type('dd');await expect(screen).toContainText('Umb mag 1.1784');await expect(screen).toContainText('Partial min 218.3');await expect(screen).toContainText('Total min 65.4');
 await page.screenshot({path:test.info().outputPath('native-eclipse-lunar.png'),fullPage:true});
 for(let i=0;i<5;i++)await page.keyboard.press('Backspace');await page.keyboard.type('S-1999');await page.keyboard.press('Enter');await expect(screen).toContainText('Date -1999-06-12 Julian');await page.keyboard.type('d');await expect(screen).toContainText('DeltaT 46438 seconds');await page.screenshot({path:test.info().outputPath('native-eclipse-bce.png'),fullPage:true});
 await page.keyboard.type('h');await expect(screen).toContainText('Julian before 1582-10-15');await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World');await expect(page.getByRole('status')).toHaveText('Ready');
});
