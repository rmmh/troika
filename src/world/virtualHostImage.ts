import { linkFirmware } from '../firmware/link';
import { WORLD_BASIC_MODULES } from './browserImages';
import { headlessFatCheck } from './headlessCheck';

export interface VirtualHost { name: string; directory: string; }

/** Build-time configuration only. Native HTTP code chooses the disk root. */
export function buildVirtualHostFirmware(source: (name: string) => string, hosts: readonly VirtualHost[], host: number, plainPaths: readonly string[] = []) {
  if (!Number.isInteger(host) || host < 1 || host > 9841) throw new Error('Invalid server address');
  if (hosts.length < 1 || hosts.length > 27) throw new Error('Virtual host capacity is 1..27');
  const names = new Set<string>(), directories = new Set<string>();
  if (plainPaths.some(path => !/^\/[a-z0-9-]{1,7}$/.test(path))) throw new Error('Invalid plain-file path');
  const paths=[...new Set(plainPaths)];
  // Preserve exact membership, including gaps and independent binary/source
  // names. Nine 0/1 ternary digits fit in one positive tryte. A thousand
  // software names need a small immutable index instead of thousands of path
  // literals in resident code. Nonstandard paths retain the literal allowlist.
  const softwarePaths=paths.filter(path=>/^\/[pc][0-9]{4}$/.test(path) && Number(path.slice(2))<=9840);
  const softwareNames=new Set(softwarePaths);
  const literalPaths=paths.filter(path=>!softwareNames.has(path));
  const bitmap=(prefix:string)=>{
    const result:number[]=[];
    for(const path of softwarePaths.filter(path=>path[1]===prefix)) {
      const index=Number(path.slice(2)),slot=Math.floor(index/9);
      while(result.length<=slot) result.push(0);
      result[slot]!+=3**(index%9);
    }
    return result;
  };
  const binaries=bitmap('p'),sources=bitmap('c');
  const literalType=literalPaths.length ? 'M C @virtual_plain C S http_page_type ife A 2 M A 1 else M A 2 end O S P' : 'M A 2 O S P';
  const fileType=softwarePaths.length ? `C S http_software_type ife A 1 O S P end M A I M B K ${literalType}` : literalType;
  for (const entry of hosts) {
    if (entry.name.length > 54 || !entry.name.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ||
        !/^[a-z0-9]{3}$/.test(entry.directory) || names.has(entry.name) || directories.has(entry.directory)) {
      throw new Error('Invalid or duplicate virtual host');
    }
    names.add(entry.name); directories.add(entry.directory);
  }
  const replace = (input: string, before: string, after: string) => {
    if (input.split(before).length !== 2) throw new Error('Virtual HTTP source contract changed');
    return input.replace(before, after);
  };
  const request = replace(source('httpRequest'),
    'R E url_current_valid N E 1 J http_ok\n      C S url_same_origin ife A Z W h_host_match 1 end J http_ok',
    'J http_virtual_host');
  let files = replace(source('httpFiles'), 'R E h_host_match ifn E 1', 'R E h_host_match ife E Z');
  // This profile is read-only. Do not interpret form descriptors in the RAM
  // occupied by parked stream contexts; complete framing still precedes 405.
  files = replace(files, `R A hs_body_buffer E A Z M A 4010 R B h_length C S http_form_parse
          ifn A Z M A 400 J hs_empty end
          C S http_file_post ifl A Z J hs_fail end N A Z J hs_empty`, 'M A 405 J hs_empty');
  files = replace(files, `M A 5711 M B @hs_public M C 7 C S net_copy
        R E h_path_len
        ife E 1 M A 5718 M B @hs_index M C 6 C S net_copy M B 13
        else M A 5718 M B h_path M C E C S net_copy R B h_path_len A B 7 end
        M A 5711 C S fs_lookup`, 'C S http_virtual_lookup');
  return linkFirmware([
    {name: 'boot', source: 'J entry'},
    {name: 'virtualConfig', source: `$mx_slots: 3561
$mx_frame: 3318
$hm_bank_a: 2552
$hm_bank_b: 2935
$hm_body_cells: 0
$hf_count: 2500
$virtual_host_count: ${hosts.length}
$software_p_count: ${binaries.length}
$software_c_count: ${sources.length}`},
    ...[...WORLD_BASIC_MODULES, 'netWait', 'netEcho', 'dns', 'stream', 'streamData', 'streamMux',
      'url', 'http', 'httpRequest', 'httpEmit', 'httpFiles', 'httpVirtual', 'httpMux', ...literalPaths.length ? ['httpTypes'] : [], ...softwarePaths.length ? ['httpSoftwareTypes'] : []]
      .map(name => ({name, source: name === 'httpRequest' ? request : name === 'httpFiles' ? files :
        name === 'fatCheck' ? headlessFatCheck(source(name)) : source(name)})),
    {name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1
W 2067 1 W 2068 3 W 2069 ${host} W 2545 ${host}
W 2070 1 W 2071 3 W 2072 9
C S http_files_init N A Z J failed C S net_wait_init
C S http_mux_init N A Z J failed W 2198 1
loop: C S http_mux_step C S http_mux_wait J loop
http_file_type: ${fileType}
failed: W 2199 A H 0sAAA Z
virtual_hosts:
${hosts.map(entry => `${entry.name.length} "${entry.name}${entry.directory}"`).join('\n')}
${literalPaths.length ? `virtual_plain: ${literalPaths.map(path => `${path.length} "${path}"`).join(' ')} 0` : ''}
${softwarePaths.length ? `software_p_bits: ${binaries.length ? binaries.join(' ') : '0'}\nsoftware_c_bits: ${sources.length ? sources.join(' ') : '0'}` : ''}`},
  ], {allowMargin: true});
}
