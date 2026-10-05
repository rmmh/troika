import {expect,test} from '@playwright/test';
import {launchNativeSoftware} from './softwareBrowser';
test('native Boolean table evaluates complete assignments and diagnoses malformed RPN',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launchNativeSoftware(page,'relay','/p0286','Boolean Truth Table');
 const run=async(input:string)=>{for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');};
 await run('ab&');for(const field of ['000:0','001:0','010:0','011:0','100:0','101:0','110:1','111:1','CONTINGENT','F1: programs'])await expect(screen).toContainText(field);
 await page.screenshot({path:test.info().outputPath('native-boolean-table.png'),fullPage:true});
 await run('aa!|');await expect(screen).toContainText('TAUTOLOGY');await expect(screen).toContainText('000:1');
 await run('aa!&');await expect(screen).toContainText('CONTRADICTION');await expect(screen).toContainText('111:0');
 await page.screenshot({path:test.info().outputPath('native-boolean-contradiction.png'),fullPage:true});
 await run('a&');await expect(screen).toContainText('Invalid input');
 await run('ab^c^');await expect(screen).toContainText('111:1');await expect(screen).toContainText('CONTINGENT');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
