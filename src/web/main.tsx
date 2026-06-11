import { render } from 'preact';
import { App } from './components/App';
import { EmulatorController } from './emulator';

const emu = new EmulatorController();
render(<App emu={emu} />, document.getElementById('app')!);
