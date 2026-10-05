import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
async function exit(page:Page){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(page.getByTestId('world-screen')).toContainText('Welcome to Troika World',{timeout:45_000});}
test('Suffix Index sorts repeated suffixes and fills its second numeric row',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'typecase','/p0368','Suffix Index');
 await enter(page,'banana');await expect(screen).toContainText('SA 05 03 01 00 04 02');await expect(screen).toContainText('LC 00 01 03 00 00 02');await expect(screen).toContainText('Repeat: ana');
 await page.screenshot({path:test.info().outputPath('native-suffix-repeat.png'),fullPage:true});
 await enter(page,'abcdefghijklmnopq');await expect(screen).toContainText('Invalid input');
 await enter(page,'ponmlkjihgfedcba');await expect(screen).toContainText('SA 15 14 13 12 11 10 09 08');await expect(screen).toContainText('07 06 05 04 03 02 01 00');await expect(screen).toContainText('Repeat: -');
 await page.screenshot({path:test.info().outputPath('native-suffix-second-row.png'),fullPage:true});await exit(page);
});
test('Local Sequence Alignment reconstructs a gapped match and recovers from invalid input',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'library','/p0369','Local Sequence Alignment');
 await enter(page,'ABXCDEF|ABCDEF');await expect(screen).toContainText('Score: 10 (+2/-1/-2)');await expect(screen).toContainText('A:0..7 B:0..6');await expect(screen).toContainText('AB-CDEF');await expect(screen).toContainText('0-based end-exclusive spans');
 await page.screenshot({path:test.info().outputPath('native-local-gap.png'),fullPage:true});
 await enter(page,'A||B');await expect(screen).toContainText('Invalid input');await enter(page,'ABC|xyz');await expect(screen).toContainText('No positive local match');await exit(page);
});
