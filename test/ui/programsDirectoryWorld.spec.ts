import {expect,test} from '@playwright/test';
import {SOFTWARE} from '../../src/world/software/native';
import {WEB_SITES} from '../../src/world/catalog';

const first=SOFTWARE.filter(app=>/^[a-c]/i.test(app.title)).sort((a,b)=>a.title.localeCompare(b.title,'en')||a.number-b.number)[0]!;
const originalSite=WEB_SITES.find(site=>site.slug===first.site)!;

test('native A-Z directory follows a title to its original site using keyboard links',async({page})=>{
  test.setTimeout(180_000);
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type('open http://programs.world/index');await page.keyboard.press('Enter');
  await expect(screen).toContainText('The Program Library',{timeout:45_000});
  await expect(screen).toContainText('A-C');
  await expect(screen).toContainText('D-F');
  await page.screenshot({path:test.info().outputPath('native-programs-alphabet.png'),fullPage:true});
  // Alphabet ranges are the first native PAGE links; return to A-C with arrows.
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Programs: A-C',{timeout:45_000});
  await expect(screen).toContainText('Page 1 of');
  await expect(screen).toContainText(first.title);
  await page.screenshot({path:test.info().outputPath('native-programs-letter.png'),fullPage:true});
  await page.keyboard.press('Enter');
  await expect(screen).toContainText(`Run ${first.title}`,{timeout:45_000});
  await expect(screen).toContainText('Software shelf');
  await page.screenshot({path:test.info().outputPath('native-programs-original-description.png'),fullPage:true});
  // Guest F1 resolves /index against the current host. Seeing the maker's
  // authored home page proves the title link left programs.world correctly.
  await page.keyboard.press('F1');
  await expect(screen).toContainText(originalSite.title,{timeout:45_000});
  await expect(screen).toContainText(originalSite.feature);
});
