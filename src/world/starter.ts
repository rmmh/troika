import { xssLabPage, xssPreviewPage, XSS_LAB_NOTES } from './xssLab';
import { Machine, REG_P } from '../core/machine';
import { World } from '../core/world';
import { BlockMedium, type BlockDevice } from '../core/blockDevice';
import { TextDevice } from '../core/textDevice';
import { DisplayDevice } from '../core/displayDevice';
import { encodeText } from '../core/textEncoding';
import { encodeWide } from '../core/wide';
import { linkFirmware } from '../firmware/link';
import { linkPhasedFirmware } from '../firmware/phases';
import { createDiskImage } from '../firmware/diskImage';
import { takeawayGamePage, TAKEAWAY_RULES } from './takeawayGame';
import { guessGamePage } from './guessGame';
import { trustLabPage, TRUST_LAB_NOTES } from './trustLab';

const counted = (s: string) => `${s.length}:${s}`;
const page = (...records: string[]) => encodeText(`PAGE 1\n${records.join('\n')}\n`);
const text = (s: string) => `T ${counted(s)}`;
const link = (label: string, path: string) => `L ${counted(label)} ${counted(path)}`;

/** Initial media only. Every request, lookup, script and route runs on a guest. */
export function createStarterWorld(source: (name: string) => string, options: { serverDisk?: ArrayLike<number>; clientDisk?: ArrayLike<number>; archiveDisk?: ArrayLike<number> } = {}) {
  const module = (name: string) => ({ name, source: source(name) });
  const basic = ['block','fat','fatCheck','fatWrite','serial','netDevice','frame','network'];
  const clientImage = linkPhasedFirmware({ capacity: 1906, allowMargin: true,
    resident: [{ name: 'boot', source: 'J world_browser_entry' }, ...[...basic,'dns','dnsClient','dhcpClient','stream','streamData','url','forthVm','forthPage','forthLookup','pageState','http','httpClient','image','browserConnect','browserResponse','browser','browserDhcpBoot'].map(module),
      { name: 'powerOn', source: 'world_browser_entry: R E 68 N E 4 J world_browser_entry R E 69 J browser_entry' }],
    phases: {
      upload: ['uploadPhase'].map(module),
      filecopy: ['copyPhase','fatMutate','fatGrow','fatCopy','fatRename','fatAdmin'].map(module),
      console: ['consolePhase','fatSpace','text','console'].map(module),
      compile: ['pageCompilePhase','forthLex','forthCompile','page'].map(module),
      interact: ['pageInteractPhase','httpSend','pageForm','text','pageView','pageInput','pageUi','pageKeys','pageRequest','pageTransmit'].map(module),
      download: ['downloadPhase','fatMutate','fatGrow','downloadBody'].map(module),
    },
  });
  const serverImage = linkFirmware([...basic,'fatMutate','fatGrow','dns','stream','streamData','url','http','httpRequest','httpEmit','httpForm','httpFiles','httpTypes','noticeboard','topics','topicCatalog','xssPreview'].map(module).concat([{ name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 2 W 2545 2
      W 2070 1 W 2071 3 W 2072 9
      M A @origin M B 17 C S url_parse N A Z J failed C S url_commit
      C S http_files_init N A Z J failed W hs_prepare @topic_catalog W nb_topic @bbs_post
loop: C S http_files_step J loop
bbs_post: C S xss_preview_post N A -138 O S P J topic_post
http_file_type:
      U S A U S B C S topic_is_path M E A O S B O S A E E 1 J hpt_page
      ife B 7
        M I A M E I/6
        ifge E 30 ifle E 33 M B 6 M C @forum_types J http_page_type end end
      end
      M C @page_types J http_page_type
failed: W 2199 A H 0sAAA Z
origin: "http://bbs.world/"
forum_types: 6 "/board" 6 "/games" 6 "/build" 0
page_types: 6 "/xedit" 7 "/xsslab" 8 "/xunsafe" 6 "/xsafe" 9 "/newtopic" 1 "/" 6 "/index" 4 "/lab" 5 "/game" 5 "/take" 6 "/board" 6 "/forum" 6 "/games" 6 "/build" 6 "/trust" 6 "/files" 0` }]), { allowMargin: true });
  const archiveImage = linkFirmware([...basic,'fatMutate','fatGrow','dns','stream','streamData','url','http','httpRequest','httpEmit','httpForm','httpFiles','httpTypes','share','catalog','upload'].map(module).concat([{ name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 4 W 2545 5
      W 2070 1 W 2071 3 W 2072 9
      M A @origin M B 19 C S url_parse N A Z J failed C S url_commit
      C S http_files_init N A Z J failed W hs_prepare @share_catalog W hs_upload @share_upload
loop: C S http_files_step J loop
http_file_type: M C @page_types J http_page_type
failed: W 2199 A H 0sAAA Z
origin: "http://files.world/"
page_types: 1 "/" 6 "/index" 5 "/game" 6 "/share" 0` }]), { allowMargin: true });
  function service(role: string, host: number, subnet: number, setup: string) {
    return linkFirmware([...basic, 'dns', role].map(module).concat([{ name: 'startup', source: `
entry: M S 5710 W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 ${subnet} W 2069 ${host}
      W 2545 ${role === 'dnsServer' ? 4 : host} ${setup}` }]));
  }
  const dhcpImage = service('dhcpServer', 3, 2, `
      W 2070 1 W 2071 2 W 2072 9 W 2073 1 W 2074 3 W 2075 3
      W dhcps_count 1 W dhcps_pool 7 W dhcps_duration 243 C S dhcp_server_init
loop: C S net_poll ifg A Z C S dhcp_server_input C S net_discard_input end J loop`);
  const dnsImage = service('dnsServer', 3, 3, `
      W 2070 1 W 2071 3 W 2072 9 C S dns_server_init
loop: C S net_poll ifg A Z C S dns_server_input C S net_discard_input end C S net_service J loop`);
  const routerImage = service('router', 9, 2, `
      W net_iface_count 2 W 2093 122 W 2094 1 W 2095 3 W 2096 9
      W router_route_count 2 W 2200 1 W 2201 1 W 2202 2 W 2207 1 W 2208 1 W 2209 3 W 2210 1 C S router_init
loop: C S net_poll E A 1 C S router_input C S router_service J loop`);
  const files = {
    '/public/index': page(text('Welcome to Troika World'), text('Native computers, two LANs.'),
      link('Forth lab', '/lab'), link('File library', '/files'), link('News', '/news'), link('Noticeboard', '/board'), link('Guess the digit', '/game'), link('Files World', 'http://files.world/index'), link('Forum topics', '/forum'), link('Trust lab', '/trust'), link('Takeaway', '/take'), link('Template lab', '/xsslab')),
    '/public/xsslab': xssLabPage(),
    '/public/xedit': xssPreviewPage(true),
    '/public/xunsafe': xssPreviewPage(true),
    '/public/xsafe': xssPreviewPage(false),
    '/public/xssnotes': encodeText(XSS_LAB_NOTES),
    '/public/newtopic': page(text('New community topic'), text('Name: 1-10 a-z, 0-9, _'), 'F 13:/app/newtopic', 'I 5:topic 0:', 'I 3:msg 0:', 'S 6:Create', link('Topics', '/topics'), text('Names are public; replies are literal.')),
    '/public/forum': page(text('Troika forums'), link('General noticeboard', '/board'), link('Game discussion', '/games'), link('Building Troika', '/build'), link('Home', '/index'), link('Community topics', '/topics')),
    '/public/games': page(text('Game discussion'), 'F 9:/app/game', 'I 3:msg 0:', 'S 5:Reply', link('All topics', '/forum'), link('Home', '/index'), text('Share scores and game ideas.'), link('Next page', '/games2')),
    '/public/build': page(text('Building Troika'), 'F 9:/app/code', 'I 3:msg 0:', 'S 5:Reply', link('All topics', '/forum'), link('Home', '/index'), text('Discuss programs and hardware.'), link('Next page', '/build2')),
    '/public/trust': trustLabPage(),
    '/public/trustnotes': encodeText(TRUST_LAB_NOTES),
    '/public/game': guessGamePage(),
    '/public/take': takeawayGamePage(),
    '/public/takerules': encodeText(TAKEAWAY_RULES),
    '/public/board': page(text('Noticeboard'), 'F 9:/app/post', 'I 3:msg 0:', 'S 4:Post', link('Home', '/index'), link('All topics', '/forum'), text('Messages are stored on disk.'), link('Next page', '/board2')),
    '/public/lab': page(text('-'.repeat(54)), text('Edit the field, then Enter.'), 'F 9:/app/echo',
      `I 4:text ${counted('Hello from native Forth')}`, 'S 5:Apply', link('Home', '/index'),
      `C ${counted(': LOAD 0 FIELD@ 0 TEXT! ; : SUBMIT 0 FIELD@ 0 TEXT! ;')}`),
    '/public/files': page(text('Public file library'), link('Readme', '/readme'), link('Home', '/index'), text('F3 saves the selected link.'), text('F2 opens the file console.'), text('Save: get /readme /copy'), text('CLI: blank line executes.')),
    '/public/readme': encodeText('Files live on the server disk. HTTP, FAT, routing and Forth execute on native Troika CPUs.\n'),
    '/public/news': encodeText('World services are online.\nThe noticeboard and digit game are open. F2 opens the local file console. Separate forum topics are now open.\n'),
  };
  const forumFiles: Record<string, number[]> = {};
  for (const [topic, action, title] of [['board','post','Noticeboard'], ['games','game','Game discussion'], ['build','code','Building Troika']]) {
    for (let number = 2; number <= 5; number++) {
      forumFiles[`/public/${topic}${number}`] = page(text(`${title} (${number}/5)`),
        `F ${counted(`/app/${action}${number}`)}`, 'I 3:msg 0:', 'S 5:Reply', link('All topics', '/forum'), link('Home', '/index'),
        link('Previous page', `/${topic}${number === 2 ? '' : number - 1}`),
        ...(number < 5 ? [link('Next page', `/${topic}${number + 1}`)] : []));
    }
  }
  const archiveFiles = {
    '/public/index': page(text('Files World archive'), text('A separate native server.'),
      link('Archive readme', '/readme'), link('Play digit game', '/game'), link('Visit the BBS', 'http://bbs.world/index'),
      text('F2: get /readme /archive'), text('Binary: get /sample /sample'), link('Share a text file', '/share'), link('Browse shared files', '/catalog'), text('F3 saves the selected link.')),
    '/public/readme': encodeText('Files World owns this disk.\nDownload files from this independent server through the native console.\n'),
    '/public/game': guessGamePage(),
    '/public/share': page(text('Share a text file'), text('Name: 1-10 a-z, 0-9, _'), text('Text: at most 54 cells'), 'F 10:/app/share', 'I 4:name 0:', 'I 4:text 0:', 'S 7:Publish', link('Home', '/index'), text('Read it at /shared/name'), text('Public names can be replaced.')),
    '/public/shared/welcome': encodeText('Public text files live here.\n'),
    '/public/sample': [-9841, 0, 9841, -54, 54, 1, -1],
  };
  const world = new World();
  const images = { client: clientImage.resident, server: serverImage, archive: archiveImage, dhcp: dhcpImage, dns: dnsImage, router: routerImage };
  const machines = {} as Record<keyof typeof images, Machine>;
  const disks = {} as Record<keyof typeof images, BlockMedium>;
  const controllers = {} as Record<keyof typeof images, BlockDevice>;
  for (const [name, image] of Object.entries(images) as [keyof typeof images, typeof serverImage][]) {
    const m = world.addMachine(name); machines[name] = m;
    for (const c of image.image.chunks) c.data.forEach((v, i) => m.poke(c.addr + i, v));
    m.poke(REG_P, name === 'client' ? image.image.entry! : image.image.labels.get('entry')!);
    const id = { client: 1, server: 2, archive: 5, dhcp: 3, dns: 4, router: 9 }[name];
    const phaseFiles = name === 'client' ? Object.fromEntries(Object.entries(clientImage.phases).map(([n, p]) => [`/${n}`, p.file])) : {};
    const media = createDiskImage({ blocks: 81, volumeId: [0,0,id], files: { '/net.seq': encodeWide(1), ...phaseFiles, ...(name === 'server' ? { ...files, ...forumFiles } : name === 'archive' ? archiveFiles : {}) } });
    const retained = name === 'server' ? options.serverDisk : name === 'client' ? options.clientDisk : name === 'archive' ? options.archiveDisk : undefined;
    disks[name] = new BlockMedium(81, false, retained ?? media);
    controllers[name] = world.addDisk(name, [disks[name]]);
    world.addInterface(name, 4, [0,0,id * 10], name === 'server' || name === 'archive' || name === 'dns' ? 'b' : 'a');
  }
  world.addInterface('router', 5, [0,0,91], 'b');
  const names = [['bbs.world', 2], ['files.world', 4]] as const;
  machines.dns.poke(2280, names.length);
  names.forEach(([name, host], index) => {
    const base = 2552 + index * 63;
    machines.dns.poke(base, name.length);
    encodeText(name).forEach((v, i) => machines.dns.poke(base + 1 + i, v));
    [1,3,host,729].forEach((v, i) => machines.dns.poke(base + 55 + i, v));
  });
  const keyboard = new TextDevice(); machines.client.attach(keyboard);
  const display = new DisplayDevice(a => machines.client.peek(a), (a, v) => machines.client.poke(a, v));
  machines.client.attach(display);
  return { world, machines, keyboard, display, images, disks, controllers };
}

/** Read the physical mode-T display; this does not interpret page records. */
export function starterScreen(machine: Machine): string {
  return Array.from({ length: 27 }, (_, row) => Array.from({ length: 27 }, (_, col) => {
    const value = machine.peek(-9841 + row * 27 + col);
    const glyph = value - Math.floor((value + 364) / 729) * 729;
    return glyph >= 32 && glyph <= 126 ? String.fromCharCode(glyph) : ' ';
  }).join('').trimEnd()).join('\n').trimEnd();
}
