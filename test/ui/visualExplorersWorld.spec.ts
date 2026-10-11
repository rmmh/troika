import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,exitNativeBitmap,bitmapCanvas,waitBitmapFrame,expectBitmapText} from './nativeBitmapBrowser';
const apps=[['comet','/p0444','Fractal Navigator'],['bottles','/p0445','Liquid Lanterns'],['pottery','/p0446','Raster Carousel'],['lenses','/p0447','Hidden Depth Studio'],['crystal','/p0448','Crystal Garden'],['ecology','/p0449','Reaction Canvas']]as const;
for(const[host,path,title]of apps)test(`native ${title} draws, changes and returns to the web`,async({page})=>{
  test.setTimeout(150_000);
  const ready=async()=>{if(title!=='Reaction Canvas')await expectBitmapText(page,'READY',0,145);};
  await runNativeBitmap(page,host,path,title);await ready();
  if(title==='Fractal Navigator'){
    await bitmapKey(page,'z');await ready();await bitmapKey(page,'ArrowRight');await ready();
  }else if(title==='Liquid Lanterns'){
    await bitmapKey(page,'3');await expectBitmapText(page,'3',30,10);await bitmapKey(page,'ArrowLeft');await ready();
  }else if(title==='Raster Carousel'){
    await bitmapKey(page,'t');await ready();await bitmapKey(page,'z');await ready();
    for(let i=0;i<16;i++)await bitmapKey(page,'n',false);await ready();
  }else if(title==='Hidden Depth Studio'){
    await bitmapKey(page,'v');await ready();
  }else{
    const before=await bitmapSnapshot(page);await page.keyboard.press('g');
    await expect.poll(()=>bitmapSnapshot(page),{timeout:20000}).not.toBe(before);
    await page.waitForTimeout(title==='Crystal Garden'?7000:2000);
    await page.keyboard.press('Space');await waitBitmapFrame(page);
  }
  await bitmapKey(page,'Tab');await page.screenshot({path:test.info().outputPath(`native-${host}-visual.png`),fullPage:true});
  const before=await bitmapSnapshot(page);await page.keyboard.press('h');
  await expect.poll(()=>bitmapSnapshot(page),{timeout:20000}).not.toBe(before);
  await page.keyboard.press('h');await waitBitmapFrame(page);await ready();
  await expect(bitmapCanvas(page)).toBeVisible();await exitNativeBitmap(page);
});
