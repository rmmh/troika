import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
test('native Caesar analysis shows ranked scored alternatives rather than silently choosing',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'postcards','/p0248','Caesar Frequency Workshop');
 await replace(page,'KHOOR ZRUOG');await expect(screen).toContainText('06 068 EBIIL TLOIA');await expect(screen).toContainText('03 059 HELLO WORLD');
 await page.screenshot({path:test.info().outputPath('native-caesar-ranked.png'),fullPage:true});
 await replace(page,'123');await expect(screen).toContainText('Invalid input');await replace(page,'ABCDEFGHIJKLMNOPQRSTUVWXYZ');await expect(screen).toContainText(/00 \d{3} ABCDEFGHIJKLMNOPQRST/);
});
test('native keyed columns encode and decode irregular rows with repeated key letters',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'library','/p0249','Keyed Columnar Cipher');
 await expect(screen).toContainText('E/D|KEY|text (max 54)');
 await replace(page,'E|CAB|ABCDE');await expect(screen).toContainText('BECAD');await page.screenshot({path:test.info().outputPath('native-keyed-columnar.png'),fullPage:true});
 await replace(page,'D|CAB|BECAD');await expect(screen).toContainText('ABCDE');await replace(page,'E|ABA|ABCDEF');await expect(screen).toContainText('ADCFBE');await replace(page,'D|ABA|ADCFBE');await expect(screen).toContainText('ABCDEF');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('native Vigenere preserves spaces while advancing the key only over letters',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'ada','/p0250','Vigenere Letter Workshop');
 await expect(screen).toContainText('E/D|KEY|text (max 54)');
 await replace(page,'E|LEMON|ATTACK AT DAWN');await expect(screen).toContainText('LXFOPV EF RNHR');await page.screenshot({path:test.info().outputPath('native-vigenere-spaces.png'),fullPage:true});
 await replace(page,'D|LEMON|LXFOPV EF RNHR');await expect(screen).toContainText('ATTACK AT DAWN');await replace(page,'E|KEY|HI!');await expect(screen).toContainText('Invalid input');
});
test('native affine investigator separates unique, ambiguous and incompatible mappings',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'typecase','/p0251','Affine Key Investigator');
 await replace(page,'AB:FI|ABC');await expect(screen).toContainText('a=03 b=05');await expect(screen).toContainText('FIL');await page.screenshot({path:test.info().outputPath('native-affine-unique.png'),fullPage:true});
 await replace(page,'AN:AN|');await expect(screen).toContainText('12 KEYS (a,b)');await expect(screen).toContainText('01,00 03,00 05,00 07,00');await page.screenshot({path:test.info().outputPath('native-affine-ambiguous.png'),fullPage:true});
 await replace(page,'AB:AA|TEXT');await expect(screen).toContainText('NO INVERTIBLE KEY');
});
