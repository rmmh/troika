import {expect,test} from '@playwright/test';
import {SOFTWARE} from '../../src/world/software/native';
import {expectBitmapText,waitBitmapFrame,exitNativeBitmap} from './nativeBitmapBrowser';

// Derive the first title from production metadata so adding another native
// picture exercises the newest arrival rather than a stale numbered shortcut.
const newest=SOFTWARE.filter(app=>app.kind==='text'&&['creativeCanvasUi','studioCanvasUi','visualCanvasUi'].includes(app.uiModule??'')).sort((a,b)=>b.number-a.number)[0]!;
test('Atlas Graphics playground opens its newest native program with arrow keys',async({page})=>{
  test.setTimeout(150_000);
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await page.keyboard.type('open http://atlas.world/software');await page.keyboard.press('Enter');
  await expect(screen).toContainText('The software directory',{timeout:45_000});
  await expect(screen).toContainText('Atlas home');
  await expect(screen).toContainText('Graphics playground');
  // Atlas home is first; Graphics playground is the next native PAGE link.
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Graphics playground',{timeout:45_000});
  await expect(screen).toContainText('Page 1 of',{timeout:45_000});
  await expect(screen).toContainText(newest.title);
  await page.screenshot({path:test.info().outputPath('native-graphics-playground.png'),fullPage:true});
  await page.keyboard.press('Enter');
  await expect(screen).toContainText(`Run ${newest.title}`,{timeout:45_000});
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Disk program',{timeout:45_000});
  if(newest.kind==='text'&&newest.uiModule==='visualCanvasUi'){
    await waitBitmapFrame(page);await expectBitmapText(page,newest.title,0,1);
    await page.screenshot({path:test.info().outputPath('native-graphics-playground-running.png'),fullPage:true});
    await exitNativeBitmap(page);
  }else{
    await expect(screen).toContainText(newest.title);
    await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
    await page.keyboard.press('1');await expect(screen).toContainText('Welcome to Troika World',{timeout:45_000});
  }
});
