import {test,expect} from '@playwright/test';
import {sceneWinningPath} from '../arcadeScenesReference';
const winningKeys=(index:number)=>sceneWinningPath(index).map(k=>({83:'ArrowLeft',84:'ArrowRight',89:'ArrowUp',90:'ArrowDown',88:'Enter',110:'n'}[k]!));
import {runNativeBitmap,bitmapKey,bitmapSnapshot,waitBitmapFrame,expectBitmapText,exitNativeBitmap} from './nativeBitmapBrowser';

const games=[
  {host:'ferry',path:'/p0462',title:'River Rush',keys:winningKeys(0),controls:'ARROWS HOP; N WAIT ONE TICK',win:'THREE HOME! R NEW CROSSING'},
  {host:'lighthouse',path:'/p0463',title:'City Shields',keys:['Enter','n','n','n'],controls:'ARROWS AIM ENTER BURST'},
  {host:'basalt',path:'/p0464',title:'Ridge Rider',keys:['ArrowRight','n','n','n','ArrowDown'],controls:'LEFT/RIGHT LEAN DOWN BRAKE'},
  {host:'clockwork',path:'/p0465',title:'Clockwork Climber',keys:['ArrowRight','Enter','n','n','n','ArrowDown'],controls:'ARROWS RUN/STOP ENTER JUMP'},
  {host:'tide',path:'/p0466',title:'Harbor Catch',keys:['ArrowLeft','ArrowLeft','n','n'],controls:'LEFT/RIGHT SAIL ENTER DOCK'},
  {host:'gallery',path:'/p0467',title:'Territory Trace',keys:winningKeys(5),controls:'ARROWS TRACE N WAIT G RUN',win:'TERRITORY WON! R NEW FIELD'},
];
for(const game of games)test(`native ${game.title} plays, animates and returns to Web`,async({page})=>{
  test.setTimeout(180_000);
  await runNativeBitmap(page,game.host,game.path,game.title);
  await expectBitmapText(page,game.title,0,1);
  await expectBitmapText(page,game.controls,0,10);
  const initial=await bitmapSnapshot(page);
  // Steering can change velocity without moving the picture until the next tick.
  for(const key of game.keys)await bitmapKey(page,key,false);
  await expect.poll(()=>bitmapSnapshot(page)).not.toBe(initial);
  if(game.win){await expectBitmapText(page,game.win,0,145);}else{
  const beforeRun=await bitmapSnapshot(page);
  await page.keyboard.press('g');
  await expect.poll(()=>bitmapSnapshot(page),{timeout:20_000}).not.toBe(beforeRun);
  await page.keyboard.press('Space');await waitBitmapFrame(page);
  }
  await bitmapKey(page,'Tab');
  await page.screenshot({path:test.info().outputPath(`native-${game.host}-arcade.png`),fullPage:true});
  await page.keyboard.press('h');await expectBitmapText(page,'H:BACK',0,153);
  await page.keyboard.press('h');await waitBitmapFrame(page);
  await expectBitmapText(page,game.controls,0,10);
  await exitNativeBitmap(page);
});
