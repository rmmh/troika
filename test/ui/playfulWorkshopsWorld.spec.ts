import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,exitNativeBitmap,waitBitmapFrame,expectBitmapText} from './nativeBitmapBrowser';
const apps=[['loom','/p0456','Elastic Net'],['scorebook','/p0457','Pocket Pinball'],['maze','/p0458','Maze Carver'],['pottery','/p0459','Tile Scroll Studio'],['bottles','/p0460','Ink Advection'],['toolshed','/p0461','Reach Arm']] as const;
for(const[host,path,title]of apps)test(`native ${title} edits, animates and exits`,async({page})=>{test.setTimeout(150_000);await runNativeBitmap(page,host,path,title);
 if(title==='Elastic Net'){await bitmapKey(page,'ArrowLeft');await bitmapKey(page,'Enter',false);await bitmapKey(page,'d');await bitmapKey(page,'f',false);}
 if(title==='Pocket Pinball'){await page.keyboard.press('Enter');await page.keyboard.press('Space');await waitBitmapFrame(page);await bitmapKey(page,'z');await bitmapKey(page,'n');}
 if(title==='Tile Scroll Studio'){await bitmapKey(page,'4',false);await bitmapKey(page,'e');await bitmapKey(page,'Enter');await bitmapKey(page,'e');await bitmapKey(page,'Enter');}
 if(title==='Ink Advection'){await bitmapKey(page,'Enter');await bitmapKey(page,'f');await bitmapKey(page,'n');}
 if(title==='Reach Arm'){for(let i=0;i<3;i++)await bitmapKey(page,'n',false);await expectBitmapText(page,'TARGET WITHIN THREE PIXELS',0,145);await bitmapKey(page,'ArrowRight');await bitmapKey(page,'Enter');}
 const before=await bitmapSnapshot(page);await page.keyboard.press('g');await expect.poll(()=>bitmapSnapshot(page),{timeout:20000}).not.toBe(before);await page.waitForTimeout(title==='Maze Carver'?6000:1000);await page.keyboard.press('Space');await waitBitmapFrame(page);await bitmapKey(page,'Tab');await page.screenshot({path:test.info().outputPath(`native-${host}-playful.png`),fullPage:true});const paused=await bitmapSnapshot(page);await bitmapKey(page,'h');await bitmapKey(page,'h');expect(await bitmapSnapshot(page)).toBe(paused);await exitNativeBitmap(page);
});
