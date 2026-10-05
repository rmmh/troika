import {expect,test,type Page} from '@playwright/test';
import {runNativeSoftware} from './softwareBrowser';
async function enter(page:Page,input:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(input);await page.keyboard.press('Enter');}
for(const [site,path,title,input,rows,next,result] of [
 ['signals','/p0370','Exact Fourier Eight','1 0 0 0 0 0 0 0',['2X: Re(a,b) Im(c,d)','0: 2,0 0,0','4: 2,0 0,0'],'0 1 0 -1 0 1 0 -1','2: 0,0 -8,0'],
 ['cassettes','/p0371','Autocorrelation Bench','1 -1 1 -1',['Record mean=0','1:-3/4','3:-1/4','lag:rho; same denominator'],'3 3','UNDEFINED: constant series'],
 ['relay','/p0372','Three-State Markov','0 3|210120012',['t3: 14/27 13/27 0','Stationary (states 0,1,2):','1/2 1/2 0'],'2 2|300030003','MULTIPLE stationary laws'],
 ['pendulum','/p0373','Quantized Logistic Map','12 40',['r=4; state value=x/81','transient=1 period=4','80 3 11 38','Complete cycle shown'],'0 81','transient=1 period=1'],
 ['lenses','/p0374','Isotonic Calibration','3 1 1 1 4 1',['Pooled blocks=2','1:2','2:2','3:4','index:fitted value'],'3 3 2 2 1 1','1:7/3'],
 ['weather','/p0375','Signal Segmenter','2 0 0 8 8',['Minimum absolute error=0','1-2 value=0','3-4 value=8','1-based; lower medians'],'1 4 1 9 2','1-4 value=2'],
] as const)test(`native ${title} explains exact data analysis`,async({page})=>{
 test.setTimeout(180_000);const screen=await runNativeSoftware(page,site,path,title);await enter(page,input);for(const text of rows)await expect(screen).toContainText(text);await expect(screen).toContainText('F1: programs');await expect(screen).toContainText('(max 54)');await page.screenshot({path:test.info().outputPath(`native-${site}-dynamics.png`),fullPage:true});await enter(page,'invalid');await expect(screen).toContainText('Invalid input');await enter(page,next);await expect(screen).toContainText(result);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
});
