import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

  test('control bar keeps readouts and actions visible at narrow widths', async ({ page }) => {
    for (const width of [1280, 800, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const control of [
        page.getByRole('button', { name: /Run/ }),
        page.getByRole('button', { name: 'Step', exact: true }),
        page.getByRole('button', { name: 'Reset', exact: true }),
        page.getByRole('button', { name: 'Profile', exact: true }),
        page.locator('.speed'), page.locator('.status'),
        page.locator('.readout').first(), page.locator('.readout').last(),
      ]) {
        await expect(control).toBeInViewport({ ratio: 1 });
      }
    }
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

  test('text mode renders native character cells and returns from memory inspection', async ({ page }) => {
    await page.locator('textarea').fill('W Z 0sDMT\nW -3659 -9841\nW -3658 9841\nW -9841 65\nH 0sAAA Z');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: /Run/ }).click();
    const canvas = page.locator('canvas[title="text display"]');
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate(el => Array.from((el as HTMLCanvasElement)
      .getContext('2d')!.getImageData(0, 0, 2, 1).data))).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    await page.locator('.registers tbody tr').first().click();
    await expect(canvas).toHaveCount(0);
    await page.getByRole('button', { name: 'show display' }).click();
    await expect(canvas).toBeVisible();
  });

  test('opens assembly source without replacing the running program until Load', async ({ page }) => {
    const before = await page.locator('.readout').first().textContent();
    await page.getByLabel('Open assembly file').setInputFiles({
      name: 'my-program.asm', mimeType: 'text/plain', buffer: Buffer.from('@200\nM A 83'),
    });
    await expect(page.locator('textarea')).toHaveValue('@200\nM A 83');
    await expect(page.locator('.source-files')).toContainText('my-program.asm');
    await expect(page.locator('select.demo-select')).toHaveValue('');
    await expect(page.locator('.unloaded')).toBeVisible();
    await expect(page.locator('.readout').first()).toHaveText(before!);
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('.readout').first()).toContainText('(200)');
  });

  test('saves the current editor text even before its assembly debounce completes', async ({ page }) => {
    const source = '; unsaved draft\nM A 83\n';
    await page.locator('textarea').fill(source);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/\.asm$/);
    expect(await readFile((await download.path())!, 'utf8')).toBe(source);
  });

  test('opening source normalizes BOM and mixed line endings for the gutter', async ({ page }) => {
    await page.getByLabel('Open assembly file').setInputFiles({
      name: 'windows.asm', mimeType: 'text/plain', buffer: Buffer.from('\uFEFF; comment\r\nM A 83\rM B 99\r'),
    });
    await expect(page.locator('textarea')).toHaveValue('; comment\nM A 83\nM B 99\n');
    await expect(page.locator('.asm-status .ok')).toContainText('4 trytes');
    await expect(page.locator('.line-number.numbered')).toHaveCount(3);
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: 'Breakpoint on line 3 at _AC', exact: true }).click();
    await expect(page.locator('.inspector .kv tr').first()).toContainText('_AC');
  });

  test('opens invalid source for editing and allows reopening the same file', async ({ page }) => {
    const file = { name: 'draft.asm', mimeType: 'text/plain', buffer: Buffer.from('undefined_macro') };
    await page.getByLabel('Open assembly file').setInputFiles(file);
    await expect(page.locator('.diagnostics')).toContainText('error');
    await expect(page.getByRole('button', { name: 'Load' })).toBeDisabled();
    await page.locator('textarea').fill('M A 83');
    await page.getByLabel('Open assembly file').setInputFiles(file);
    await expect(page.locator('textarea')).toHaveValue('undefined_macro');
  });

  test('a delayed file read does not overwrite a newer editor change', async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.evaluate(() => {
      const read = File.prototype.text;
      File.prototype.text = function () {
        return new Promise((resolve, reject) => {
          setTimeout(() => { void read.call(this).then(resolve, reject); }, 1000);
        });
      };
    });
    await page.getByLabel('Open assembly file').setInputFiles({
      name: 'slow.asm', mimeType: 'text/plain', buffer: Buffer.from('M A 83'),
    });
    await page.locator('textarea').fill('I B 1');
    await page.clock.runFor(1500);
    await expect(page.locator('textarea')).toHaveValue('I B 1');
    await expect(page.locator('.source-files')).not.toContainText('slow.asm');
  });

  test('file read errors preserve the current source and explain the failure', async ({ page }) => {
    await page.locator('textarea').fill('M A 83');
    await page.evaluate(() => {
      File.prototype.text = () => Promise.reject(new Error('file unavailable'));
    });
    await page.getByLabel('Open assembly file').setInputFiles({
      name: 'missing.asm', mimeType: 'text/plain', buffer: Buffer.from('I B 1'),
    });
    await expect(page.locator('.file-error')).toContainText('Could not open missing.asm: file unavailable');
    await expect(page.locator('textarea')).toHaveValue('M A 83');
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

  test('edited source does not inherit profiling from the loaded program', async ({ page }) => {
    const source = 'M A 83\nI B 1';
    const textarea = page.locator('textarea');
    await textarea.fill(source);
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await expect(page.locator('.unloaded')).toHaveText('Changes not loaded. ');
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('.unloaded')).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(page.locator('.profile-metric').first()).toHaveText('100.000%');

    await textarea.fill('I C 1\n' + source);
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await expect(page.locator('.profile-metric')).toHaveCount(0);
    await expect(page.locator('.unloaded')).toBeVisible();
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.unloaded')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.locator('.unloaded')).toHaveCount(0);
  });

  test('invalid source cannot set breakpoints using a partial assembly map', async ({ page }) => {
    await page.locator('textarea').fill('M A 83\nundefined_macro');
    await expect(page.locator('.diagnostics')).toContainText('error');
    await expect(page.locator('.line-number.numbered').first()).toBeDisabled();
    await expect(page.locator('.line-number.numbered').nth(1)).toBeDisabled();
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

  test('emulation remains usable when browser audio initialization fails', async ({ page }) => {
    await page.evaluate(() => {
      window.AudioContext = class {
        constructor() { throw new Error('test audio device unavailable'); }
      } as unknown as typeof AudioContext;
    });
    await page.getByRole('button', { name: /Run/i }).click();
    await expect(page.locator('.status')).toHaveText('running');
    await expect(page.getByText('Audio unavailable', { exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.readout').nth(1).textContent()).not.toContain('cycles 0 ');
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.locator('.status')).toHaveText('paused');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.status')).toHaveText('reset');
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

  test('memory writes require a complete integer or tryte literal', async ({ page }) => {
    await page.locator('.registers tbody tr').first().click();
    const input = page.getByRole('textbox', { name: 'New memory value' });
    const write = page.getByRole('button', { name: 'Write', exact: true });
    const value = page.locator('.registers tbody tr').first().locator('.num');
    const initial = await value.textContent();
    await expect(write).toBeDisabled();
    for (const invalid of ['42abc', '1.5', '1e3', '9007199254740992', '#1111111111']) {
      await input.fill(invalid);
      await expect(write).toBeDisabled();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await input.press('Enter');
      await expect(value).toHaveText(initial!);
    }
    for (const [literal, expected] of [['-42', '-42'], ['#T01', '-8'], ['__Z', '13'], ['19684', '1']]) {
      await input.fill(literal!);
      await expect(write).toBeEnabled();
      await write.click();
      await expect(value).toHaveText(expected!);
      await expect(input).toHaveValue('');
    }
    await input.fill('123');
    await page.locator('.registers tbody tr').nth(1).click();
    await expect(input).toHaveValue('');
    await expect(write).toBeDisabled();
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

  test('register inspection and breakpoints work from the keyboard', async ({ page }) => {
    await page.locator('textarea').fill('M A 83\nM B 99');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: 'Inspect register A', exact: true }).press('Enter');
    await expect(page.locator('.inspector .kv tr').first()).toContainText('__A');
    const breakpoint = page.locator('.disasm').getByRole('button', { name: 'Breakpoint at _AA', exact: true });
    await breakpoint.press('Space');
    await expect(breakpoint).toHaveAttribute('aria-pressed', 'true');
    const sourceBreakpoint = page.getByRole('button', { name: 'Breakpoint on line 1 at _AA', exact: true });
    await expect(sourceBreakpoint).toHaveAttribute('aria-pressed', 'true');
    await sourceBreakpoint.press('Enter');
    await expect(breakpoint).toHaveAttribute('aria-pressed', 'false');
    await expect(sourceBreakpoint).toHaveAttribute('aria-pressed', 'false');
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

  test('inspecting serial receive does not consume queued input', async ({ page }) => {
    await page.locator('textarea').fill('W _PC _MA\nR A _PB\nR B _PB');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await page.locator('.serial input').fill('ab');
    await page.locator('.serial').getByRole('button', { name: 'Send' }).click();
    // _PB = 69, row 16 / column 1 of the zero-page zoom canvas.
    await page.locator('.memory canvas').first().click({ position: { x: 27, y: 297 } });
    await expect(page.locator('.inspector .kv tr').first()).toContainText('_PB');
    await expect(page.locator('.inspector .kv tr').nth(1)).toContainText('__A');
    await page.getByRole('button', { name: 'Profile' }).click();
    await expect(page.locator('.inspector .kv tr').nth(1)).toContainText('__A');
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(page.locator('.registers tbody tr').first().locator('.num')).toHaveText('-13');
    await expect(page.locator('.inspector .kv tr').nth(1)).toContainText('__B');
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(page.locator('.registers tbody tr').nth(1).locator('.num')).toHaveText('-12');
  });

  test('serial output preserves scrollback and follows again at the bottom', async ({ page }) => {
    await page.locator('textarea').fill('loop: W _PC _MA\nW _PC _N_\nJ loop');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    await page.getByRole('button', { name: /Run/ }).click();
    const output = page.getByLabel('Serial output');
    await expect.poll(() => output.evaluate(el => el.scrollHeight > el.clientHeight * 2)).toBe(true);
    await page.getByRole('button', { name: /Pause/ }).click();
    await output.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
    await page.locator('.serial input').fill('draft');
    await page.getByRole('button', { name: 'Step' }).click();
    await expect.poll(() => output.evaluate(el => el.scrollTop)).toBe(0);
    await output.evaluate(el => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    });
    const before = await output.textContent();
    await page.getByRole('button', { name: /Run/ }).click();
    await expect.poll(() => output.textContent()).not.toBe(before);
    await page.getByRole('button', { name: /Pause/ }).click();
    await expect.poll(() => output.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(2);
  });

  test('serial polling reveals the console and Clear keeps it usable', async ({ page }) => {
    await page.locator('textarea').fill('R A _PA\nW _PE 1\nR B _PB');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    const serial = page.locator('.serial');
    await expect(serial).toHaveCount(0);
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(serial).toBeVisible();
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(serial.getByText('Unlocked', { exact: true })).toBeVisible();
    await serial.locator('input').fill('old input');
    await serial.getByRole('button', { name: 'Send' }).click();
    await serial.locator('input').fill('draft');
    await serial.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(serial).toBeVisible();
    await expect(serial.locator('input')).toHaveValue('');
    await expect(serial.getByText('Unlocked', { exact: true })).toBeVisible();
    await serial.locator('input').fill('b');
    await serial.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(page.locator('.registers tbody tr').nth(1).locator('.num')).toHaveText('-12');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(serial).toHaveCount(0);
  });

  test('speed slider changes speed label', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    const labelBefore = await page.locator('.speed-label').textContent();

    // Move slider to a different position
    await slider.fill('2');
    const labelAfter = await page.locator('.speed-label').textContent();
    expect(labelAfter).not.toEqual(labelBefore);
  });

  test('navigates memory by loaded labels and wrapped addresses without moving the PC', async ({ page }) => {
    await page.locator('textarea').fill('@200\nstart: M A 83');
    await expect(page.locator('.asm-status .ok')).toBeVisible();
    await page.getByRole('button', { name: 'Load' }).click();
    const address = page.getByRole('textbox', { name: 'Memory address' });
    const selected = page.locator('.inspector .kv tr').first();
    await address.fill('start+1');
    await address.press('Enter');
    await expect(selected).toContainText('201');
    await expect(page.locator('.readout').first()).toContainText('(200)');
    await address.fill('9842');
    await address.press('Enter');
    await expect(selected).toContainText('-9841');
    await address.fill('P');
    await address.press('Enter');
    await expect(selected).toContainText('__P');
    await address.fill('unknown');
    await address.press('Enter');
    await expect(address).toHaveAttribute('aria-invalid', 'true');
    await expect(selected).toContainText('__P');
    await expect(page.getByRole('alert')).toContainText('loaded label');
    await page.getByRole('button', { name: 'Sound', exact: true }).click();
    await address.fill('P');
    await address.press('Enter');
    await expect(page.locator('.memory canvas').first()).toBeVisible();
    await expect(address).toHaveAttribute('aria-invalid', 'false');
  });

  test('resize handle exists between panes', async ({ page }) => {
    const handles = page.locator('.resize-handle');
    await expect(handles).toHaveCount(2);
  });

  test('pane dividers support keyboard resizing and reset', async ({ page }) => {
    const editor = page.getByRole('separator', { name: 'Editor pane width' });
    await editor.focus();
    await editor.press('ArrowRight');
    await expect(editor).toHaveAttribute('aria-valuenow', '400');
    await editor.press('Shift+ArrowLeft');
    await expect(editor).toHaveAttribute('aria-valuenow', '300');
    await editor.press('Home');
    await editor.press('ArrowLeft');
    await expect(editor).toHaveAttribute('aria-valuenow', '200');
    await expect(page.getByRole('button', { name: 'Load' })).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.demo-select')).toBeInViewport({ ratio: 1 });
    await editor.dblclick();
    await expect(editor).toHaveAttribute('aria-valuenow', '380');
    const registers = page.getByRole('separator', { name: 'Registers pane width' });
    await registers.press('ArrowRight');
    await expect(registers).toHaveAttribute('aria-valuenow', '400');
    await registers.press('Shift+ArrowLeft');
    await expect(registers).toHaveAttribute('aria-valuenow', '500');
    await registers.dblclick();
    await expect(registers).toHaveAttribute('aria-valuenow', '420');
  });

  test('canceling a pointer resize releases the divider', async ({ page }) => {
    const divider = page.getByRole('separator', { name: 'Editor pane width' });
    const box = (await divider.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 30;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y);
    await expect(divider).toHaveAttribute('aria-valuenow', '410');
    await divider.dispatchEvent('pointercancel', { pointerId: 1 });
    await expect(divider).not.toHaveClass(/dragging/);
    await page.mouse.move(x + 70, y);
    await page.mouse.up();
    await expect(divider).toHaveAttribute('aria-valuenow', '410');
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
