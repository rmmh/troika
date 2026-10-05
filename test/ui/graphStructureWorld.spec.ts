import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
for(const [site,path,title,input,first,second,next,result]of [
 ['relay','/p0244','Strong Components','5|0110122332','components=3','labels: 0 0 2 2 4','3|011220','components=1'],
 ['tram','/p0245','Euler Route','2|01011010','edges=4','01010','4|01102332','NO TRAIL: disconnected'],
 ['hexclub','/p0246','Exact Graph Coloring','3|011220','colors=3','by vertex: 0 1 2','4|01122330','colors=2'],
 ['footpath','/p0247','Fragile Links','4|01011223','bridges: 12 23','cut vertices: 1 2','3|011220','bridges: NONE'],
] as const)test(`native ${title} reports graph structure with readable result rows`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,site,path,title);
 await replace(page,input);await expect(screen).toContainText(first);await expect(screen).toContainText(second);
 await expect(screen).toContainText('(max 54)');await expect(screen).toContainText('F1: programs');
 await page.screenshot({path:test.info().outputPath(`native-${site}-graph-structure.png`),fullPage:true});
 await replace(page,'3|09');await expect(screen).toContainText('Invalid input');
 await replace(page,next);await expect(screen).toContainText(result);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
