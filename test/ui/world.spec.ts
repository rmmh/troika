import { expect, test } from '@playwright/test';

test('web world boots native services, accepts physical keys and pauses the whole world', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Paused');
  const cycles = await page.getByTestId('world-cycles').textContent();
  await page.waitForTimeout(200);
  await expect(page.getByTestId('world-cycles')).toHaveText(cycles!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  await page.keyboard.type('dir /'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('net.seq', { timeout: 20_000 });
  await page.keyboard.press('F1');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 20_000 });
  await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Hello from native Forth', { timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas')).not.toBeFocused();
  await expect(page.getByRole('link', { name: 'Machine debugger' })).toHaveAttribute('href', './index.html');
  await page.getByRole('button', { name: 'Restart with fresh disks' }).click();
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.screenshot({ path: test.info().outputPath('world.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('disk checkpoints restore downloaded files and reject incompatible files without losing the session', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  async function command(text: string, result: string) {
    await page.locator('canvas').focus();
    await page.keyboard.type(text);
    await expect(transcript).toContainText(text.slice(-24));
    await page.keyboard.press('Enter');
    await expect(transcript).toContainText(result, { timeout: 30_000 });
  }
  await command('get /readme /kept', 'ok');
  await command('type /kept', 'Files live on the server');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save disks', exact: true }).click();
  const download = await downloadEvent;
  const path = test.info().outputPath('saved.disks'); await download.saveAs(path);
  await expect(page.getByRole('button', { name: 'Save disks', exact: true })).toBeEnabled();
  await command('del /kept', 'ok');
  await command('type /kept', 'error -12');
  const { readFile } = await import('node:fs/promises');
  const invalid = await readFile(path); invalid[0] = 0;
  await page.getByLabel('Disk checkpoint').setInputFiles({ name: 'invalid.disks', mimeType: 'application/octet-stream', buffer: invalid });
  await expect(page.getByRole('alert')).toContainText('mismatch');
  await expect(transcript).toContainText('error -12');
  await page.getByLabel('Disk checkpoint').setInputFiles(path);
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  await command('type /kept', 'Files live on the server');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
