import {test,expect} from '@playwright/test';
import {runNativeBitmap,bitmapKey,bitmapSnapshot,waitBitmapFrame,expectBitmapText,exitNativeBitmap} from './nativeBitmapBrowser';
const puzzles=[
  {host:'jun',path:'/p0474',title:'Planar Untangler',keys:['2','ArrowLeft','ArrowLeft','ArrowUp','ArrowUp']},
  {host:'miniature',path:'/p0475',title:'Shadow Blocks',keys:['ArrowLeft','ArrowUp','Enter','ArrowRight','Enter','ArrowLeft','ArrowDown','Enter','ArrowUp','z','Enter','ArrowDown','Enter','z','Enter'],win:['SOLVED',60,145] as const},
  {host:'lenses',path:'/p0476',title:'Inversion Lens',keys:['b','b','Shift+Equal','Shift+Equal']},
  {host:'stamps',path:'/p0477',title:'Boolean Stencil Studio',keys:['b','b']},
  {host:'paper',path:'/p0478',title:'Folded Ribbon',keys:['Enter','ArrowRight','ArrowRight','Enter','ArrowRight','Enter'],win:['FOLDED STACK MATCHES!',0,145] as const},
  {host:'pottery',path:'/p0479',title:'Triangulation Atelier',keys:[[1,3],[1,4],[1,5],[5,7],[5,8]].flatMap(([a,b])=>[String(a),'Enter',String(b),'Enter']),win:['TRIANGULATED! TRIANGLES:',0,145] as const},
];
for(const puzzle of puzzles)test(`native ${puzzle.title} edits its picture and preserves help`,async({page})=>{
  test.setTimeout(210_000);
  await runNativeBitmap(page,puzzle.host,puzzle.path,puzzle.title);
  const initial=await bitmapSnapshot(page);
  for(const key of puzzle.keys)await bitmapKey(page,key,false);
  await expect.poll(()=>bitmapSnapshot(page)).not.toBe(initial);
  if(puzzle.win){const [text,x,y]=puzzle.win;await expectBitmapText(page,text,x,y);}
  await bitmapKey(page,'Tab');
  await page.screenshot({path:test.info().outputPath(`native-${puzzle.host}-visual-puzzle.png`),fullPage:true});
  await page.keyboard.press('h');await expectBitmapText(page,'H:BACK',0,153);
  await page.keyboard.press('h');await waitBitmapFrame(page);
  if(puzzle.win){const [text,x,y]=puzzle.win;await expectBitmapText(page,text,x,y);}
  await exitNativeBitmap(page);
});
