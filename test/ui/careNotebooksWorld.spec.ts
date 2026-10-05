import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function edit(page:Page,text:string){
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
test('bicycle service records persist and recalculate odometer margins after relaunch',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'bicycle','/p0218','Bicycle Maintenance Log');
 await page.keyboard.press('h');await expect(screen).toContainText('COMPONENT|LAST|INTERVAL');
 await edit(page,'Chain|500|200');await edit(page,':km 750');await expect(screen).toContainText('Remaining -50 km');await expect(screen).toContainText('SERVICE DUE');
 await edit(page,':done');await expect(screen).toContainText('Chain|750|200');await expect(screen).toContainText('Remaining 200 km');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');
 await reopen(page,'Bicycle Maintenance Log');await expect(screen).toContainText('Chain|750|200');
 await edit(page,':km 800');await expect(screen).toContainText('Remaining 150 km');
 await page.keyboard.press('?');await expect(screen).toContainText(':km N / :done');
 await page.screenshot({path:test.info().outputPath('native-bicycle-maintenance.png'),fullPage:true});
 await edit(page,'Chain|750|300');await expect(screen).toContainText('Remaining 250 km');
 await page.keyboard.press('F1');await expect(screen).toContainText('Unsaved changes: exit?');await page.keyboard.press('F1');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Bicycle Maintenance Log');await expect(screen).toContainText('Chain|750|300');
});
test('window plants preserve watering and recalculate light-dependent moisture after relaunch',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'nala','/p0219','Window Plant Journal');
 await page.keyboard.press('h');await expect(screen).toContainText('NAME|WATERED|RESERVE|SUN');
 await edit(page,'Fern|2|11|3');await edit(page,':day 6');await expect(screen).toContainText('Moisture -1 units');await expect(screen).toContainText('Water by day 6');
 await edit(page,':water');await expect(screen).toContainText('Fern|6|11|3');await expect(screen).toContainText('Water by day 10');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Window Plant Journal');await expect(screen).toContainText('Fern|6|11|3');
 await edit(page,':day 10');await expect(screen).toContainText('Moisture -1 units');await expect(screen).toContainText('WATER TODAY');
 await page.keyboard.press('?');await expect(screen).toContainText(':day N / :water');
 await page.screenshot({path:test.info().outputPath('native-window-plant-journal.png'),fullPage:true});
 await edit(page,'Fern|6|11|1');await expect(screen).toContainText('Moisture 7 units');await expect(screen).toContainText('Water by day 17');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Window Plant Journal');await expect(screen).toContainText('Fern|6|11|1');
});
