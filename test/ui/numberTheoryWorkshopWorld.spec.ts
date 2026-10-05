import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware as run} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
for(const [host,path,title,input,rows,next,result]of[
 ['clockwork','/p0291','Congruence Pair','2 6 5 9',['x=14','period=18'],'1 2 0 4','NONE'],
 ['toolshed','/p0292','Diophantine Line','6 9 3',['x0=2 y0=-1','dx=3 dy=-2','x=x0+dx*t; y=y0+dy*t'],'2 4 1','NONE'],
 ['crystal','/p0293','Modular Square Roots','0 81',['solutions=9','0  9  18 27 36 45 54 63 72'],'2 15','NONE'],
 ['keys','/p0294','Primitive Root Census','83',['phi=82 generators=40','2  5  6  8  13 14 15 18 19','74 76 79 80'],'8','NONE'],
 ['seedbank','/p0295','Mobius Sieve','10',['mu(n)=1','Mertens=-1','squarefree=7'],'99','squarefree=61'],
 ['observatory','/p0296','Jacobi Symbol','2 15',['Jacobi=1','1 is not a square proof'],'3 15','Shared factor (n>1)'],
]as const)test(`native ${title} exposes exact integer structure`,async({page})=>{
 test.setTimeout(180_000);const screen=await run(page,host,path,title);await replace(page,input);for(const row of rows)await expect(screen).toContainText(row);
 await expect(screen).toContainText('(max 54)');await expect(screen).toContainText('F1: programs');await page.screenshot({path:test.info().outputPath(`native-${host}-number-theory.png`),fullPage:true});
 await replace(page,'invalid');await expect(screen).toContainText('Invalid input');await replace(page,next);await expect(screen).toContainText(result);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
