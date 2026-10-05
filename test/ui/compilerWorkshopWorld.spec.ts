import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result] of [
 ['library','/p0345','Grammar Sets','S>AB,A>aA,A>~,B>b',['S F:ab L:$ N:0','A F:a L:b N:1','$ end; - empty; N:nullable'],'S>A,A>~,B>~','S F:- L:$ N:1'],
 ['typecase','/p0346','Predictive Parser','S>aS,S>~|aaa',['ACCEPT','consumed: 3/3','rules: 0001'],'S>a,S>ab|ab','TABLE CONFLICT: S/a'],
 ['masks','/p0347','Logic Cover','1357|',['terms=1 literals=1','SOP: c'],'01234567|','SOP: 1'],
 ['ada','/p0348','Combinator Bench','@@@SIIa|4',['NORMAL; steps=3','Prefix term (@ applies):','@aa'],'@@@SII@@SII|20','STEP LIMIT; steps=20'],
 ['toolshed','/p0349','Counter Machine','D012,I10,H|3,0,0|20',['HALT; steps=7','next instruction=2','r0=0 r1=3 r2=0'],'I00|99,0,0|99','r0=198 r1=0 r2=0'],
 ['relay','/p0350','Type Unifier','pxi=pby',['UNIFIED (prefix types)','x=b y=i'],'x=pxi','NO UNIFIER: occurs check'],
] as const)test(`native ${title} demonstrates its compiler model`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);await enter(page,input);for(const text of rows)await expect(screen).toContainText(text);await expect(screen).toContainText('F1: programs');await expect(screen).toContainText('(max 54)');await page.screenshot({path:test.info().outputPath(`native-${site}-compiler.png`),fullPage:true});await enter(page,'invalid');await expect(screen).toContainText('Invalid input');await enter(page,next);await expect(screen).toContainText(result);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
