import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,waitBitmapFrame,expectBitmapText,exitNativeBitmap} from './nativeBitmapBrowser';
const sculptures=[
  {host:'pendulum',path:'/p0468',title:'Phase Choir',controls:'1..8 PICK ARROWS RATE +/- K',keys:['2','ArrowRight','Shift+Equal',...Array(8).fill('n')]},
  {host:'tram',path:'/p0469',title:'Traffic Loop',controls:'1..8 PICK ENTER JAM B BRAKE',keys:['3','Enter',...Array(8).fill('n')]},
  {host:'clockwork',path:'/p0470',title:'Crank Slider',controls:'C CRANK L ROD O OFFSET ENT',keys:['c','l','o',...Array(12).fill('n')]},
  {host:'tide',path:'/p0471',title:'Capillary Front',controls:'ARROWS ENTER PORE B WALL S',keys:[...Array(32).fill('n'),'ArrowRight','Enter',...Array(12).fill('n')]},
  {host:'signals',path:'/p0472',title:'Learning Line',controls:'A/B PICK ARROWS ENTER C +/-',keys:['b','ArrowRight','Enter','c',...Array(12).fill('n')]},
  {host:'relay',path:'/p0473',title:'Sorting Circuit',controls:'ARROWS SLOT E MODE V TEST',keys:['v']},
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
    await expectBitmapText(page,'THIS INPUT NOT SORTED',0,130);
  }
  await bitmapKey(page,'Tab');
  await expectBitmapText(page,app.controls,0,10);
  if(app.title==='Traffic Loop')await expectBitmapText(page,'3',108,145);
  await waitBitmapFrame(page);
  await page.screenshot({path:test.info().outputPath(`native-${app.host}-sculpture.png`),fullPage:true});
  await page.keyboard.press('h');await expectBitmapText(page,'H:BACK',0,153);
  await page.keyboard.press('h');await waitBitmapFrame(page);
  await expectBitmapText(page,app.title,0,1);
  await exitNativeBitmap(page);
});
