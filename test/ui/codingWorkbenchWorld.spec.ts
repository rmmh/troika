import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
for(const[site,path,title,input,rows,next,nextRows]of[
 ['archivist','/p0420','Structured Query','a.0|{"a":[7,8]}',['INTEGER','7'],'a|{"a":1,"bad":01}',['Invalid input']],
 ['letters','/p0421','Three-Way Merge','abc|axbc|abcy',['MERGED','axbcy','Edit hunks L=1 R=1','Identical edits appear once'],'abc|axc|ayc',['CONFLICT base 1:2','LEFT: x','RIGHT: y','0-based spans; end excluded']],
 ['depot','/p0422','Heap Workshop','12|+a4,+b4,+c4,-a,-c,+d5',['Free=8 largest hole=4','Rejected requests=1','....bbbb....','Map: one unit/char, base 0'],'12|+a4,+b4,+c4,-a,-c,-b,+d9',['Free=3 largest hole=3','Rejected requests=0','ddddddddd...']],
 ['ada','/p0423','Live Variable Analysis','a=b+c;b=a*d;d=b|d',['Peak live variables=3','1:bcd','2:ad','3:b'],'a=b|',['Unused: 1','1:b']],
 ['library','/p0424','Relation Keys','ABC|A>B,B>C',['Minimal candidate keys=1','BCNF bad: 2'],'ABC|A>B,B>C,C>A',['Minimal candidate keys=3','A B C','BCNF bad: none']],
 ['typecase','/p0425','Token Inspector','sum=0xA+2',['I 0:3','O 3:4','N 4:7','O 7:8','N 8:9'],'"bad\\q"',['LEXICAL ERROR; token at 0']],
]as const)test(`native ${title} explains its coding workflow`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);await enter(page,input);for(const text of rows)await expect(screen).toContainText(text);await expect(screen).toContainText('F1: programs');await expect(screen).toContainText('(max 54)');await page.screenshot({path:test.info().outputPath(`native-${site}-coding.png`),fullPage:true});await enter(page,next);for(const text of nextRows)await expect(screen).toContainText(text);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
