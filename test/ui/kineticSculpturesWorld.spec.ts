import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,waitBitmapFrame,expectBitmapText,exitNativeBitmap} from './nativeBitmapBrowser';
const sculptures=[
  {host:'pendulum',path:'/p0468',title:'Phase Choir',keys:['2','ArrowRight','Shift+Equal',...Array(8).fill('n')]},
  {host:'tram',path:'/p0469',title:'Traffic Loop',keys:['3','Enter',...Array(8).fill('n')]},
  {host:'clockwork',path:'/p0470',title:'Crank Slider',keys:['c','l','o',...Array(12).fill('n')]},
  {host:'tide',path:'/p0471',title:'Capillary Front',keys:[...Array(32).fill('n'),'ArrowRight','Enter',...Array(12).fill('n')]},
  {host:'signals',path:'/p0472',title:'Learning Line',keys:['b','ArrowRight','Enter','c',...Array(12).fill('n')]},
  {host:'relay',path:'/p0473',title:'Sorting Circuit',keys:['v']},
];
for(const app of sculptures)test(`native ${app.title} edits and advances its simulation`,async({page})=>{
  test.setTimeout(210_000);
  await runNativeBitmap(page,app.host,app.path,app.title);
  const initial=await bitmapSnapshot(page);
  for(const key of app.keys)await bitmapKey(page,key,false);
  await expect.poll(()=>bitmapSnapshot(page)).not.toBe(initial);
  if(app.title==='Sorting Circuit'){
    await expectBitmapText(page,'PROVED: ALL64 BINARY INPUTS',0,145);
    await bitmapKey(page,'d',false);await bitmapKey(page,'v',false);
    await expectBitmapText(page,'FAIL MASK',0,145);
    await bitmapKey(page,'f',false);
    for(let i=0;i<15;i++)await bitmapKey(page,'n',false);
    await expectBitmapText(page,'THIS INPUT NOT SORTED',0,145);
  }
  await bitmapKey(page,'Tab');
  await page.screenshot({path:test.info().outputPath(`native-${app.host}-sculpture.png`),fullPage:true});
  await page.keyboard.press('h');await expectBitmapText(page,'H:BACK',0,153);
  await page.keyboard.press('h');await waitBitmapFrame(page);
  await expectBitmapText(page,app.title,0,1);
  await exitNativeBitmap(page);
});
