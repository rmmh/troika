import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
import {brickSolution,patrolSolution,RAIL_SOLUTION,SUM_CELLS,SUM_SOLUTION,dominoReference} from '../terminalArcadeReference';
function chooser(page:Page,columns:number){let cursor=0;const aim=async(square:number)=>{const dr=Math.floor(square/columns)-Math.floor(cursor/columns),dc=square%columns-cursor%columns;for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');cursor=square;};return{aim,choose:async(square:number)=>{await aim(square);await page.keyboard.press('Enter');}};}
async function exit(page:Page){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');}
test('Brick Breaker clears twelve bricks through deliberate paddle choices',async({page})=>{
 test.setTimeout(240_000);const screen=await launch(page,'basalt','/p0256','Brick Breaker'),{choose}=chooser(page,8);let ticks=0;
 for(const action of brickSolution()){if(action<0){await page.keyboard.press('n');await expect(screen).toContainText(`Ticks: ${++ticks}`);}else await choose(action);if(ticks===20)await page.screenshot({path:test.info().outputPath('native-brick-progress.png'),fullPage:true});}
 await expect(screen).toContainText('Every brick cleared!');await page.screenshot({path:test.info().outputPath('native-brick-win.png'),fullPage:true});await exit(page);
});
test('Star Patrol clears raiders, collects a cache and returns to its dock',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'comet','/p0257','Star Patrol'),{choose,aim}=chooser(page,5);let turns=0;
 for(const action of patrolSolution()){if(action.fire){await aim(action.square);await page.keyboard.press('f');}else await choose(action.square);await expect(screen).toContainText(`Turns: ${++turns}`);if(turns===6)await page.screenshot({path:test.info().outputPath('native-patrol-mission.png'),fullPage:true});}
 await expect(screen).toContainText('Raiders cleared; home safe!');await page.screenshot({path:test.info().outputPath('native-patrol-win.png'),fullPage:true});await exit(page);
});
test('Laser Mirrors explains a closed beam loop before a safe two-target exit',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'lenses','/p0258','Laser Mirrors'),{choose}=chooser(page,6);let edits=0;for(const p of[0,3,21]){await choose(p);await expect(screen).toContainText(`Edits: ${++edits}`);}await page.keyboard.press('n');await expect(screen).toContainText('Beam loop: change a mirror');await page.screenshot({path:test.info().outputPath('native-mirror-loop.png'),fullPage:true});await choose(18);await expect(screen).toContainText('Edits: 4');await page.keyboard.press('n');await expect(screen).toContainText('Both targets lit; safe exit');await page.screenshot({path:test.info().outputPath('native-mirror-win.png'),fullPage:true});await exit(page);
});
test('Siding Shunter assembles all five wagons using both two-wagon stacks',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'station','/p0259','Siding Shunter'),{choose}=chooser(page,8);let moves=0;for(const[from,to]of RAIL_SOLUTION){await choose(from!*16);await expect(screen).toContainText('Choose siding or departure');await choose(to!*16);await expect(screen).toContainText(`Moves: ${++moves}`);if(moves===3)await page.screenshot({path:test.info().outputPath('native-siding-stacks.png'),fullPage:true});}await expect(screen).toContainText('A B C D E train assembled!');await page.screenshot({path:test.info().outputPath('native-siding-win.png'),fullPage:true});await exit(page);
});
test('Fifteen Sum selects unused tiles and verifies eight exact line totals',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'ternary','/p0260','Fifteen Sum'),{choose}=chooser(page,7);let edits=0;for(let i=0;i<9;i++)if(![0,4,8].includes(i)){await choose(27+SUM_SOLUTION[i]!);await expect(screen).toContainText('Choose a grid cell');await choose(SUM_CELLS[i]!);await expect(screen).toContainText(`Edits: ${++edits}`);}await page.keyboard.press('n');await expect(screen).toContainText('Every line totals fifteen!');await page.screenshot({path:test.info().outputPath('native-fifteen-win.png'),fullPage:true});await exit(page);
});
test('Domino Chain flips tiles, plays both native hands and resolves blocked pip totals',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'cardtable','/p0261','Domino Chain'),{choose}=chooser(page,6),model=dominoReference();let seed=1;
 for(let step=0;step<30&&!model.status;step++){const options=model.options();if(!options.length){await page.keyboard.press('n');model.step();if(!model.status)await expect(screen).toContainText(`Plays: ${model.moves}`);}else{seed=seed*48271%2147483647;const o=options[seed%options.length]!;await choose(o.slot*6);model.play(o.slot*6);await expect(screen).toContainText('Enter L/R end; F flips tile');if(o.flip){await page.keyboard.press('f');model.key('f');}await choose(30+o.side*3);model.play(30+o.side*3);await expect(screen).toContainText(`Plays: ${model.moves}`);}if(step===1)await page.screenshot({path:test.info().outputPath('native-domino-hands.png'),fullPage:true});}
 expect(model.status).toBe(1);await expect(screen).toContainText('Blocked: you win on pips');await page.screenshot({path:test.info().outputPath('native-domino-win.png'),fullPage:true});await exit(page);
});
