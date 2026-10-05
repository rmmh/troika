import {expect,test} from '@playwright/test';
test('software Run shows real download progress and clears it when the guest starts',async({page})=>{
 test.setTimeout(180_000);await page.goto('/world.html');const screen=page.getByTestId('world-screen');
 await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
 await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
 await page.keyboard.type('open http://ternary.world/s0401');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Ternary Matrix Workshop',{timeout:45_000});await page.keyboard.press('Enter');
 await expect(screen).toContainText('Downloading...',{timeout:45_000});
 const percent=async()=>Number((await screen.innerText()).match(/(\d{3})%/)?.[1]??0);
 await expect.poll(percent,{timeout:45_000}).toBeGreaterThan(0);
 const first=await percent();expect(first).toBeLessThan(100);
 await expect(screen).toContainText(/\[#+\.+\]/);
 await page.screenshot({path:test.info().outputPath('software-download-progress.png'),fullPage:true});
 await expect.poll(percent,{timeout:45_000}).toBeGreaterThan(first);
 await expect(page.getByRole('status')).toHaveText('Disk program',{timeout:45_000});await expect(screen).not.toContainText('Downloading...');
 await expect(screen).toContainText('Ternary Matrix Workshop');
});

test('Programs arrows select IRC and plain native text sends to the room',async({page})=>{
 test.setTimeout(180_000);await page.goto('/world.html');const screen=page.getByTestId('world-screen');
 await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
 await page.getByRole('button',{name:'F2 · Console',exact:true}).click();await page.keyboard.type('programs');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Troika programs');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
 await expect(screen).toContainText('> 3 IRC');await page.keyboard.press('ArrowUp');await expect(screen).toContainText('> 2 Terminal');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(screen).toContainText('IRC room 1',{timeout:45_000});await page.keyboard.type('hello without slash');await page.keyboard.press('Enter');
 await expect(screen).toContainText('guest: hello without slash',{timeout:45_000});
 await page.screenshot({path:test.info().outputPath('native-irc-plain-chat.png'),fullPage:true});
});
