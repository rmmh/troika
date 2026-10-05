import {test,expect,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function replace(page:Page,text:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(text);await page.keyboard.press('Enter');}
test('native automaton traces acceptance, missing transitions and invalid definitions',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'relay','/p0316','Finite Automaton Lab');
 await replace(page,'0a1,1b2|ab|2');await expect(screen).toContainText('ACCEPT: final state reached');await expect(screen).toContainText('Path: 0 1 2');
 await page.screenshot({path:test.info().outputPath('automaton-accept.png'),fullPage:true});
 await replace(page,'0a1|aa|1');await expect(screen).toContainText('REJECT: missing transition');await expect(screen).toContainText('Path: 0 1');
 await page.screenshot({path:test.info().outputPath('automaton-missing-edge.png'),fullPage:true});
 await replace(page,'0a1,0a2|a|2');await expect(screen).toContainText('Invalid input');await replace(page,'0a1||0');await expect(screen).toContainText('ACCEPT: final state reached');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
