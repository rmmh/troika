import {expect,test} from '@playwright/test';
test('native console and remote terminal support pleasant keyboard editing and recall',async({page})=>{
 test.setTimeout(240_000);await page.goto('/world.html');const screen=page.getByTestId('world-screen');
 await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
 await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
 await expect(screen).toContainText('Up/Down: history/draft');
 await page.keyboard.type('write /note AbD');await page.keyboard.press('ArrowLeft');await page.keyboard.type('C');
 await expect(screen).toContainText('write /note AbCD');
 await page.screenshot({path:test.info().outputPath('native-console-caret.png'),fullPage:true});
 await page.keyboard.press('Enter');await expect(screen).toContainText(/(?:^|\n)\s*ok\s*(?:\n|$)/);
 await page.keyboard.type('type /noxte');for(let i=0;i<3;i++)await page.keyboard.press('ArrowLeft');await page.keyboard.press('Delete');await page.keyboard.press('Enter');await expect(screen).toContainText('AbCD');
 await page.keyboard.type('free');await page.keyboard.press('ArrowUp');await expect(screen).toContainText('type /note');await page.keyboard.press('ArrowDown');await expect(screen).toContainText('free_');await page.keyboard.press('Enter');await expect(screen).toContainText('Free blocks:');
 await page.keyboard.type('programs');await page.keyboard.press('Enter');await expect(screen).toContainText('Troika programs');await page.keyboard.press('2');await expect(screen).toContainText('Host (Enter):',{timeout:30_000});await expect(screen).toContainText('Try echo.world');await expect(page.getByRole('button',{name:'F1 · Disconnect',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'F2 · Programs',exact:true})).toBeEnabled();
 await page.keyboard.type('echo.world');await page.keyboard.press('Enter');await expect(screen).toContainText('Native echo. F1 disconnect.',{timeout:30_000});await expect(screen).toContainText('Left/Right edit; Up recall');await expect(page.getByRole('button',{name:'F2 · Programs',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'F1 · Disconnect',exact:true})).toBeEnabled();
 await page.keyboard.type('Helo');await page.keyboard.press('ArrowLeft');await page.keyboard.type('l');await page.keyboard.press('Enter');await expect(screen).toContainText('\nHello');
 await page.keyboard.type('draft');await page.keyboard.press('ArrowUp');await expect(screen).toContainText('> Hello_');await page.keyboard.press('ArrowDown');await expect(screen).toContainText('> draft_');
 await page.screenshot({path:test.info().outputPath('native-terminal-history.png'),fullPage:true});
 await page.keyboard.press('F1');await expect(screen).toContainText('Host (Enter):');await page.keyboard.press('F2');await expect(screen).toContainText('Troika programs');
});
