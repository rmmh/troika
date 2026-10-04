import { expect, type Page } from '@playwright/test';

export async function launchNativeSoftware(page:Page,host:string,path:string,title:string) {
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type(`get http://${host}.world${path} /game`);await page.keyboard.press('Enter');
  await expect(screen).toContainText(/(?:^|\n)\s*ok\s*(?:\n|$)/,{timeout:45_000});
  await page.keyboard.type('programs');await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/game');await page.keyboard.press('Enter');
  await expect(screen).toContainText(title);
  return screen;
}

