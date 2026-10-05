import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
for(const [site,path,title,input,output,next,result]of [
 ['relay','/p0232','Residual Flow','4|013023123133233','flow=6 cut=0','2|','flow=0 cut=0'],
 ['toolshed','/p0233','Spanning Tree Planner','3|019025125','cost=10 edges=2-1,0-2','3|011','DISCONNECTED'],
 ['depot','/p0234','Cargo Knapsack','10|060905080508','value=16 weight=10 items=2,3','00|0109','value=0 weight=0 items=NONE'],
 ['cardtable','/p0235','Stable Pairing','2|01100110','pairs=0-0,1-1','1|00','pairs=0-0'],
] as const)test(`native ${title} solves and reruns through the keyboard`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,site,path,title);
 await replace(page,input);await expect.poll(async()=> (await screen.textContent()??'').replace(/\s+/g,'')).toContain(output.replace(/\s+/g,''));
 if(title==='Cargo Knapsack') await expect(screen).toContainText(/value=16\s*\nweight=10\s*\nitems=2,3/);
 await expect(screen).toContainText('(max 54)');
 await expect(screen).toContainText('F1: programs');
 await page.screenshot({path:test.info().outputPath(`native-${site}-operations.png`),fullPage:true});
 await replace(page,'invalid');await expect(screen).toContainText('Invalid input');await replace(page,next);await expect.poll(async()=> (await screen.textContent()??'').replace(/\s+/g,'')).toContain(result.replace(/\s+/g,''));
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
