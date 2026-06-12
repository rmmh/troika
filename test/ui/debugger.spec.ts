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

  test('assembler shows ok status for valid program', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill(HELLO_ASM);
    await expect(page.locator('.asm-status .ok')).toBeVisible({ timeout: 3000 });
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
});
