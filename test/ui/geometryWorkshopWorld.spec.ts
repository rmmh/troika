import {expect,test} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
for(const[site,path,title,input,rows,next,result]of[
 ['maps','/p0351','Lattice Polygon Census','0 0 4 0 4 3 0 3',['Area=12','Boundary lattice points=14','Interior lattice points=6'],'0 0 2 2 0 2 2 0','Invalid input'],
 ['miniature','/p0352','Rectangle Union','0 0 3 2 2 1 4 3',['Union area=9','Boundary length=14'],'0 0 1 1 1 0 2 1','Boundary length=6'],
 ['gallery','/p0353','Convex Polygon Clip','0 0 2 2 -1 1 1 -1 3 1 1 3',['Clipped vertices=4','0,2','2,2'],'2 2 3 3 0 0 1 0 0 1','EMPTY'],
 ['lighthouse','/p0354','Polygon Point Test','1 1 0 0 3 0 3 3 0 3',['INSIDE'],'0 1 0 0 3 0 3 3 0 3','BOUNDARY'],
 ['lenses','/p0355','Bezier Sampler','0 0 2 4 4 0',['t=0 0,0','t=1/4 1,3/2','t=1/2 2,2','t=1 4,0'],'0 0 1 1','Invalid input'],
 ['observatory','/p0356','Smallest Enclosing Circle','-2 0 2 0 0 2',['Center x=0 y=0','Radius squared=4'],'1 1 1 1','Radius squared=0'],
]as const)test(`native ${title} gives exact geometry and repeat feedback`,async({page})=>{test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);async function enter(s:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(s);await page.keyboard.press('Enter');}await enter(input);for(const row of rows)await expect(screen).toContainText(row);await expect(screen).toContainText('F1: programs');await page.screenshot({path:test.info().outputPath(`native-${site}-geometry.png`),fullPage:true});await enter(next);await expect(screen).toContainText(result);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});});
