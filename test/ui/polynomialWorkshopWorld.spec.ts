import {expect,test,type Page} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter')}
const cases=[
 {site:'crystal',number:263,title:'Quadratic Resultant',input:'-1 0 1 -2 1 1',seen:['R=0','SHARED FACTOR'],next:'0 0 1 1 0 1',nextSeen:['R=1','COPRIME'],bad:'1 0 0 1 0 1'},
 {site:'ada',number:264,title:'Integer Polynomial Division',input:'3 -1 0 1 -1 1',seen:['q0=1','q1=1','r0=0'],next:'3 1 0 1 1 1',nextSeen:['q0=-1','q1=1','r0=2'],bad:'1 1 2'},
 {site:'pendulum',number:265,title:'Integral Polynomial Fit',input:'0 1 1 2 2 5',seen:['c0=1','c1=0','c2=1'],next:'3 9 2 4 1 1 0 0',nextSeen:['c0=0','c2=1','c3=0'],bad:'0 0 2 1'},
 {site:'observatory',number:266,title:'Exact Quadratic Roots',input:'2 -3 1',seen:['x1=1/2','x2=1'],next:'1 0 -2',nextSeen:['IRRATIONAL D=8'],bad:'10 0 1'},
 {site:'ternary',number:267,title:'Polynomial Translation',input:'2 1 0 1',seen:['c0=5','c1=4','c2=1'],next:'-1 1 2 1',nextSeen:['c0=0','c1=0','c2=1'],bad:'3 9 9 9 9 9 9 9'},
 {site:'weather',number:268,title:'Discrete Antiderivative',input:'5 1 3 5',seen:['B1=1','B2=2','Q4=16','Q5=25'],next:'9 2',nextSeen:['Q1=2','Q9=18'],bad:'9 -9 9 -9 9 -9 9'},
];
for(const c of cases)test(`native ${c.title} exact arithmetic and visible domain errors`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,c.site,`/p${String(c.number-1).padStart(4,'0')}`,c.title);
 await replace(page,c.input);for(const text of c.seen)await expect(screen).toContainText(text);
 await page.screenshot({path:test.info().outputPath(`native-polynomial-${c.number}.png`),fullPage:true});
 await replace(page,c.next);for(const text of c.nextSeen)await expect(screen).toContainText(text);
 await replace(page,c.bad);await expect(screen).toContainText('Invalid input');await replace(page,c.input);for(const text of c.seen)await expect(screen).toContainText(text);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
