import { linkPhasedFirmware } from '../firmware/phases';
export const WORLD_BASIC_MODULES = ['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network'];
/** Identical browser and disk phases; only NIC policy and native controller differ. */
export function buildWorldBrowser(source:(name:string)=>string, npc=false) {
  const module=(name:string)=>({name,source:source(name)});
  const basic=WORLD_BASIC_MODULES;
  return linkPhasedFirmware({ capacity: 1906, allowMargin: true,
    resident: [{ name: 'boot', source: npc ? 'J npc_entry' : 'J world_browser_entry' }, ...[...basic,'dns','dnsClient',...(npc ? [] : ['dhcpClient']),'stream','streamData','url','forthVm','forthPage','forthLookup','pageState','http','httpClient','image','browserConnect','browserResponse','browser',...(npc ? ['npcBrowser'] : ['browserDhcpBoot'])].map(module),
      ...(npc ? [] : [{ name: 'powerOn', source: 'world_browser_entry: R E 68 N E 4 J world_browser_entry R E 69 J browser_entry' }])],
    phases: {
      upload: ['uploadPhase'].map(module),
      filecopy: ['copyPhase','fatMutate','fatGrow','fatCopy','fatRename','fatAdmin'].map(module),
      console: ['consolePhase','fatSpace','text','console'].map(module),
      compile: ['pageCompilePhase','forthLex','forthCompile','page'].map(module),
      interact: ['pageInteractPhase','httpSend','pageForm','text','pageView','pageInput','pageUi','pageKeys','pageRequest','pageTransmit'].map(module),
      download: ['downloadPhase','fatMutate','fatGrow','downloadBody'].map(module),
    },
  });
}
