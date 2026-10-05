import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
const cases=[
 {site:'library',path:'/p0297',title:'Dictionary Word Break',input:'a,ab,b|abab',expected:'ab ab',invalid:'a,,b|ab',again:'ab,bc|abc',answer:'NO SPLIT',image:'native-dictionary-split.png'},
 {site:'typecase',path:'/p0298',title:'Stable Sorted Merge',input:'1,3|2,3',expected:'Values: 1,2,3,3',invalid:'3,1|2',again:'1,1|1',answer:'Sources: LLR',image:'native-sorted-merge.png'},
 {site:'zine',path:'/p0299',title:'Simultaneous Rewrite',input:'a>b,b>a|abba',expected:'baab',invalid:'>a|b',again:'a>x,ab>q|abac',answer:'qxc',image:'native-parallel-rewrite.png'},
 {site:'gazette',path:'/p0300',title:'Quoted Field Projector',input:'2,1|"a,b","say ""hi"""',expected:'"say ""hi""","a,b"',invalid:'2|one',again:'1,1|',answer:'"",""',image:'native-csv-project.png'},
];
for(const c of cases)test(`native ${c.title} Run link, useful result and invalid-input recovery`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,c.site,c.path,c.title);
 await enter(page,c.input);await expect(screen).toContainText(c.expected);if(c.site==='typecase')await expect(screen).toContainText('Sources: LRLR');
 await page.screenshot({path:test.info().outputPath(c.image),fullPage:true});
 await enter(page,c.invalid);await expect(screen).toContainText('Invalid input');await enter(page,c.again);await expect(screen).toContainText(c.answer);
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
