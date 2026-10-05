import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function edit(page:Page,text:string){await page.keyboard.press('Enter');for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
async function reopen(page:Page,title:string){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');await expect(page.getByRole('status')).toHaveText('Program path');await page.keyboard.type('/game');await page.keyboard.press('Enter');await expect(page.getByTestId('world-screen')).toContainText(title);await expect(page.getByTestId('world-screen')).toContainText('Loaded from disk');}
test('tea house native verse follows edited wordbanks and repeatable seeds after relaunch',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'tea','/p0225','Tea House Poet');
 await page.keyboard.press('h');await expect(screen).toContainText('1-4 image 5-8 act 9-12 site');
 await page.keyboard.press('ArrowDown');await edit(page,'amber light');await edit(page,':seed 42');await expect(screen).toContainText('Triptych seed 2948');await expect(screen).toContainText('amber light');
 await page.keyboard.press('f');await expect(screen).toContainText('Echo seed 2948');await expect(screen).toContainText('drifts at dawn');
 await page.keyboard.press('f');await expect(screen).toContainText('Couplet seed 2948');await expect(screen).toContainText('amber light drifts');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Tea House Poet');
 await edit(page,':seed 42');await page.keyboard.press('f');await page.keyboard.press('f');await expect(screen).toContainText('amber light drifts');
 await page.screenshot({path:test.info().outputPath('native-tea-house-poet.png'),fullPage:true});await page.keyboard.press('n');await expect(screen).not.toContainText('Couplet seed 2948');
});
test('native recipe index filters exact positive and negative terms and saves selected results',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'citrus','/p0226','Recipe Index');
 await edit(page,'Oat biscuits|sweet|oat flour');await page.keyboard.press('ArrowDown');await edit(page,'Nut oats|sweet,nut|oat almond');await page.keyboard.press('ArrowDown');await edit(page,'Rice bowl|savory|rice pea');
 await edit(page,':find oat +sweet -nut');await expect(screen).toContainText('Matches 1 result 1');await expect(screen).toContainText('N/P next J:go H:format ?:q');
 await page.keyboard.press('j');await edit(page,'Baked oats|sweet|oat flour');await expect(screen).toContainText('Baked oats');await expect(screen).toContainText('Matches 1 result 1');
 await page.keyboard.press('?');await expect(screen).toContainText(':find oat +sweet -nut !milk');
 await page.screenshot({path:test.info().outputPath('native-recipe-index-filter.png'),fullPage:true});
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Recipe Index');await expect(screen).toContainText('Baked oats|sweet|oat flour');await expect(screen).toContainText('Matches 3 result 1');
 await edit(page,':find rice pea');await expect(screen).toContainText('Matches 1 result 1');await page.keyboard.press('j');await expect(screen).toContainText('Rice bowl|savory|rice pea');
});
