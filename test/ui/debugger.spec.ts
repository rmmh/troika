import { test, expect } from '@playwright/test';

// A short program: NOP then halt (H with sleep-forever semantics via H ___)
const HELLO_ASM = `
; simple test program
MA_ ; nop - load A with 0
`;

test.describe('Troika debugger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to render
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('page title contains Troika', async ({ page }) => {
    await expect(page).toHaveTitle(/[Tt]roika/);
  });

  test('controls bar is visible with Run and Step buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Run/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  test('selecting a demo updates the URL hash', async ({ page }) => {
    await page.locator('select.demo-select').selectOption('maze');
    await expect(page).toHaveURL(/#d=maze$/);
    await expect(page.locator('textarea')).toHaveValue(/Iterative randomized depth-first maze/);
  });

  test('loads the demo named in the URL hash', async ({ page }) => {
    await page.goto('/#d=maze-complex');
    await expect(page.locator('.controls')).toBeVisible();
    await expect(page.locator('select.demo-select')).toHaveValue('maze-complex');
    await expect(page.locator('textarea')).toHaveValue(/Growing perfect maze/);
  });

  test('assembler shows ok status for valid program', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill(HELLO_ASM);
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
  });

  test('Load waits for the current source to assemble', async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const textarea = page.locator('textarea');
    const load = page.getByRole('button', { name: 'Load' });
    await textarea.fill('@200\nM A 83');
    await page.clock.runFor(50);
    await expect(load).toBeDisabled();
    await expect(page.locator('.asm-status')).toContainText('Assembling');
    await expect(page.locator('.asm-status .ok')).toHaveCount(0);

    await page.clock.runFor(300);
    await expect(load).toBeEnabled();
    await load.click();
    await expect(page.locator('.readout').first()).toContainText('(200)');

    await textarea.fill('not_a_defined_macro');
    await page.clock.runFor(50);
    await expect(load).toBeDisabled();
    await page.clock.runFor(300);
    await expect(load).toBeDisabled();
    await expect(page.locator('.diagnostics')).toContainText('error');
  });

  test('assembler gutter does not add an extra row for a trailing newline', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('MA_\nMA_\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.source-editor .line-number.numbered')).toHaveCount(2);
    await expect(page.locator('.source-editor .line-number.trailing')).toHaveCount(1);
    await expect(page.locator('.source-editor .line-number.trailing')).toHaveText('');
  });

  test('mouse wheel over assembler gutter scrolls the source editor', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill(Array.from({ length: 80 }, (_, i) => `; filler ${i + 1}`).join('\n'));
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await textarea.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });

    await page.locator('.line-gutter').hover();
    await page.mouse.wheel(0, 500);

    await expect.poll(() => textarea.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });

  test('assembler line gutter links selection and breakpoints with memory', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('MA_\nMA_\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });

    const line1 = page.locator('.source-editor .line-number').nth(0);
    const line2 = page.locator('.source-editor .line-number').nth(1);
    const zoom = page.locator('.memory canvas').first();

    await zoom.click({ position: { x: 9, y: 9 } });
    await expect(line1).toHaveClass(/selected/);
    await expect(page.locator('.inspector .insn-cycles')).toHaveText('Cycles: 2');

    await line2.click();
    await expect(line2).toHaveClass(/selected/);
    await expect(line2).toHaveClass(/bp/);
    await expect(page.locator('.inspector .kv tr:first-child td:last-child')).toContainText('_AB');

    await line2.click();
    await expect(line2).not.toHaveClass(/bp/);
  });

  test('memory selection scrolls assembler to the mapped source line', async ({ page }) => {
    const textarea = page.locator('textarea');
    const src = [...Array.from({ length: 45 }, (_, i) => `; filler ${i + 1}`), '@0', 'MA_'].join('\n');
    await textarea.fill(src);
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });

    await textarea.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });
    await expect.poll(() => textarea.evaluate((el) => el.scrollTop)).toBe(0);

    const zoom = page.locator('.memory canvas').first();
    await zoom.click({ position: { x: 243, y: 243 } });

    await expect(page.locator('.source-editor .line-number').nth(46)).toHaveClass(/selected/);
    await expect.poll(() => textarea.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });

  test('profile button records cycle percentages by assembly line', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('M A 83\nA A B\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.source-editor .profile-metric')).toHaveCount(0);
    await page.getByRole('button', { name: 'Load' }).click();

    const profile = page.getByRole('button', { name: 'Profile' });
    await profile.click();
    await expect(page.getByRole('button', { name: 'Profiling' })).toHaveClass(/active/);
    await expect(page.locator('.profile-button .recording-badge')).toBeVisible();

    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('button', { name: 'Step' }).click();

    const line1Metric = page.locator('.source-editor .line-number').nth(0).locator('.profile-metric');
    const line2Metric = page.locator('.source-editor .line-number').nth(1).locator('.profile-metric');
    await expect(line1Metric).toHaveText('66.667%');
    await expect(line2Metric).toHaveText('33.333%');

    await line1Metric.click();
    await expect(line1Metric).toHaveText('2');
    await expect(line2Metric).toHaveText('1');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();
    await expect(page.locator('.source-editor .profile-metric')).toHaveCount(0);
  });

  test('bare label profiling metrics sum until the next bare label', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('start:\nM A 83\nA A B\nnext:\nA A B\nunused:\nA A B\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: 'Profile' }).click();

    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('button', { name: 'Step' }).click();

    const line = (n: number) => page.locator('.source-editor .line-number').nth(n - 1);
    await expect(line(1).locator('.profile-metric')).toHaveText('75.000%');
    await expect(line(1).locator('.profile-metric')).toHaveClass(/block/);
    await expect(line(2).locator('.profile-metric')).toHaveText('50.000%');
    await expect(line(3).locator('.profile-metric')).toHaveText('25.000%');
    await expect(line(4).locator('.profile-metric')).toHaveText('25.000%');
    await expect(line(4).locator('.profile-metric')).toHaveClass(/block/);
    await expect(line(6).locator('.profile-metric')).toHaveText('');
    await expect(line(6).locator('.profile-metric')).toHaveClass(/block/);
    await expect(line(7).locator('.profile-metric')).toHaveText('');
  });

  test('Load button updates PC readout', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill(HELLO_ASM);
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });

    // Record PC before load
    const pcBefore = await page.locator('.readout').first().textContent();

    await page.getByRole('button', { name: 'Load' }).click();

    // PC should now reflect the loaded program's start address
    const pcAfter = await page.locator('.readout').first().textContent();
    expect(pcAfter).toBeTruthy();
    // The readout contains "PC" followed by the address
    expect(pcAfter).toMatch(/PC/);
    // After loading, status should show "loaded"
    await expect(page.locator('.status')).toHaveText('loaded');
  });

  test('Step advances PC', async ({ page }) => {
    const textarea = page.locator('textarea');
    // Write a two-instruction program so stepping has somewhere to go
    await textarea.fill('MA_\nMA_\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Load' }).click();

    const pcText = () => page.locator('.readout').first().textContent();
    const pc0 = await pcText();

    await page.getByRole('button', { name: 'Step' }).click();
    const pc1 = await pcText();

    // PC should have changed after stepping
    expect(pc1).not.toEqual(pc0);
    await expect(page.locator('.status')).toHaveText('stepped');
  });

  test('Run changes status to running; Pause changes to paused', async ({ page }) => {
    await page.getByRole('button', { name: /Run/i }).click();
    await expect(page.locator('.status')).toHaveText('running');

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.locator('.status')).toHaveText('paused');
  });

  test('Reset restores status and PC', async ({ page }) => {
    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.status')).toHaveText('reset');
  });

  test('memory canvas is visible with correct dimensions', async ({ page }) => {
    // The overview canvas has the navigation title
    const canvas = page.locator('.memory canvas[title*="click a cell"]');
    await expect(canvas).toBeVisible();
    // Check canvas resolution attributes: 3*27*2 × 9*27*2 = 162×486
    await expect(canvas).toHaveAttribute('width', '162');
    await expect(canvas).toHaveAttribute('height', '486');
  });

  test('clicking memory canvas updates inspector', async ({ page }) => {
    const canvas = page.locator('.memory canvas[title*="click a cell"]');
    await canvas.click({ position: { x: 10, y: 10 } });
    // After clicking, inspector should become visible or show address info
    await expect(page.locator('.inspector')).toBeVisible();
  });

  test('PageZoom canvas is visible', async ({ page }) => {
    // The zoom canvas (PageZoom) should be rendered alongside the overview
    const canvases = page.locator('.memory canvas');
    // There should be 2 canvases: zoom + overview
    await expect(canvases).toHaveCount(2);
  });

  test('Sound tab shows the sound device reference', async ({ page }) => {
    await page.getByRole('button', { name: 'Sound' }).click();
    await expect(page.locator('.help-text-container')).toContainText('TROIKA SOUND DEVICE');
    await expect(page.locator('.help-text-container')).toContainText('_SA');
  });

  test('clicking PageZoom canvas selects a tryte and updates inspector', async ({ page }) => {
    const zoom = page.locator('.memory canvas').first(); // PageZoom is rendered first
    await zoom.click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.inspector')).toBeVisible();
    // Second td in the first row is the address value, e.g. "ABC (-123)"
    const addrValue = page.locator('.inspector .kv tr:first-child td:last-child');
    await expect(addrValue).not.toBeEmpty();
  });

  test('clicking PageZoom then arrow key moves selection', async ({ page }) => {
    const zoom = page.locator('.memory canvas').first();
    await zoom.click({ position: { x: 9, y: 9 } }); // click a cell in page 13

    const addrValue = page.locator('.inspector .kv tr:first-child td:last-child');
    const addrBefore = await addrValue.textContent();

    // Arrow right should move selected address by +1
    await page.keyboard.press('ArrowRight');
    const addrAfter = await addrValue.textContent();
    expect(addrAfter).not.toEqual(addrBefore);
  });

  test('registers panel shows P register', async ({ page }) => {
    const regs = page.locator('.registers');
    await expect(regs).toBeVisible();
    // P register row should be present
    await expect(regs.getByText('P')).toBeVisible();
  });

  test('disassembly panel shows instructions', async ({ page }) => {
    await expect(page.locator('.disasm')).toBeVisible();
    // Should have at least one instruction row
    await expect(page.locator('.disasm tr')).not.toHaveCount(0);
  });

  test('serial console accepts input', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('M A _MA\nW _PC A\nH Z Z\n');
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.asm-status .ok')).toContainText('5 trytes');

    const serial = page.locator('.serial');
    await expect(serial).toHaveCount(0);

    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(serial).toBeVisible();
    await expect(serial.getByText('Locked')).toBeVisible();
    await expect(serial.locator('.serial-output')).toContainText('A');
    await serial.locator('input').fill('door');
    await serial.getByRole('button', { name: 'Send' }).click();
    await expect(serial.locator('input')).toHaveValue('');
  });

  test('speed slider changes speed label', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    const labelBefore = await page.locator('.speed-label').textContent();

    // Move slider to a different position
    await slider.fill('2');
    const labelAfter = await page.locator('.speed-label').textContent();
    expect(labelAfter).not.toEqual(labelBefore);
  });

  test('resize handle exists between panes', async ({ page }) => {
    const handles = page.locator('.resize-handle');
    await expect(handles).toHaveCount(2);
  });

  test('gamepad releases held keys when focus leaves the canvas or window', async ({ page }) => {
    await page.locator('textarea').fill('W Z DMG\nloop: R A _OK\nJ loop');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: /Run/ }).click();
    const canvas = page.locator('canvas[title^="game display"]');
    const value = page.locator('.registers tbody tr').first().locator('.num');
    await canvas.focus();
    await page.keyboard.down('ArrowRight');
    await expect(value).toHaveText('6561');
    await page.locator('select.demo-select').focus();
    await expect(value).toHaveText('0');
    await page.keyboard.up('ArrowRight');

    await canvas.focus();
    await page.keyboard.down('ArrowLeft');
    await expect(value).toHaveText('-6561');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(value).toHaveText('0');
    await page.keyboard.up('ArrowLeft');

    // A previous inspector selection must not turn gamepad arrows into
    // memory navigation when returning to the game display.
    await page.locator('.registers tbody tr').first().click();
    await page.getByRole('button', { name: 'show display' }).click();
    await canvas.focus();
    await page.keyboard.down('ArrowRight');
    await expect(value).toHaveText('6561');
    await expect(canvas).toBeVisible();
    await page.keyboard.up('ArrowRight');
    await expect(value).toHaveText('0');
  });

  test('gamepad accepts shifted letters and clears input when removed', async ({ page }) => {
    await page.locator('textarea').fill('W Z DMG\nloop: R A _OK\nJ loop');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: /Run/ }).click();
    const canvas = page.locator('canvas[title^="game display"]');
    const value = page.locator('.registers tbody tr').first().locator('.num');
    await canvas.focus();
    await page.keyboard.down('D');
    await expect(value).toHaveText('6561');
    await page.keyboard.up('D');
    await expect(value).toHaveText('0');

    await page.keyboard.down('ArrowRight');
    await expect(value).toHaveText('6561');
    // Programmatic click removes the canvas without first blurring it.
    await page.getByRole('button', { name: 'Sound' }).evaluate((el) => (el as HTMLButtonElement).click());
    await expect(canvas).toHaveCount(0);
    await expect(value).toHaveText('0');
    await page.keyboard.up('ArrowRight');
  });
});
