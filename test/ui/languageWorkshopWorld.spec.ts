import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result] of [
 ['toolshed','/p0324','Infix Bench','2*(3+4)',['Result: 14','Use 0-3 for negative 3'],'(0-7)/2','Result: -3'],
 ['typecase','/p0325','Regular Expression Lab','(a|b)*abb;abb',['MATCH','prefixes: 3'],'a*;','prefixes: 0'],
 ['library','/p0326','CYK Grammar Lab','SAB,Aa,Bb|ab',['ACCEPT','Whole span: S','Chart entries: 3'],'SAB,Aa,Bb|ba','REJECT'],
 ['signals','/p0327','Epsilon NFA Lab','0e1,1a2|a|2',['ACCEPT','Final set: 2','Sizes: 2 1'],'0e1,1e0||1','Final set: 01'],
 ['relay','/p0328','DFA Minimizer','4|12333333|3',['reachable/minimal: 4/3','classes: 0 1 1 3','a: 1 3 3','b: 1 3 3','final: 3'],'2|0011|1','classes: 0 -'],
 ['ada','/p0329','Turing Tape Lab','011R0,0_1RH|111|8',['HALT; steps=4','state=H head=12','________1111_______________','^'],'0__R1,1__L0||99','STEP LIMIT; steps=99'],
] as const)test(`native ${title} explains and executes its language model`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);await enter(page,input);for(const row of rows)await expect(screen).toContainText(row);await expect(screen).toContainText('F1: programs');await expect(screen).toContainText('(max 54)');await page.screenshot({path:test.info().outputPath(`native-${site}-language.png`),fullPage:true});await enter(page,'invalid');await expect(screen).toContainText('Invalid input');await enter(page,next);await expect(screen).toContainText(result);if(title==='Turing Tape Lab')await page.screenshot({path:test.info().outputPath('native-turing-step-limit.png'),fullPage:true});await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
