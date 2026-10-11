import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,waitBitmapFrame,expectBitmapText,exitNativeBitmap} from './nativeBitmapBrowser';
test('native String Art Circle changes its weaving and animates through guest ticks',async({page})=>{
  test.setTimeout(180_000);
  await runNativeBitmap(page,'loom','/p0480','String Art Circle');
  await expectBitmapText(page,'2',42,145);
  await bitmapKey(page,'ArrowRight');await expectBitmapText(page,'3',42,145);
  await bitmapKey(page,'ArrowDown');await expectBitmapText(page,'1',96,145);
  await bitmapKey(page,'Enter');await expectBitmapText(page,'-1',144,145);
  await bitmapKey(page,'n');await expectBitmapText(page,'0',96,145);
  const before=await bitmapSnapshot(page);await page.keyboard.press('g');
  await expect.poll(()=>bitmapSnapshot(page),{timeout:30_000}).not.toBe(before);
  await page.keyboard.press('Space');await waitBitmapFrame(page);await bitmapKey(page,'Tab');
  await page.screenshot({path:test.info().outputPath('native-string-art-circle.png'),fullPage:true});
  await page.keyboard.press('h');await expectBitmapText(page,'H:BACK',0,153);
  await page.keyboard.press('h');await waitBitmapFrame(page);
  await expectBitmapText(page,'ARROWS FACTOR/SHIFT ENT REV',0,10);
  await exitNativeBitmap(page);
});
