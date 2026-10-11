import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
import {COURT_GAMES} from '../../src/world/software/courtGames';
import {courtGamesReference} from '../courtGamesReference';
function chooser(page:Page,columns:number){let cursor=0;return async(square:number)=>{const dr=Math.floor(square/columns)-Math.floor(cursor/columns),dc=square%columns-cursor%columns;for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');cursor=square;await page.keyboard.press('Enter');};}
const endings=['King escaped: defenders win','All eight sums are correct!','Every court square is lit!','A pushed two off: A wins!','All sixteen cards are home!','A wins the capture table!'];
for(const [index,app]of COURT_GAMES.entries())test(`${app.title} completes a native keyboard winning replay`,async({page})=>{
 test.setTimeout(300_000);
 const screen=await runNativeSoftware(page,app.site,`/p${String(app.number-1).padStart(4,'0')}`,app.title),choose=chooser(page,app.columns),model=courtGamesReference(app.id)!,example=app.examples[0]!;
 let captured=false;
 for(const [n,square]of example.moves.entries()){
  await choose(square);model.play(square);
  // Logical ASCII stays available even when native palette colors highlight pieces.
  await expect.poll(async()=>((await screen.textContent())??'').replace(/[\s\[\]]/g,'').includes(model.board.replace(/\s/g,''))).toBe(true);
  await expect(screen).toContainText(`Moves: ${model.moves}`);
  if(!captured&&n>=example.moves.length/2){captured=true;await page.screenshot({path:test.info().outputPath(`native-${app.id}-play.png`),fullPage:true});}
 }
 for(let i=0;i<(example.steps??0);i++){await page.keyboard.type('N');model.key('n');}
 expect(model.status).toBe(1);await expect(screen).toContainText(endings[index]!);
 await page.screenshot({path:test.info().outputPath(`native-${app.id}-win.png`),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
