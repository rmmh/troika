import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result]of [
 ['cardtable','/p0276','Dice Distribution','4 6',['total=1296','4: 1','24: 1'],'2 6','total=36'],
 ['market','/p0277','Urn Draw','12 6 6',['total=924','0: 1','5: 36'],'6 2 3','total=20'],
 ['relay','/p0278','Run Probability','5 3 1',['matching=8','total=32','probability=1/4'],'13 1 0','probability=8191/8192'],
 ['footpath','/p0279','Gambler Walk','4 2 4',['total=16','0: 6','4: 6'],'4 0 4','0: 16'],
 ['postbox','/p0280','Coupon Collector','8',['kinds=8','expected draws=761/35'],'1','expected draws=1'],
 ['hexclub','/p0281','Permutation Cycles','7',['total=5040','1: 720','5: 175'],'3','total=6'],
] as const)test(`native ${title} gives exact bounded probabilities`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,site,path,title);
 await replace(page,input);for(const row of rows)await expect(screen).toContainText(row);
 await expect(screen).toContainText('(max 54)');await expect(screen).toContainText('F1: programs');
 await page.screenshot({path:test.info().outputPath(`native-${site}-probability.png`),fullPage:true});
 await replace(page,'invalid');await expect(screen).toContainText('Invalid input');
 await replace(page,next);await expect(screen).toContainText(result);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
