import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
async function exit(page:Page){await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(page.getByTestId('world-screen')).toContainText('Welcome to Troika World',{timeout:45_000});}
test('Group Table Inspector distinguishes nonabelian groups and missing inverses',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'masks','/p0382','Group Table Inspector');
 await enter(page,'6|012345104523230154325401451032543210');
 await expect(screen).toContainText('GROUP; order=6');await expect(screen).not.toContainText('ABELIAN GROUP');await expect(screen).toContainText('Identity: 0');await expect(screen).toContainText('Center: 0');await expect(screen).toContainText('Table: row * column');
 await page.screenshot({path:test.info().outputPath('native-nonabelian-group.png'),fullPage:true});
 await enter(page,'2|0123');await expect(screen).toContainText('Invalid input');await enter(page,'2|0001');await expect(screen).toContainText('NOT A GROUP');await expect(screen).toContainText('No inverse for element 0');await exit(page);
});
test('Ternary Polynomial Factors handles multiplicity, leading units and zero',async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,'ternary','/p0383','Ternary Polynomial Factors');
 await enter(page,'2002');await expect(screen).toContainText('Unit: 2');await expect(screen).toContainText('11*11*11');await expect(screen).toContainText('Arithmetic modulo 3');
 await page.screenshot({path:test.info().outputPath('native-ternary-factor-unit.png'),fullPage:true});
 await enter(page,'01');await expect(screen).toContainText('Invalid input');await enter(page,'0');await expect(screen).toContainText('Zero has no factorization');await enter(page,'10000000');await expect(screen).toContainText('10*10*10*10*10*10*10');await exit(page);
});
