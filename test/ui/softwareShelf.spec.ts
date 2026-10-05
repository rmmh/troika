import { expect, test } from '@playwright/test';

test('software page opens at its introduction and shows a worked example', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const screen = page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites', {timeout:90_000});
  await page.getByRole('button', {name:'F2 · Console', exact:true}).click();
  await page.keyboard.type('open http://ternary.world/s0000');
  await page.keyboard.press('Enter');
  await expect(screen).toContainText('Common divisor', {timeout:30_000});
  await expect(screen).toContainText('Software shelf');
  await expect(screen).toContainText('Try input:');
  await page.screenshot({path:test.info().outputPath('software-example.png'), fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('software-mobile.png'),fullPage:true});
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Native programs for your');
});

test('Atlas software directory leads through a neighborhood to a native shelf', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type('open http://atlas.world/software');await page.keyboard.press('Enter');
  await expect(screen).toContainText('The software directory',{timeout:30_000});
  await expect(screen).toContainText('native programs');
  await page.screenshot({path:test.info().outputPath('native-software-directory.png'),fullPage:true});
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Choose a maker');
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Native programs for your');
  await page.keyboard.press('F1');await expect(screen).toContainText('The Moss Ledger');
  await expect(screen).toContainText('A wall after rain');
});


test('Run links download and start native programs directly, then return to browsing', async ({page}) => {
  test.setTimeout(150_000);
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type('open http://ternary.world/s0000');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Run Common divisor',{timeout:30_000});
  await page.keyboard.press('Enter');
  await expect(screen).toContainText('F1: programs',{timeout:30_000});
  await expect(screen).toContainText('First integer');
  await page.keyboard.type('84');await page.keyboard.press('Tab');await page.keyboard.type('30');await page.keyboard.press('Enter');
  await expect(screen).toContainText(/GCD\s+6/);
  await page.screenshot({path:test.info().outputPath('native-direct-run-gcd.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
  await page.screenshot({path:test.info().outputPath('native-program-menu.png'),fullPage:true});
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:30_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type('open http://ternary.world/s0001');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Run Integer square root',{timeout:30_000});
  await page.keyboard.press('Enter');await expect(screen).toContainText('F1: programs',{timeout:30_000});
  await page.keyboard.type('81');await page.keyboard.press('Enter');
  await expect(screen).toContainText(/Root\s+9/);await expect(screen).toContainText(/Remainder\s+0/);
  await page.screenshot({path:test.info().outputPath('native-direct-run-root.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
