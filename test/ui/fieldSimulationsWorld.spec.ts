import {expect,test} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';

test('orbit bench traces a bounded default launch and a radial moon collision',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'smallmoon','/p0216','Orbit Bench');
 await expect(screen).toContainText('X+18 Y+00 V+00,+07');
 for(let i=0;i<16;i++)await page.keyboard.press('n');
 await expect(screen).toContainText('Ticks: 16');
 await page.screenshot({path:test.info().outputPath('native-orbit-trajectory.png'),fullPage:true});
 for(let i=16;i<64;i++)await page.keyboard.press('n');
 await expect(screen).toContainText('64 ticks inside the view');
 // The central selection launches with zero velocity: a radial fall.
 for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
 for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Enter');
 for(let i=0;i<3;i++)await page.keyboard.press('n');
 await expect(screen).toContainText('Moon collision; Enter retry');
 await page.keyboard.press('r');await expect(screen).toContainText('X+18 Y+00 V+00,+07');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});

test('contour notebook keeps terrain edits across contour and profile views',async({page})=>{
 test.setTimeout(180_000);
 const screen=await launch(page,'footpath','/p0217','Contour Notebook');
 for(let i=0;i<3;i++)await page.keyboard.press('ArrowDown');
 for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Enter'); // Height nine becomes zero, a new basin.
 await page.keyboard.press('n');await expect(screen).toContainText('Contours; +/- changes level');
 // Both literal '+' and the physical shifted key must reach the guest.
 // Wait for guest redraw; browser key dispatch does not await worker execution.
 await page.keyboard.press('+');await expect(screen).toContainText(/L\s+E\s+V\s+E\s+L\s+4/);
 await page.keyboard.press('Shift+Equal');await expect(screen).toContainText(/L\s+E\s+V\s+E\s+L\s+5/);
 await page.keyboard.press('-');await expect(screen).toContainText(/L\s+E\s+V\s+E\s+L\s+4/);
 await page.keyboard.press('Shift+Equal');await expect(screen).toContainText(/L\s+E\s+V\s+E\s+L\s+5/);
 await page.screenshot({path:test.info().outputPath('native-terrain-contours.png'),fullPage:true});
 await page.keyboard.press('n');await expect(screen).toContainText('Enter picks row; N:heights');
 // Six exact source heights below the scaled profile include the edited zero.
 await expect(screen).toContainText('2  4  7  0  5  2');
 await page.screenshot({path:test.info().outputPath('native-terrain-profile.png'),fullPage:true});
 await page.keyboard.press('n');await expect(screen).toContainText('Enter raises 0..9; N:view');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
