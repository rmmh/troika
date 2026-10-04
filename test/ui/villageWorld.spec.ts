import { expect, test } from '@playwright/test';
import { launchNativeSoftware as launch } from './softwareBrowser';
import { JUG_SOLUTION } from '../villageGamesReference';

test('Three-Jug Puzzle pours a complete solution from the keyboard',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'bottles','/p0186','Three-Jug Puzzle');
  let row=0;
  for(const square of JUG_SOLUTION) {
    const next=Math.floor(square/8);
    for(let i=0;i<Math.abs(next-row);i++)await page.keyboard.press(next>row?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');row=next;
  }
  await expect(screen).toContainText('Two equal shares! R retry');
  await page.screenshot({path:test.info().outputPath('native-three-jugs.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Junction Dispatcher routes simultaneous trains safely',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'tram','/p0189','Junction Dispatcher');
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  for(let i=0;i<10;i++)await page.keyboard.press('n');
  await expect(screen).toContainText('Both trains arrived safely');
  await page.screenshot({path:test.info().outputPath('native-junction-dispatcher.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Matchbox Furnisher keeps a walkable room while placing three pieces',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'miniature','/p0193','Matchbox Furnisher');
  for(const key of ['ArrowDown','ArrowRight','Enter','ArrowDown','ArrowRight','Enter','ArrowUp','ArrowRight','Enter'])await page.keyboard.press(key);
  await expect(screen).toContainText('A furnished, walkable room!');
  await expect(screen).toContainText(/Items:\s+3/);
  await page.screenshot({path:test.info().outputPath('native-matchbox-furnisher.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
