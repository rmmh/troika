import { expect, test } from '@playwright/test';
import { launchNativeSoftware as launch } from './softwareBrowser';

test('Receipt Adder computes exact decimals and recovers after invalid input',async({page})=>{
 test.setTimeout(150_000);
 const screen=await launch(page,'enzo','/p0209','Receipt Adder');
 const input='3.25 1.40 -0.50';
 await page.keyboard.type(input);await page.keyboard.press('Enter');
 await expect(screen).toContainText('items=3 total=4.15');
 await page.screenshot({path:test.info().outputPath('native-receipt-adder.png'),fullPage:true});
 for(let i=0;i<input.length;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('98.41 0.01');await page.keyboard.press('Enter');
 await expect(screen).toContainText('Invalid input');
 for(let i=0;i<10;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('0.01 0.09');await page.keyboard.press('Enter');
 await expect(screen).toContainText('items=2 total=0.10');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
