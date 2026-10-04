import { HOTEL_SOLUTION } from '../neighborhoodGamesReference';
import { expect, test } from '@playwright/test';
import { launchNativeSoftware as launch } from './softwareBrowser';

test('Receipt Adder computes exact decimals and recovers after invalid input',async({page})=>{
 test.setTimeout(150_000);
 const screen=await launch(page,'enzo','/p0209','Receipt Adder');
 const input='3.25 1.40 -0.50';
 await page.keyboard.type(input);await page.keyboard.press('Enter');
 await expect(screen).toContainText('items=3 total=4.15');
 await page.screenshot({path:test.info().outputPath('native-receipt-adder.png'),fullPage:true});
 for(let i=0;i<input.length;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('98.41 0.01');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Invalid input');
 for(let i=0;i<10;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('0.01 0.09');await page.keyboard.press('Enter');
 await expect(screen).toContainText('items=2 total=0.10');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Ferry Timetable carries eleven passengers through its keyboard schedule',async({page})=>{
 test.setTimeout(150_000);
 const screen=await launch(page,'ferry','/p0202','Ferry Timetable');
 for(let i=0;i<5;i++)await page.keyboard.press('ArrowDown');
 for(let trip=0;trip<4;trip++){
  await page.keyboard.press('Enter');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  if(trip<3)await page.keyboard.press('ArrowUp');
 }
 await expect(screen).toContainText('Timetable target achieved!');
 await expect(screen).toContainText(/Ticks:\s+8/);
 await page.screenshot({path:test.info().outputPath('native-ferry-timetable.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Hotel Elevator shows passengers and delivers a full keyboard route',async({page})=>{
 test.setTimeout(150_000);
 const screen=await launch(page,'hotel','/p0200','Hotel Elevator');
 let row=0,column=0;
 for(const square of HOTEL_SOLUTION){
  const r=Math.floor(square/8),c=square%8;
  for(let i=0;i<Math.abs(r-row);i++)await page.keyboard.press(r>row?'ArrowDown':'ArrowUp');
  for(let i=0;i<Math.abs(c-column);i++)await page.keyboard.press(c>column?'ArrowRight':'ArrowLeft');
  await page.keyboard.press('Enter');row=r;column=c;
 }
 await expect(screen).toContainText(/Steps:\s+9/);
 await expect(screen).toContainText('All guests delivered!');
 await page.screenshot({path:test.info().outputPath('native-hotel-elevator.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Three-Ink Print combines independent plates into a read-only proof',async({page})=>{
 test.setTimeout(150_000);
 const screen=await launch(page,'matchbox','/p0205','Three-Ink Print');
 let column=0;
 for(const squares of [[0,3,4,6],[1,3,5,6],[2,4,5,6]]){
  for(const next of squares){
   for(let i=0;i<Math.abs(next-column);i++)await page.keyboard.press(next>column?'ArrowRight':'ArrowLeft');
   await page.keyboard.press('Enter');column=next;
  }
  await page.keyboard.press('n');
 }
 await expect(screen).toContainText('Proof: R G B K are mixtures');
 await expect(screen).toContainText(/Y\s+M\s+C\s+R\s+G\s+B\s+\[K\]/);
 await expect(screen).toContainText(/Edits:\s+12/);
 await page.keyboard.press('Enter');await expect(screen).toContainText(/Edits:\s+12/);
 await page.screenshot({path:test.info().outputPath('native-three-ink-proof.png'),fullPage:true});
 await page.keyboard.press('r');await expect(screen).toContainText(/Edits:\s+0/);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
