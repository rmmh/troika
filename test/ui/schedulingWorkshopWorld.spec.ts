import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result]of [
 ['station','/p0268','Weighted Slots','095031361691',['profit=5 busy=9','jobs: 1'],'015125','profit=10 busy=2'],
 ['toolshed','/p0269','Two-Machine Flow','329123',['order: 3 1 2','finish=15','idle A=1 B=9'],'00','finish=0'],
 ['clockwork','/p0270','CPU Scheduler','r1|31',['RR finish=4','wait: 1 1','turn: 4 2','timeline:','1211'],'s|31','wait: 1 0'],
 ['keys','/p0271','Cache Lab','2|01020',['FIFO hit=1 miss=4','LRU hit=2 miss=3','old>new: 2 0'],'1|1111','FIFO hit=3 miss=1'],
] as const)test(`native ${title} exposes meaningful scheduling decisions`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,site,path,title);
 await replace(page,input);for(const row of rows)await expect(screen).toContainText(row);
 await expect(screen).toContainText('(max 54)');await expect(screen).toContainText('F1: programs');
 await page.screenshot({path:test.info().outputPath(`native-${site}-scheduling.png`),fullPage:true});
 await replace(page,'invalid');await expect(screen).toContainText('Invalid input');
 await replace(page,next);await expect(screen).toContainText(result);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
