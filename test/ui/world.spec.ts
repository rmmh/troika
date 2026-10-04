import { expect, test } from '@playwright/test';

test('native paragraph wrapper lays out separate display rows from keyboard text', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://paper.world/p0153 /wrap');await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs');await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/wrap');await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Optimal Paragraph Wrap');
  await page.keyboard.type('6|aaa bb c ddddd');await page.keyboard.press('Enter');
  await expect(transcript).toContainText(/aaa *\n *bb c *\n *ddddd/);
  await page.screenshot({path:test.info().outputPath('native-paragraph-wrap.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});


test('native codebreaker scores duplicate colors and wins from the keyboard', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://riddles.world/p0147 /code');await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs');await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs');await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/code');await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Four-Peg Codebreaker');
  for(let i=0;i<4;i++){await page.keyboard.press('Enter');if(i<3)await page.keyboard.press('ArrowRight');}
  await page.keyboard.type('N');await expect(transcript).toContainText(/2\s+2\s+2\s+2\s+B\s+2\s+W\s+0/);
  for(const [i,count] of [1,3,4,1].entries()){for(let j=0;j<count;j++)await page.keyboard.press('Enter');if(i<3)await page.keyboard.press('ArrowRight');}
  await page.keyboard.type('N');await expect(transcript).toContainText('Code found!');
  await expect(transcript).toContainText(/Tries:\s+2/);
  await page.screenshot({path:test.info().outputPath('native-codebreaker.png'),fullPage:true});
  await page.keyboard.press('F1');await expect(page.getByRole('status')).toHaveText('Programs');
});


test('native Voronoi mosaic fills color territories from keyboard seeds', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://pottery.world/p0144 /mosaic'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/mosaic'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Three-Color Voronoi Mosaic');
  await page.keyboard.press('Enter');
  for(let i=0;i<6;i++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.keyboard.type('N');
  await expect(transcript).toContainText(/Runs:\s+1/);
  await page.keyboard.press('Escape');await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  const value=page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})});
  for(const [address,expected] of [[2900,65],[2901,97],[2903,43],[2904,98],[2906,66],[2911,43]]) {
    await page.getByLabel('Memory address').fill(String(address));await page.getByLabel('Memory address').press('Enter');
    await expect(value).toContainText(`(${expected})`);
  }
  await page.screenshot({path:test.info().outputPath('native-voronoi.png'),fullPage:true});
});


test('native Minesweeper flags a square and flood-reveals from the keyboard', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://puzzlebox.world/p0127 /mines'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/mines'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('N:flag');
  await page.keyboard.press('ArrowDown'); await page.keyboard.type('N');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText(/Opens:\s+1/);
  await page.keyboard.press('Escape'); await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  const value=page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})});
  for(const [address,expected] of [[2900,32],[2901,49],[2906,70],[2912,46]]) {
    await page.getByLabel('Memory address').fill(String(address)); await page.getByLabel('Memory address').press('Enter');
    await expect(value).toContainText(`(${expected})`);
  }
  await page.screenshot({path:test.info().outputPath('native-minesweeper.png'),fullPage:true});
});


test('native Reversi captures disks by keyboard and exposes the guest board', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://hexclub.world/p0126 /reversi'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/reversi'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('X to play');
  await page.keyboard.press('Enter'); await expect(transcript).toContainText(/Moves:\s+0/);
  for(let i=0;i<2;i++) await page.keyboard.press('ArrowDown');
  for(let i=0;i<3;i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space'); await expect(transcript).toContainText('O to play');
  await page.keyboard.press('Enter'); await expect(transcript).toContainText(/Moves:\s+1/);
  await page.keyboard.press('Escape'); await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  const value=page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})});
  for(const [address,expected] of [[2919,88],[2927,88],[2936,79],[3200,79]]) {
    await page.getByLabel('Memory address').fill(String(address)); await page.getByLabel('Memory address').press('Enter');
    await expect(value).toContainText(`(${expected})`);
  }
  await page.screenshot({path:test.info().outputPath('native-reversi.png'),fullPage:true});
});


test('native tape interpreter diagnoses an infinite guest program and remains editable', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://adventure.world/p0101 /tape'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/tape'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Bounded Tape Language Lab');
  await page.keyboard.type('+[]'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('LIMIT pc=2 ptr=0 cell=1');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.type('+.'); await page.keyboard.press('Enter');
  await expect(transcript).not.toContainText('LIMIT');
  await expect(transcript).toContainText(/Result\s+01/);
  await page.keyboard.press('F1'); await expect(page.getByRole('status')).toHaveText('Programs');
});

test('native pixel flipbook preserves separate frames under keyboard control', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://cinema.world/p0095 /book'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/book'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Frame 1/3');
  await page.keyboard.press('Enter'); await page.keyboard.type('n');
  await expect(transcript).toContainText('Frame 2/3');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
  await page.keyboard.type('N'); await expect(transcript).toContainText('Frame 3/3');
  await page.keyboard.type('n'); await expect(transcript).toContainText('Frame 1/3');
  await expect(transcript).toContainText(/Edits:\s+2/);
  await page.keyboard.press('Escape'); await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  const value=page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})});
  for(const [address,expected] of [[3000,35],[3009,46],[3064,46],[3073,35],[3200,0]]) {
    await page.getByLabel('Memory address').fill(String(address)); await page.getByLabel('Memory address').press('Enter');
    await expect(value).toContainText(`(${expected})`);
  }
  await page.screenshot({path:test.info().outputPath('native-flipbook.png'),fullPage:true});
});

test('native sound software reaches browser playback and releases from the keyboard', async ({page}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const state={heard:false,quiet:0};
    Object.assign(window,{soundProbe:state});
    const Original=window.AudioContext;
    window.AudioContext=class extends Original {
      override createScriptProcessor(size?:number,inputs?:number,outputs?:number) {
        const node=super.createScriptProcessor(size,inputs,outputs);
        Object.defineProperty(node,'onaudioprocess',{set(handler:((event:AudioProcessingEvent)=>void)|null) {
          if(handler) node.addEventListener('audioprocess',event=>{
            handler(event);
            const loud=event.outputBuffer.getChannelData(0).some(v=>v!==0);
            if(loud) {state.heard=true;state.quiet=0;} else state.quiet++;
          });
        }});
        return node;
      }
    };
  });
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  const sound=page.getByRole('button',{name:'Enable sound',exact:true});
  await sound.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Mute sound',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://bellows.world/p0070 /tone'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/tone'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Pulse Tone Bench');
  await page.keyboard.type('440'); await page.keyboard.press('Tab'); await page.keyboard.type('3');
  await page.keyboard.press('Tab'); await page.keyboard.type('8'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('437');
  const probe=()=>page.evaluate(()=> (window as unknown as {soundProbe:{heard:boolean;quiet:number}}).soundProbe);
  await expect.poll(async()=>(await probe()).heard).toBe(true);
  await page.keyboard.press('Space'); await expect.poll(async()=>(await probe()).quiet).toBeGreaterThan(5);
  await page.keyboard.press('Enter'); await expect.poll(async()=>(await probe()).quiet).toBe(0);
  await page.keyboard.press('F1'); await expect(page.getByRole('status')).toHaveText('Programs');
  await expect.poll(async()=>(await probe()).quiet).toBeGreaterThan(5);
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  await page.getByLabel('Memory address').fill('150'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})})).toContainText('(0)');
});

test('native simulation edits and steps a guest grid with inspectable memory', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript=page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://ecology.world/p0064 /life'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok',{timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/life'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Life Laboratory');
  await page.keyboard.press('Enter'); await page.keyboard.type('N');
  await expect(transcript).toContainText(/Steps:\s+1/);
  await page.keyboard.type('r'); await expect(transcript).toContainText(/Steps:\s+0/);
  await page.keyboard.type('n'); await expect(transcript).toContainText(/Steps:\s+1/);
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('client');
  await page.getByLabel('Memory address').fill('2920'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})})).toContainText('(42)');
  await page.screenshot({path:test.info().outputPath('native-simulation.png'),fullPage:true});
});

test('native board software plays by keyboard and exposes its winning state', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites', {timeout:90_000});
  await page.getByRole('button', {name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://chess.world/p0049 /queens'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok', {timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/queens'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Eight Queens');
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('That square is attacked');
  await expect(transcript).toContainText(/Moves:\s+1/);
  await page.keyboard.type('r');
  let cursor = 0;
  for (const square of [0,12,23,29,34,46,49,59]) {
    const dr=Math.floor(square/8)-Math.floor(cursor/8), dc=square%8-cursor%8;
    for (let i=0;i<Math.abs(dr);i++) await page.keyboard.press(dr<0 ? 'ArrowUp' : 'ArrowDown');
    for (let i=0;i<Math.abs(dc);i++) await page.keyboard.press(dc<0 ? 'ArrowLeft' : 'ArrowRight');
    await page.keyboard.press('Space'); cursor=square;
  }
  await expect(transcript).toContainText('Eight queens: solved', {timeout:30_000});
  await expect(transcript).toContainText(/Moves:\s+8/);
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', {name:'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('client');
  await page.getByLabel('Memory address').fill('2632'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})})).toContainText('(1)');
  await page.screenshot({path:test.info().outputPath('native-board-software.png'),fullPage:true});
});


test('native text software edits a message and exposes its bounded result', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites', {timeout:90_000});
  await page.getByRole('button', {name:'F2 · Console',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://zine.world/p0015 /slug'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok', {timeout:30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs'); await page.keyboard.type('4');
  await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/slug'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Address slug maker');
  await page.keyboard.type('Hello, Small WEB!!'); await page.keyboard.press('Backspace'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('hello-small-web');
  await page.keyboard.press('Escape'); await page.getByRole('checkbox', {name:'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('client');
  await page.getByLabel('Memory address').fill('2620'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has:page.locator('td',{hasText:/^value$/})})).toContainText('(15)');
  await page.screenshot({path:test.info().outputPath('native-text-software.png'),fullPage:true});
});

test('downloaded native software launches from the keyboard and exposes its result in memory', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites', {timeout: 90_000});
  await page.getByRole('button', {name: 'F2 · Console', exact: true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('get http://ternary.world/p0000 /tool'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('ok', {timeout: 30_000});
  await page.keyboard.type('programs'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Programs');
  await page.keyboard.type('4'); await expect(page.getByRole('status')).toHaveText('Program path');
  await page.keyboard.type('/tool'); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Disk program');
  await expect(transcript).toContainText('Common divisor');
  await page.keyboard.type('84'); await page.keyboard.press('Tab'); await page.keyboard.type('30'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText(/GCD\s+6/);
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', {name: 'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('client');
  await page.getByLabel('Memory address').fill('2560'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has: page.locator('td', {hasText: /^value$/})})).toContainText('(6)');
  await page.screenshot({path: test.info().outputPath('native-software.png'), fullPage: true});
});

test('expanded web atlas is available and its native servers can be inspected', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Small Web: 100 sites', {timeout: 90_000});
  await page.getByRole('button', {name: 'F2 · Console', exact: true}).click();
  await expect(page.getByRole('status')).toHaveText('File console');
  await page.keyboard.type('open http://atlas.world/index'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('The Small Web Atlas', {timeout: 30_000});
  await expect(transcript).toContainText('A world of small pages');
  const greenPixels = await page.getByRole('region', {name: 'World display'}).locator('canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 98 && pixels[i + 1] === 216 && pixels[i + 2] === 137) count++;
    return count;
  });
  expect(greenPixels).toBeGreaterThan(100);
  await expect(transcript).toContainText('Out in the Field');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', {name: 'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('web100');
  await expect(page.getByLabel('World machine')).toHaveValue('web100');
  await expect(page.getByLabel('World machine').locator('option[value="web104"]')).toHaveCount(1);
  await expect(page.getByTestId('inspection-cycles')).not.toHaveText('Waiting…');
  await expect(page.getByRole('region', {name: 'World debugger'}).getByTitle('click a cell to inspect; arrow keys navigate')).toBeVisible();
  await page.getByLabel('Memory address').fill('2198'); await page.getByLabel('Memory address').press('Enter');
  await expect(page.locator('.inspector tr').filter({has: page.locator('td', {hasText: /^value$/})})).toContainText('(1)');
  await page.screenshot({path: test.info().outputPath('atlas-inspection.png'), fullPage: true});
});

test('web world boots native services, accepts physical keys and pauses the whole world', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Paused');
  const cycles = await page.getByTestId('world-cycles').textContent();
  await page.waitForTimeout(200);
  await expect(page.getByTestId('world-cycles')).toHaveText(cycles!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  await page.keyboard.type('dir /'); await page.keyboard.press('Enter');
  await expect(transcript).toContainText('net.seq', { timeout: 20_000 });
  await page.keyboard.press('F1');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 20_000 });
  await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Hello from native Forth', { timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas')).not.toBeFocused();
  await expect(page.getByRole('link', { name: 'Machine debugger' })).toHaveAttribute('href', './index.html');
  await page.getByRole('button', { name: 'Restart with fresh disks' }).click();
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.screenshot({ path: test.info().outputPath('world.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('disk checkpoints restore downloaded files and reject incompatible files without losing the session', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  async function command(text: string, result: string) {
    await page.locator('canvas').focus();
    await page.keyboard.type(text);
    await expect(transcript).toContainText(text.slice(-24));
    await page.keyboard.press('Enter');
    await expect(transcript).toContainText(result, { timeout: 30_000 });
  }
  await command('get /readme /kept', 'ok');
  await command('type /kept', 'Files live on the server');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save disks', exact: true }).click();
  const download = await downloadEvent;
  const path = test.info().outputPath('saved.disks'); await download.saveAs(path);
  await expect(page.getByRole('button', { name: 'Save disks', exact: true })).toBeEnabled();
  await command('del /kept', 'ok');
  await command('type /kept', 'error -12');
  const { readFile } = await import('node:fs/promises');
  const invalid = await readFile(path); invalid[0] = 0;
  await page.getByLabel('Disk checkpoint').setInputFiles({ name: 'invalid.disks', mimeType: 'application/octet-stream', buffer: invalid });
  await expect(page.getByRole('alert')).toContainText('mismatch');
  await expect(transcript).toContainText('error -12');
  await page.getByLabel('Disk checkpoint').setInputFiles(path);
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  await page.getByRole('button', { name: 'F2 · Console', exact: true }).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  await command('type /kept', 'Files live on the server');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('keyboard-only world navigation and embedded live machine inspection', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  async function tabTo(target: import('@playwright/test').Locator) {
    for (let i = 0; i < 100; i++) {
      if (await target.evaluate(element => element === document.activeElement)) return;
      await page.keyboard.press('Tab');
    }
    throw new Error(`Keyboard could not reach target; focused: ${await page.evaluate(() => document.activeElement?.outerHTML)}`);
  }
  await page.goto('/');
  await tabTo(page.getByRole('button', { name: 'World', exact: true }));
  await page.keyboard.press('Enter');
  const world = page.locator('.world-app');
  const transcript = world.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', { timeout: 90_000 });
  const focus = world.getByRole('button', { name: 'Focus display', exact: true });
  await tabTo(focus);
  await page.keyboard.press('Enter');
  await expect(world.getByLabel('World display keyboard input')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(transcript).toContainText('Hello from native Forth', { timeout: 20_000 });
  await page.keyboard.press('F2');
  await expect(transcript).toContainText('dir type del mkdir rmdir', { timeout: 20_000 });
  await page.keyboard.type('dir /');
  await page.keyboard.press('Enter');
  await expect(transcript).toContainText('net.seq', { timeout: 20_000 });
  await page.keyboard.press('Escape');
  await expect(focus).toBeFocused();
  await tabTo(world.getByRole('checkbox', { name: 'Inspect machines' }));
  await page.keyboard.press('Space');
  await tabTo(world.getByLabel('Memory address'));
  await page.keyboard.type('2504');
  await page.keyboard.press('Enter');
  const value = world.locator('.inspector tr').filter({ has: page.locator('td', { hasText: /^value$/ }) });
  await expect(value).toContainText('(5)'); // Native client is in console state.
  await expect(world.getByRole('button', { name: 'Write', exact: true })).toHaveCount(0);
  await tabTo(world.getByRole('button', { name: 'Pause', exact: true }));
  await page.keyboard.press('Enter');
  await expect(world.getByRole('status')).toHaveText('Paused');
  const cycles = await world.getByTestId('inspection-cycles').textContent();
  await page.waitForTimeout(200);
  await expect(world.getByTestId('inspection-cycles')).toHaveText(cycles!);
  await tabTo(world.getByLabel('World machine'));
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown'); // BBS server, not client.
  await page.keyboard.press('Enter');
  await expect(world.getByLabel('World machine')).toHaveValue('server');
  await expect(value).not.toContainText('(5)');
  await tabTo(world.getByRole('link', { name: 'Machine debugger', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.locator('.controls')).toBeVisible();
  await tabTo(page.getByRole('button', { name: 'World', exact: true }));
  await page.keyboard.press('Enter');
  await expect(world.getByRole('status')).toHaveText('Paused');
  await expect(transcript).toContainText('net.seq');
  await page.screenshot({ path: test.info().outputPath('world-debugger.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('native chat clients converse, switch rooms and expose client/server memory', async ({page})=>{
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const chat=page.getByRole('region',{name:'Network chat'});
  await expect(chat).toContainText('you: Connected',{timeout:90_000});
  const message=chat.getByRole('textbox',{name:'Message',exact:true});
  await message.focus();await page.keyboard.type('hello from keyboard');await page.keyboard.press('Enter');
  await expect(chat.getByRole('log')).toContainText('hello from keyboard',{timeout:30_000});
  await message.focus();await page.keyboard.type('I feel worried');await page.keyboard.press('Enter');
  await expect(chat.getByRole('log')).toContainText('Why do you feel worried?',{timeout:30_000});
  await chat.getByLabel('Chat client').selectOption('1');
  await expect(chat.getByRole('log')).toContainText('hello from keyboard',{timeout:30_000});
  await chat.getByLabel('Room',{exact:true}).selectOption('2');
  await expect(chat).toContainText('ada: Connected');
  await expect(chat.getByRole('log')).not.toContainText('hello from keyboard');
  await message.focus();await page.keyboard.type('games room hello');await page.keyboard.press('Enter');
  await chat.getByLabel('Chat client').selectOption('2');
  await expect(chat.getByRole('log')).toContainText('games room hello',{timeout:30_000});
  await page.getByRole('checkbox',{name:'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('chat');
  await expect(page.getByRole('region',{name:'World debugger'})).toContainText('chat');
  await page.getByLabel('World machine').selectOption('chat-20-you');
  await expect(page.getByRole('region',{name:'World debugger'})).toContainText('chat-20-you');
});

test('console network utilities run from physical keyboard input', async ({page})=>{
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const screen=page.getByTestId('world-screen');
  await expect(screen).toContainText('Welcome to Troika World',{timeout:90_000});
  await page.getByRole('button',{name:'F2 · Console',exact:true}).click();
  await expect(screen).toContainText('dir type del mkdir rmdir',{timeout:20_000});
  await page.keyboard.type('ping bbs.world');await page.keyboard.press('Enter');
  await expect(screen).toContainText('27 1.3.2 E',{timeout:20_000});
  await expect(screen).toContainText('ticks:');
  await expect(screen).toContainText('Enter: continue');await page.keyboard.press('Enter');
  await expect(screen).toContainText('ok',{timeout:20_000});
  await page.keyboard.type('traceroute bbs.world');await page.keyboard.press('Enter');
  await expect(screen).toContainText('1 1.2.9 T',{timeout:20_000});
  await expect(screen).toContainText('2 1.3.2 E',{timeout:20_000});
  await expect(screen).toContainText('Enter: continue');await page.keyboard.press('Enter');
  await expect(screen).toContainText('ok',{timeout:20_000});
  await page.keyboard.type('programs');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Troika programs',{timeout:20_000});
  await page.keyboard.press('2');
  await expect(screen).toContainText('Host (Enter):',{timeout:30_000});
  await page.keyboard.type('echo.world');await page.keyboard.press('Enter');
  await expect(screen).toContainText('Native echo. F1 disconnect.',{timeout:20_000});
  await page.keyboard.type('Hello terminal');await page.keyboard.press('Enter');
  await expect(screen).toContainText('\nHello terminal',{timeout:20_000});
  await page.keyboard.press('F1');
  await expect(screen).toContainText('Host (Enter):',{timeout:20_000});
  await page.keyboard.press('F2');
  await expect(screen).toContainText('Troika programs',{timeout:20_000});
  await page.keyboard.press('3');
  await expect(screen).toContainText('IRC room 1',{timeout:30_000});
  await page.keyboard.type('/say hello from guest');await page.keyboard.press('Enter');
  await expect(screen).toContainText('guest: hello from guest',{timeout:30_000});
  await page.keyboard.press('F2');
  await expect(screen).toContainText('Troika programs',{timeout:20_000});
  await page.keyboard.press('1');
  await expect(screen).toContainText('Welcome to Troika World',{timeout:30_000});
});

test('native camera and alarm controls work through the world keyboard and expose their machine', async ({page}) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const screen = page.getByTestId('world-screen');
  await expect(screen).toContainText('Welcome to Troika World', {timeout: 90_000});
  await page.getByRole('button', {name: 'F2 · Console', exact: true}).click();
  await expect(screen).toContainText('dir type del mkdir rmdir', {timeout: 20_000});
  await page.keyboard.type('open http://security.world/index'); await page.keyboard.press('Enter');
  await expect(screen).toContainText('Security station', {timeout: 20_000});
  await expect(screen).toContainText('@........');
  await page.keyboard.type('271'); await page.keyboard.press('Tab'); await page.keyboard.press('Backspace');
  await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect(screen).toContainText('Armed: 1 Alarm: 0', {timeout: 20_000});
  await page.keyboard.press('Enter');
  await expect(screen).toContainText('Armed: 1 Alarm: 1', {timeout: 20_000});
  await expect(screen).toContainText('.@.......');
  await page.getByRole('checkbox', {name: 'Inspect machines'}).check();
  await page.getByLabel('World machine').selectOption('security');
  await page.getByLabel('Memory address').fill('2509'); await page.getByLabel('Memory address').press('Enter');
  const value = page.locator('.inspector tr').filter({has: page.locator('td', {hasText: /^value$/})});
  await expect(value).toContainText('(1)');
});

test('live snapshots restore exact paused time and reject malformed hardware without losing the session', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/world.html');
  const transcript = page.getByTestId('world-screen');
  await expect(transcript).toContainText('Welcome to Troika World', {timeout: 90_000});
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', {name: 'Pause', exact: true}).click();
  await expect(page.getByRole('status')).toHaveText('Paused');
  const cycles = await page.getByTestId('world-cycles').textContent();
  const screen = await transcript.textContent();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Save snapshot', exact: true}).click();
  const path = test.info().outputPath('live.snapshot');
  await (await downloading).saveAs(path);
  await expect(page.getByRole('button', {name: 'Resume', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: 'Resume', exact: true}).click();
  await page.getByRole('button', {name: 'F2 · Console', exact: true}).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', {timeout: 20_000});
  await page.getByRole('button', {name: 'Pause', exact: true}).click();
  await expect(page.getByRole('status')).toHaveText('Paused');
  const consoleCycles = await page.getByTestId('world-cycles').textContent();
  const {readFile} = await import('node:fs/promises');
  const saved = JSON.parse(await readFile(path, 'utf8'));
  saved.world.hosts[saved.world.hosts.length - 1].cpu.memory.cells[100] = 65536;
  await page.getByLabel('World snapshot', {exact: true}).setInputFiles({name: 'invalid.snapshot', mimeType: 'application/octet-stream', buffer: Buffer.from(JSON.stringify(saved))});
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('world-cycles')).toHaveText(consoleCycles!);
  await expect(transcript).toContainText('dir type del mkdir rmdir');
  await page.getByLabel('World snapshot', {exact: true}).setInputFiles(path);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Paused');
  await expect(page.getByTestId('world-cycles')).toHaveText(cycles!);
  await expect(transcript).toHaveText(screen!);
  // A downloaded file must work in a fresh worker as well as rewind this one.
  await page.reload();
  await expect(page.getByRole('button', {name: 'Restore snapshot', exact: true})).toBeEnabled();
  await page.getByLabel('World snapshot', {exact: true}).setInputFiles(path);
  await expect(page.getByRole('status')).toHaveText('Paused');
  await expect(page.getByTestId('world-cycles')).toHaveText(cycles!);
  await expect(transcript).toHaveText(screen!);
  await page.getByRole('button', {name: 'Resume', exact: true}).click();
  await page.getByRole('button', {name: 'F2 · Console', exact: true}).click();
  await expect(transcript).toContainText('dir type del mkdir rmdir', {timeout: 20_000});
});
