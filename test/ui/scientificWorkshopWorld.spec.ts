import{expect,test,type Page}from'@playwright/test';
import{runNativeSoftware as run}from'./softwareBrowser';
async function replace(page:Page,s:string){for(let i=0;i<54;i++)await page.keyboard.press('Backspace');await page.keyboard.type(s);await page.keyboard.press('Enter');}
for(const[host,path,title,input,rows,next,result]of[
 ['radios','/p0306','Resistor Stack','236PS',['R=4 ohms'],'23P','R=6/5 ohms'],
 ['lenses','/p0307','Thin Lens Bench','10 15',['v=30','M=-2','REAL inverted'],'10 5','VIRTUAL upright'],
 ['pendulum','/p0308','Spring Stepper','8 0 5 0 4',['t0 x=8 v=0','t2 x=-2 v=-6','t4 x=-9 v=-2'],'9 9 0 0 4','t4 x=45 v=9'],
 ['bottles','/p0309','Mixing Tanks','9 1 2 3',['conserved total=3','t0 A=1 B=2','t3 A=922/729 B=1265/729'],'3 9 0 2','t2 A=5 B=4'],
 ['rye','/p0310','Reaction Balance','140002102021',['reactants: 1 2','products: 1 2','C/H/O atoms conserved'],'000000000000','UNDERDETERMINED'],
 ['weather','/p0311','Simpson Bench','1 0 1 4',['Simpson=8/3','trapezoid=3','difference=-1/3'],'2 -1 0 1','difference=0'],
]as const)test(`native ${title} explains its scientific model`,async({page})=>{
 test.setTimeout(180_000);const screen=await run(page,host,path,title);await replace(page,input);for(const row of rows)await expect(screen).toContainText(row);await expect(screen).toContainText('(max 54)');await expect(screen).toContainText('F1: programs');await page.screenshot({path:test.info().outputPath(`native-${host}-scientific.png`),fullPage:true});await replace(page,'invalid');await expect(screen).toContainText('Invalid input');await replace(page,next);await expect(screen).toContainText(result);await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});
