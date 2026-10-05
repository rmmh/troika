import { expect, test, type Page } from '@playwright/test';
import { launchNativeSoftware as launch } from './softwareBrowser';
async function replace(page: Page, text: string) {
  for (let i=0;i<54;i++) await page.keyboard.press('Backspace');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}
for (const [site,path,title,input,first,second,next,result] of [
  ['footpath','/p0336','Every Vertex Once','3|011220','paths=3','first: 012','3|0110','first: NONE'],
  ['relay','/p0337','Minimum Watch Posts','4|011223','minimum=2','vertices: 0 2','2|11','vertices: 1'],
  ['masks','/p0338','Graph Twins','3|0112|0212','ISOMORPHIC','0>0 1>2 2>1','4|01122330|011223','NO ISOMORPHISM'],
] as const) test(`${title} launches over the NIC and accepts keyboard edits`, async ({page}) => {
  test.setTimeout(180_000);
  const screen = await launch(page,site,path,title);
  await replace(page,input);
  await expect(screen).toContainText(first);
  await expect(screen).toContainText(second);
  await expect(screen).toContainText('F1: programs');
  await page.screenshot({path:test.info().outputPath(`${site}-graph-search.png`),fullPage:true});
  await replace(page,'3|09');
  await expect(screen).toContainText('Invalid input');
  await replace(page,next);
  await expect(screen).toContainText(result);
  await page.keyboard.press('F1');
  await expect(page.getByRole('status')).toHaveText('Programs');
  await page.keyboard.type('1');
  await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
