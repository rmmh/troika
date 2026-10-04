import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replaceDraft(page:Page,text:string){
 await page.keyboard.press('Enter');
 for(let i=0;i<54;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type(text);await page.keyboard.press('Enter');
}
async function reopen(page:Page,title:string){
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
 await page.keyboard.type('4');await expect(page.getByRole('status')).toHaveText('Program path');
 await page.keyboard.type('/game');await page.keyboard.press('Enter');
 await expect(page.getByTestId('world-screen')).toContainText(title);
 await expect(page.getByTestId('world-screen')).toContainText('Loaded from disk');
}

test('cue cards survive a program switch and expose saved record data in memory',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'rainroom','/p0213','Rehearsal Cue Cards');
 await replaceDraft(page,'Lights fade.');
 await page.keyboard.press('ArrowDown');await replaceDraft(page,'Wait for the rain.');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');
 await reopen(page,'Rehearsal Cue Cards');
 await expect(screen).toContainText('Lights fade.');await expect(screen).toContainText('Wait for the rain.');
 await page.keyboard.press('p');await expect(screen).toContainText('Cue 01:');
 await page.keyboard.press('n');await expect(screen).toContainText('Cue 02:');
 await page.keyboard.press('Escape');await page.getByRole('checkbox',{name:'Inspect machines'}).check();
 await page.getByLabel('World machine').selectOption('client');
 await page.getByLabel('Memory address').fill('3000');await page.getByLabel('Memory address').press('Enter');
 await expect(page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})})).toContainText('(12)');
 await page.screenshot({path:test.info().outputPath('native-cue-cards-persisted.png'),fullPage:true});
});

test('lending ledger saves a checkout and reports overdue loans from keyboard commands',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'library','/p0211','Lending Ledger');
 await replaceDraft(page,'Moon Atlas||0');await replaceDraft(page,':out Iris|12');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');
 await reopen(page,'Lending Ledger');await expect(screen).toContainText('Moon Atlas|Iris|12');
 await replaceDraft(page,':day 13');await expect(screen).toContainText('LATE');
 await page.screenshot({path:test.info().outputPath('native-lending-ledger.png'),fullPage:true});
 await replaceDraft(page,':in');await expect(screen).toContainText('Moon Atlas||0');
 await page.keyboard.press('F1');await expect(screen).toContainText('Unsaved changes: exit?');
 await page.keyboard.press('s');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('worksheet recalculates saved dependencies and diagnoses circular formulas',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'rye','/p0212',"Baker's Worksheet");
 await replaceDraft(page,'120');await page.keyboard.press('ArrowDown');await replaceDraft(page,'3');
 await page.keyboard.press('ArrowDown');await replaceDraft(page,'=A1*B1');
 await expect(screen).toContainText('360');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');
 await reopen(page,"Baker's Worksheet");await expect(screen).toContainText('360');
 await replaceDraft(page,'=C1');await expect(screen).toContainText('CYCLE');
 await page.screenshot({path:test.info().outputPath('native-worksheet-cycle.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(screen).toContainText('Unsaved changes: exit?');
 await page.keyboard.press('d');await expect(page.getByRole('status')).toHaveText('Programs');
});
