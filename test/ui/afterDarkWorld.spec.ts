import {expect,test,type Page,type Locator} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
import {AFTERNOON_SOLUTION,DINNER_CELLS,DINNER_TARGET} from '../afterDarkGamesReference';
async function command(page:Page,screen:Locator,text:string){
 await page.keyboard.press('c');await expect(screen).toContainText('Enter:keep F1:cancel');
 await page.keyboard.type(text);await page.keyboard.press('Enter');
 await expect(screen).toContainText('Enter:edit S:save L:load');
}
async function reopen(page:Page,title:string){
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
 await page.keyboard.type('4');await expect(page.getByRole('status')).toHaveText('Program path');
 await page.keyboard.type('/game');await page.keyboard.press('Enter');
 const screen=page.getByTestId('world-screen');await expect(screen).toContainText(title);await expect(screen).toContainText('Loaded from disk');
}

test('parser adventure preserves combined objects and its ending across saved native launches',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'lostfound','/p0214','Misplaced Afternoon');
 for(const text of AFTERNOON_SOLUTION.slice(0,10))await command(page,screen,text);
 await expect(screen).toContainText('Bag: key lamp');await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');
 await reopen(page,'Misplaced Afternoon');await expect(screen).toContainText('Room: Courtyard');await expect(screen).toContainText('Bag: key lamp');
 for(const text of AFTERNOON_SOLUTION.slice(10))await command(page,screen,text);
 await expect(screen).toContainText('You have your time back');
 await page.keyboard.press('s');await expect(screen).toContainText('Saved to disk');await reopen(page,'Misplaced Afternoon');await expect(screen).toContainText('You have your time back');
 await page.screenshot({path:test.info().outputPath('native-afternoon-restored-ending.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Dinner Seating explains a conflict and accepts a keyboard rearrangement',async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,'otto','/p0215','Dinner Seating');await page.keyboard.press('n');await expect(screen).toContainText('Cy must sit opposite Hal');
 let cursor=0;const choose=async(square:number)=>{
  const dr=Math.floor(square/5)-Math.floor(cursor/5),dc=square%5-cursor%5;
  for(let i=0;i<Math.abs(dr);i++)await page.keyboard.press(dr<0?'ArrowUp':'ArrowDown');
  for(let i=0;i<Math.abs(dc);i++)await page.keyboard.press(dc<0?'ArrowLeft':'ArrowRight');
  cursor=square;await page.keyboard.press('Enter');
 };
 const seats=Array.from({length:8},(_,i)=>i);
 for(let i=0;i<8;i++){const other=seats.indexOf(DINNER_TARGET[i]!);if(i===other)continue;await choose(DINNER_CELLS[i]!);await expect(screen).toContainText('Choose another guest');await choose(DINNER_CELLS[other]!);[seats[i],seats[other]]=[seats[other]!,seats[i]!];}
 await page.keyboard.press('n');await expect(screen).toContainText('Everyone enjoys the dinner!');await expect(screen).toContainText('Swaps: 4');
 await page.screenshot({path:test.info().outputPath('native-dinner-seating-solved.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
