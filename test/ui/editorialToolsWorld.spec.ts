import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
test('native concordance preserves repeated word positions and recovers from invalid grammar',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'library','/p0236','Word Position Concordance');
 await replace(page,'red blue red');await expect(screen).toContainText('blue:2; red:1,3');await expect(screen).toContainText('Word:positions');
 await page.screenshot({path:test.info().outputPath('native-word-concordance.png'),fullPage:true});
 await replace(page,'red!');await expect(screen).toContainText('Invalid input');await replace(page,'A a B');await expect(screen).toContainText('a:1,2; b:3');await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
test('native keyword search lays out bounded context rows with character offsets',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'gazette','/p0237','Keyword Context Windows');
 await replace(page,'cat|the cat sat by cat');await expect(screen).toContainText('05:  the [cat] sat b');await expect(screen).toContainText('16:at by [cat]');
 await page.screenshot({path:test.info().outputPath('native-context-windows.png'),fullPage:true});
 await replace(page,'at|cat');await expect(screen).toContainText('NO MATCH');await replace(page,'a|a a a a a a a');await expect(screen).toContainText('Invalid input');
});
test('native sentence formatter separates sentence case from punctuation spacing',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'zine','/p0238','Sentence Case Formatter');
 await replace(page,'  HELLO ,WORLD!how ARE you? ');await expect(screen).toContainText('Hello, world! How are you?');
 await page.screenshot({path:test.info().outputPath('native-sentence-formatter.png'),fullPage:true});
 await replace(page,'FIRST: SECOND; THIRD.');await expect(screen).toContainText('First: second; third.');
});
test('native word columns fill downward and reject overwide words',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'typecase','/p0239','Alphabetical Word Columns');
 await replace(page,'8|fig apple pear plum date grape lime kiwi');await expect(screen).toContainText(/apple\s+grape\s+pear/);await expect(screen).toContainText(/date\s+kiwi\s+plum/);await expect(screen).toContainText(/fig\s+lime/);
 await page.screenshot({path:test.info().outputPath('native-alphabetical-columns.png'),fullPage:true});
 await replace(page,'2|long');await expect(screen).toContainText('Invalid input');await replace(page,'3|fig yam pea tea oat');await expect(screen).toContainText('fig oat pea tea yam');
});
