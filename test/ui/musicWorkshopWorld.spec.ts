import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result,audio] of [
 ['sol','/p0357','Chord Finder','60 63 66 69',['C dim7 inv0','D# dim7 inv3','F# dim7 inv2','A dim7 inv1','P:play Space:stop F1:exit'],'64 67 72','C major inv1',true],
 ['bellows','/p0358','Voice Leading','48 52 55|0 5 9',['motion=3 max-leap=2','To: C3 F3 A3','Notes: 48 53 57','P:play Space:stop F1:exit'],'60 64 67|2 5 9','Notes: 62 65 69',true],
 ['pendulum','/p0359','Euclidean Rhythm','8 3 0',['steps=8 hits=3 rot=0','x..x..x.','3 3 2','P:play Space:stop F1:exit'],'8 0 0','none (silence)',true],
 ['scorebook','/p0360','Counterpoint Check','48 50 52|60 62 64',['Checklist issues: 2','Parallels: 2 first:2','Leaps>12: 0 first:-'],'48 50 48|60 59 60','Checklist issues: 0',false],
 ['cassettes','/p0361','Melody Transform','T 2|60 62 64',['N: D4 E4 F#4','I: +2 +2','P:play Space:stop F1:exit'],'I 60|60 62 64','N: C4 A#3 G#3',true],
 ['soundmap','/p0362','Tuning Comparator','3/2|40/27',['left/right=81/80','Beat period=54','measured in base cycles','Beat Hz = base Hz / period'],'2/2|3/3','No beating: equal frequency',false],
] as const)test(`native ${title} offers a usable musical workflow`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);await enter(page,input);for(const text of rows)await expect(screen).toContainText(text);await expect(screen).toContainText('F1: programs');await expect(screen).toContainText('(max 54)');await page.screenshot({path:test.info().outputPath(`native-${site}-music.png`),fullPage:true});if(audio){await page.keyboard.press('p');await page.keyboard.press('Space');}
 await enter(page,'invalid');await expect(screen).toContainText('Invalid input');if(audio)await page.keyboard.press('p');await enter(page,next);await expect(screen).toContainText(result);
 if(audio){await enter(page,input);for(const text of rows)await expect(screen).toContainText(text);await page.keyboard.press('p');}
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
