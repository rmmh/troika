import {test,expect} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
test('balanced ternary codec runs from its website and converts both directions',async({page})=>{
 test.setTimeout(150_000);
 const screen=await runNativeSoftware(page,'ternary','/p0301','Balanced Ternary Codec');
 await page.keyboard.type('enc -42');await page.keyboard.press('Enter');await expect(screen).toContainText('0000T1110');
 await page.screenshot({path:test.info().outputPath('ternary-codec-encode.png'),fullPage:true});
 for(let i=0;i<7;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('dec TTTTTTTTT');await page.keyboard.press('Enter');await expect(screen).toContainText('-9841');
 await page.screenshot({path:test.info().outputPath('ternary-codec-decode.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
