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
  await page.keyboard.press('Enter');
  await expect(screen).toContainText('Native programs for your');
});
