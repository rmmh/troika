import {expect,test} from '@playwright/test';
test('native home menu arrows move selection and Enter opens the selected link',async({page})=>{
 test.setTimeout(180_000);await page.goto('/world.html');const screen=page.getByTestId('world-screen');
 await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});await page.getByRole('button',{name:'Focus display',exact:true}).click();
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Public file library',{timeout:45_000});
 await page.keyboard.press('F1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
 await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Small Web Atlas',{timeout:45_000});
});
