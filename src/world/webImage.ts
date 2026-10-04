import { linkPhasedFirmware } from '../firmware/phases';
import { buildProgramImage } from '../firmware/programImage';
import type { buildProgramCore } from '../firmware/programCore';
import { WORLD_BASIC_MODULES } from './browserImages';

/** Static source variants; all execution and phase replacement remains native. */
function replace(source: string, old: string, next: string) {
  if (!source.includes(old)) throw new Error(`web overlay source contract changed: ${old}`);
  return source.replace(old, next);
}
export function buildWebOverlay(core: ReturnType<typeof buildProgramCore>, source: (name: string) => string) {
  const vm = source('forthVm'), split = vm.indexOf('f_invoke:');
  if (split < 0) throw new Error('missing Forth runtime boundary');
  const module = (name: string) => ({name,source:source(name)});
  let browser = source('browser');
  browser = replace(browser, 'W block_service_vector Z R B serial_unit C S fs_mount N A Z J bu_fail\n      C S fs_check N A Z J bu_fail C S f_reset',
    'W block_service_vector Z R E fs_mounted ifn E 2\n        R B serial_unit C S fs_mount N A Z J bu_fail C S fs_check N A Z J bu_fail\n      end C S f_reset');
  browser = replace(browser, 'E A Z J bu_ready\n        ifge A 4', 'E A Z J bu_ready\n        E A 13 J web_program_menu\n        ifge A 4');
  browser = replace(browser, 'M A Z M B Z C S image_call N A Z J bu_fail end', 'C S bu_forth_load N A Z J bu_fail end');
  browser = replace(browser, 'bu_action:\n      R E f_action', `bu_action:
      R E f_action
      ife E 5
        R B bu_forth_event C S bu_run_forth N A Z J bu_fail
        M A Z M B 15 C S image_call N A Z J bu_fail
        R E f_action E E Z J bu_ready
      end
      R E f_action`);
  let interact = source('pageInteractPhase');
  interact = replace(interact, 'E B 14 J page_request_target M A -119', 'E B 14 J page_request_target E B 15 J pu_render M A -119');
  const event = interact.indexOf('pi_load:');
  if (event < 0) throw new Error('missing interaction event boundary');
  interact = interact.slice(0, event) + `pi_load: W bu_forth_event Z W f_action 5 J pp_ok
pi_submit: W bu_forth_event 1 W f_action 5 J pp_ok\n`;
  let consoleSource = source('console');
  const commandLine = consoleSource.split('\n').find(line => line.startsWith('cs_commands:'));
  if (!commandLine?.endsWith(' 0')) throw new Error('missing console command table');
  consoleSource = replace(consoleSource, commandLine, commandLine.slice(0,-2) + ' 8 20 "programs" 0');
  consoleSource = replace(consoleSource, '6 19 "telnet" ', '');
  consoleSource = replace(consoleSource, 'ping trace telnet', 'ping trace programs');
  consoleSource = replace(consoleSource, 'M B 105 C S cs_print', 'M B 107 C S cs_print');
  consoleSource = replace(consoleSource, 'telnet HOST\\n', 'programs\\n');
  consoleSource = replace(consoleSource, 'M B 454 C S cs_print', 'M B 451 C S cs_print');
  const shared = new Set(['block','fat','fatCheck','fatWrite']);
  const built = linkPhasedFirmware({capacity:1906,allowMargin:true,regions:core.regions,externals:core.externals,
    resident:[{name:'coreDefinitions',source:core.definitions},
      ...[...WORLD_BASIC_MODULES.filter(name=>!shared.has(name)), 'dns','dnsClient','dhcpClient','stream','streamData','url'].map(module),
      {name:'forthState',source:vm.slice(0,split)},
      ...['forthLookup','pageState','http','httpClient','image','browserConnect','browserResponse','webProgram'].map(module),
      {name:'browser',source:browser},{name:'browserDhcpBoot',source:replace(source('browserDhcpBoot'),'browser_entry:\n','browser_entry:\n      W 2532 1\n')}],
    phases:{
      forth:[module('pageForthPhase'),{name:'forthRuntime',source:vm.slice(split)},module('forthPage')],
      upload:['uploadPhase','probe','probeConsole','text'].map(module),
      filecopy:['copyPhase','fatMutate','fatGrow','fatCopy','fatRename','fatAdmin'].map(module),
      console:[...['consolePhase','fatSpace','text'].map(module),{name:'console',source:consoleSource}],
      compile:['pageCompilePhase','forthLex','forthCompile','page'].map(module),
      interact:[{name:'pageInteractPhase',source:interact},...['httpSend','pageForm','text','pageView','pageInput','pageUi','pageKeys','pageRequest','pageTransmit'].map(module)],
      download:['downloadPhase','fatMutate','fatGrow','downloadBody'].map(module),
    },
  });
  return {...built,...buildProgramImage(built.resident,built.resident.image.labels.get('browser_entry')!)};
}
