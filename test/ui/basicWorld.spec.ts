import { launchNativeSoftware as launch } from './softwareBrowser';
import { expect, test } from '@playwright/test';

test('Cannon Range exposes its controls and plays from the keyboard',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'scorebook','/p0170','Cannon Range');
  await expect(screen).toContainText('Enter:edit N:fire R:restart');
  for(let i=0;i<3;i++)await page.keyboard.press('Enter');
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  for(let i=0;i<4;i++)await page.keyboard.press('Enter');
  await page.keyboard.type('n');
  await expect(screen).toContainText('Direct hit! R to retry');
  await expect(screen).toContainText(/Shots:\s+1/);
  await page.screenshot({path:test.info().outputPath('native-cannon-range.png'),fullPage:true});
  await page.keyboard.type('r');await expect(screen).toContainText('Edit X/Y; target is 84');
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('Rooftop Lemonade presents a complete keyboard-playable season',async({page})=>{
  test.setTimeout(150_000);
  const screen=await launch(page,'menus','/p0174','Rooftop Lemonade');
  let row=0;
  for(const next of [4,3,5,4,5,3,5,4]) {
    for(let i=0;i<Math.abs(next-row);i++)await page.keyboard.press(next>row?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');row=next;
  }
  await expect(screen).toContainText('You earned the ribbon!');
  await expect(screen).toContainText(/Days:\s+8/);
  await expect(screen).toContainText(/C\s+A\s+S\s+H\s+0\s+1\s+7\s+5/);
  await page.screenshot({path:test.info().outputPath('native-rooftop-lemonade.png'),fullPage:true});
  await page.keyboard.type('r');await expect(screen).toContainText('Eight days; aim for 170');
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
