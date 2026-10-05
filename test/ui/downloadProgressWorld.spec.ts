import {expect,test} from '@playwright/test';
test('software Run shows real download progress and clears it when the guest starts',async({page})=>{
 test.setTimeout(180_000);await page.goto('/world.html');const screen=page.getByTestId('world-screen');
 await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
 await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
 await page.keyboard.type('open http://ternary.world/s0401');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Ternary Matrix Workshop',{timeout:45_000});await page.keyboard.press('Enter');
 const panel=page.getByTestId('download-progress'),bar=page.getByRole('progressbar',{name:'Download progress'});
 await expect(panel).toBeVisible();await expect(panel).toContainText(/Connecting to software server|Downloading software/);
 await expect.poll(async()=>Number(await bar.getAttribute('value')??0),{timeout:45_000}).toBeGreaterThan(0);
 const first=Number(await bar.getAttribute('value'));expect(first).toBeLessThan(100);
 await page.screenshot({path:test.info().outputPath('software-download-progress.png'),fullPage:true});
 await expect.poll(async()=>Number(await bar.getAttribute('value')??0),{timeout:45_000}).toBeGreaterThan(first);
 await expect(page.getByRole('status')).toHaveText('Disk program',{timeout:45_000});await expect(panel).toBeHidden();
 await expect(screen).toContainText('Ternary Matrix Workshop');
});
