import {expect,test} from '@playwright/test';
import {launchNativeSoftware as launch} from './softwareBrowser';
const cases=[
 {site:'keys',path:'/p0252',title:'Discrete Log Explorer',input:[2,3,5],output:[['Found 0/1',1],['Least exponent',3]],next:[2,3,8],nextOutput:[['Found 0/1',0],['Least exponent',0]],invalid:[2,3,1]},
 {site:'crystal',path:'/p0253',title:'Farey Successor',input:[1,3,8],output:[['Next numerator',3],['Next denominator',8]],next:[2,4,8],nextOutput:[['Next numerator',4],['Next denominator',7]],invalid:[1,1,8]},
 {site:'observatory',path:'/p0254',title:'Bounded Pell Explorer',input:[2],output:[['Found (x<=99)',1],['x',3],['y',2]],next:[13],nextOutput:[['Found (x<=99)',0],['x',0],['y',0]],invalid:[1]},
 {site:'ternary',path:'/p0255',title:'Aliquot Chain Explorer',input:[220,27],output:[['Last value',220],['Steps',2],['Stop 0..3',2]],next:[9240,27],nextOutput:[['Last value',9240],['Steps',0],['Stop 0..3',3]],invalid:[0,27]},
] satisfies {site:string;path:string;title:string;input:number[];output:[string,number][];next:number[];nextOutput:[string,number][];invalid:number[]}[];
for(const app of cases)test(`native ${app.title} distinguishes solutions, bounds and invalid inputs`,async({page})=>{
 test.setTimeout(180_000);const screen=await launch(page,app.site,app.path,app.title);let selected=0;
 const enter=async(values:number[])=>{for(let i=0;i<values.length;i++){while(selected!==i){await page.keyboard.press('Tab');selected=(selected+1)%values.length;}for(let j=0;j<5;j++)await page.keyboard.press('Backspace');await page.keyboard.type(String(values[i]));}await page.keyboard.press('Enter');};
 const check=async(rows:[string,number][])=>{for(const[label,value]of rows){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');await expect(screen).toContainText(new RegExp(`${escaped}\\s+${value}(?:\\s|$)`));}await expect(screen).toContainText('F1: programs');};
 await enter(app.input);await check(app.output);await page.screenshot({path:test.info().outputPath(`native-${app.site}-number.png`),fullPage:true});
 await enter(app.next);await check(app.nextOutput);await enter(app.invalid);await expect(screen).toContainText('Invalid or out of range');
 await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
