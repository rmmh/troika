import type {TextSoftware} from './native';
const label=(name:string,s:string)=>{
  if(s.length>27||[...s.toUpperCase()].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)>90))throw Error(`Unsupported bitmap label: ${s}`);
  return `${name}: ${[...s].map(c=>c.charCodeAt(0)).concat(0).join(' ')}\n`;
};
// Fixed geometry only; all chord destinations and animated phases are computed
// by the guest. A pin is one of72 sampled points on a57-pixel-radius circle.
const coordinates=Array.from({length:72},(_,i)=>[81+Math.round(57*Math.cos(i*Math.PI/36)),81+Math.round(57*Math.sin(i*Math.PI/36))]);
const helpLines=['STRING ART CIRCLE','72 PINS ON A SAMPLED RING.','PIN I GOES TO (FACTOR*I','PLUS SHIFT) MODULO72.','LEFT/RIGHT: FACTOR1..24.','UP/DOWN: SHIFT ONE PIN.','ENTER REVERSES ANIMATION.','N ADVANCES SHIFT ONE PIN.','G RUN SPACE PAUSE.','EVEN/ODD CHORDS DIFFER.','TRY FACTORS2,3,5,11 OR23.','TAB COLORS R RESET.','H RETURNS F1 PROGRAMS.'];
export const STRING_ART_CIRCLE:TextSoftware={
  number:481,id:'string-art',site:'loom',title:'String Art Circle',kind:'text',bitmapVram:true,uiModule:'visualCanvasUi',
  inputs:['Native keyboard'],outputs:['Animated chord drawing'],examples:[{input:'',output:''}],
  launchHelp:'Left/right changes factor; up/down shifts. Enter reverses motion. N steps, G runs, Space pauses, Tab colors, H help, R resets, F1 programs.',
  description:'Stretch seventy-two colored chords around a ring of sampled pins. Pin i connects to (factor*i+shift) modulo72. Left/right sets factor1..24; Up/Down shifts the destination pins. Each N tick advances shift by one in the selected direction, wrapping the ring. Enter reverses direction; G animates and Space pauses. Alternating chord colors reveal overlapping envelopes, stars and woven patterns. This is modular string art; the circle is a fixed integer-pixel sampling, not an exact conic. H explains, R restores factor2/shift0, and Tab changes the palette.',
  algorithm:`
canvas_init: W 2700 2 W 2701 Z W 2702 1 O S P
canvas_key: ife A 83 R E 2700 ifg E 1 I E -1 W 2700 E end end ife A 84 R E 2700 ifl E 24 I E 1 W 2700 E end end ife A 89 R E 2701 I E -1 ifl E Z M E 71 end W 2701 E end ife A 90 R E 2701 I E 1 ifge E 72 M E Z end W 2701 E end ife A 88 R E 2702 P E -1 W 2702 E end O S P
canvas_step: R E 2701 R F 2702 A E F ifl E Z M E 71 end ifge E 72 M E Z end W 2701 E O S P
canvas_draw: C S vc_clear M I -9679 M E 162 K I E M I -7249 M E 108 K I E M L Z
sa_chord: R A 2700 P A L R E 2701 A A E M B 72 C S vc_div M I C P I 2 A I @sa_points R E I W 2710 E M E I/1 W 2711 E M A L M B 2 C S vc_div M E 1 ife C Z M E -1 end M I L P I 2 A I @sa_points R A I M B I/1 R C 2710 R D 2711 C S vc_line I L 1 ifl L 72 J sa_chord end M L Z
sa_pins: M I L P I 2 A I @sa_points R A I M B I/1 M C 1 C S vc_pixel I L 1 ifl L 72 J sa_pins end M A Z M B 10 M C @sa_keys M D -1 C S vc_text M A Z M B 145 M C @sa_status M D 1 C S vc_text R A 2700 C S sa_number M A 42 M B 145 M C 2800 M D 1 C S vc_text R A 2701 C S sa_number M A 96 M B 145 M C 2800 M D 1 C S vc_text R A 2702 C S sa_number M A 144 M B 145 M C 2800 M D 1 J vc_text
sa_number: M I 2800 ifl A Z W I 45 I I 1 P A -1 end M B 10 C S vc_div ifg A Z A A 48 W I A I I 1 end A C 48 W I C I I 1 W I Z O S P
canvas_help: ${helpLines.map((_,i)=>`M A Z M B ${19+i*8} M C @sa_help${i} M D 1 C S vc_text`).join(' ')} O S P
${helpLines.map((s,i)=>label('sa_help'+i,s)).join('')}
${label('sa_keys','ARROWS FACTOR/SHIFT ENT REV')}${label('sa_status','FACTOR    SHIFT    DIR')}
sa_points: ${coordinates.flat().join(' ')}
`,
};
