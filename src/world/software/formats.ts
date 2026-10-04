import type { TextSoftware } from './native';

const bad = 'app_bad: M A -1 O S P';
const nibble = `app_nibble:
 ifge A 48 ifle A 57 S A 48 O S P end end
 ifge A 65 ifle A 70 S A 55 O S P end end
 ifge A 97 ifle A 102 S A 87 O S P end end M A -1 O S P`;
const hexbyte = `app_hexbyte:
 M C A Q C 16 M D C P D 16 ifg D A I C -1 S D 16 end S A D M D A
 M A C C S app_hex C S app_put M A D C S app_hex J app_put
app_hex: ifl A 10 A A 48 else A A 55 end O S P`;
const entities = [['amp',38],['lt',60],['gt',62],['quot',34],['apos',39]] as const;
const ascii = (s:string) => [...s].map(c=>c.charCodeAt(0)).join(' ');

export const FORMAT_SOFTWARE: TextSoftware[] = [
  {
    number:39,kind:'text',id:'uri-encode',site:'zine',title:'URI component encoder',
    description:'Percent-encodes a printable ASCII URI component. Only letters, digits, hyphen, period, underscore and tilde remain literal. Spaces become %20; plus signs become %2B. This is not whole-URL encoding.',
    inputs:['Component'],outputs:['Encoded'],
    algorithm:`app_compute: M J 2552 R K 2610
app_next: E K Z M A Z E K Z O S P R A J M G A
 ifge A 65 ifle A 90 J app_literal end end ifge A 97 ifle A 122 J app_literal end end
 ifge A 48 ifle A 57 J app_literal end end
 E A 45 J app_literal E A 46 J app_literal E A 95 J app_literal E A 126 J app_literal
 M A 37 C S app_put M A G C S app_hexbyte J app_advance
app_literal: C S app_put
app_advance: I J 1 I K -1 J app_next
${hexbyte}`,
    examples:[{input:'hello world+a/b?',output:'hello%20world%2Ba%2Fb%3F'},{input:'Az09-._~',output:'Az09-._~'},{input:'%'.repeat(54),output:'%25'.repeat(54)},{input:'',output:''}],
  },
  {
    number:40,kind:'text',id:'uri-decode',site:'station',title:'URI component decoder',
    description:'Decodes percent escapes to printable ASCII. Hex digits may use either case. Plus remains plus. Rejects truncated or nonhex escapes and bytes outside 20..7E, including encoded controls and non-ASCII bytes.',
    inputs:['Encoded text'],outputs:['Decoded'],
    algorithm:`app_compute: M J 2552 R K 2610
app_next: E K Z M A Z E K Z O S P R A J
 ife A 37 ifl K 3 J app_bad end I J 1 R A J C S app_nibble ifl A Z J app_bad end M G A P G 16
 I J 1 R A J C S app_nibble ifl A Z J app_bad end A A G ifl A 32 J app_bad end ifg A 126 J app_bad end I K -2 end
 C S app_put I J 1 I K -1 J app_next
${nibble}
${bad}`,
    examples:[{input:'a%20b%2fc+',output:'a b/c+'},{input:'%25%7E',output:'%~'},{input:'%',error:true},{input:'%2',error:true},{input:'%GG',error:true},{input:'%00',error:true},{input:'%80',error:true},{input:'',output:''}],
  },
  {
    number:41,kind:'text',id:'html-escape',site:'typecase',title:'Markup text escaper',
    description:'Escapes ampersands, angle brackets and both quote characters as named entities. Other printable ASCII is preserved. Rejects an expanded result above 162 characters; escaping is applied once to each original character.',
    inputs:['Plain text'],outputs:['Escaped text'],
    algorithm:`app_compute: M G 2552 R H 2610
app_next: E H Z M A Z E H Z O S P R A G
${entities.map(([name,value])=>` E A ${value} J app_${name}`).join('\n')}
 C S app_put J app_advance
${entities.map(([name])=>`app_${name}: M A @app_literal_${name} M B ${name.length+2} C S app_emit J app_advance`).join('\n')}
app_advance: N A Z O S P I G 1 I H -1 J app_next
${entities.map(([name])=>`app_literal_${name}: ${ascii('&'+name+';')}`).join('\n')}`,
    examples:[{input:'<a x="&">',output:'&lt;a x=&quot;&amp;&quot;&gt;'},{input:"' &amp;",output:'&apos; &amp;amp;'},{input:'"'.repeat(27),output:'&quot;'.repeat(27)},{input:'"'.repeat(28),error:true},{input:'',output:''}],
  },
  {
    number:42,kind:'text',id:'html-unescape',site:'paper',title:'Markup entity decoder',
    description:'Decodes exactly &amp;, &lt;, &gt;, &quot; and &apos;, case-sensitively and once only. Rejects unknown, numeric or unterminated entities. Other printable ASCII remains literal; this is not a full HTML parser.',
    inputs:['Entity text'],outputs:['Decoded text'],
    algorithm:`app_compute: M G 2552 R H 2610
app_next: E H Z M A Z E H Z O S P R A G ifn A 38 C S app_put I G 1 I H -1 J app_next end
 M L @app_entities
app_try: R B L E B Z J app_bad ifg B H J app_skip end M J G M K L I K 2 M C B
app_compare: R E J R F K N E F J app_skip I J 1 I K 1 I C -1 N C Z J app_compare
 M I L I I 1 R A I C S app_put A G B S H B J app_next
app_skip: A L B I L 2 J app_try
${bad}
app_entities: ${entities.map(([name,value])=>`${name.length+2} ${value} ${ascii('&'+name+';')}`).join('\n')} 0`,
    examples:[{input:'&lt;a&gt; &amp; &quot;&apos;',output:'<a> & "\''},{input:'&amp;lt;',output:'&lt;'},{input:'&bogus;',error:true},{input:'&#65;',error:true},{input:'&amp',error:true},{input:'&AMP;',error:true},{input:'',output:''}],
  },
  {
    number:43,kind:'text',id:'json-quote',site:'ada',title:'JSON string writer',
    description:'Wraps printable ASCII text as one JSON string literal, escaping double quotes and backslashes. Input is plain text, not JSON. Controls and non-ASCII are outside this keyboard tool\'s input domain.',
    inputs:['Plain text'],outputs:['JSON string'],
    algorithm:`app_compute: M J 2552 R K 2610 M A 34 C S app_put
app_next: E K Z J app_finish R G J ife G 34 M A 92 C S app_put end ife G 92 M A 92 C S app_put end M A G C S app_put I J 1 I K -1 J app_next
app_finish: M A 34 J app_put`,
    examples:[{input:'hello',output:'"hello"'},{input:'a"b\\c',output:'"a\\"b\\\\c"'},{input:'\\'.repeat(54),output:'"'+'\\\\'.repeat(54)+'"'},{input:'',output:'""'}],
  },
  {
    number:44,kind:'text',id:'json-unquote',site:'archivist',title:'JSON string reader',
    description:'Reads exactly one JSON string with no outer whitespace. Accepts literal printable ASCII, escaped quotes/slashes/backslashes, and \\u00XX escapes for printable ASCII. Rejects control escapes, non-ASCII Unicode and malformed or trailing content.',
    inputs:['JSON string'],outputs:['Plain text'],
    algorithm:`app_compute: R K 2610 ifl K 2 J app_bad end R E 2552 N E 34 J app_bad M I 2551 A I K R E I N E 34 J app_bad M J 2553 I K -2
app_next: E K Z M A Z E K Z O S P R A J E A 34 J app_bad
 ife A 92 I J 1 I K -1 E K Z J app_bad R A J
 E A 117 J app_unicode E A 34 J app_write E A 92 J app_write E A 47 J app_write J app_bad end
app_write: C S app_put I J 1 I K -1 J app_next
app_unicode: ifl K 5 J app_bad end N J/1 48 J app_bad N J/2 48 J app_bad M A J/3 C S app_nibble ifl A Z J app_bad end M G A P G 16 M A J/4 C S app_nibble ifl A Z J app_bad end A A G ifl A 32 J app_bad end ifg A 126 J app_bad end C S app_put I J 5 I K -5 J app_next
${nibble}
${bad}`,
    examples:[{input:'"hello"',output:'hello'},{input:'"a\\"b\\\\c\\/"',output:'a"b\\c/'},{input:'"\\u0041\\u007e"',output:'A~'},{input:'""',output:''},{input:'"\\n"',error:true},{input:'"\\u001F"',error:true},{input:'"\\u00FF"',error:true},{input:'"a"b"',error:true},{input:'"unterminated',error:true},{input:'',error:true}],
  },
  {
    number:45,kind:'text',id:'csv-quote',site:'menus',title:'CSV field writer',
    description:'Serializes a single printable ASCII CSV field. Always surrounds it with double quotes and doubles each embedded quote. Commas belong to the field; this tool does not write multiple rows.',
    inputs:['Field text'],outputs:['Quoted field'],
    algorithm:`app_compute: M J 2552 R K 2610 M A 34 C S app_put
app_next: E K Z J app_finish R G J ife G 34 M A 34 C S app_put end M A G C S app_put I J 1 I K -1 J app_next
app_finish: M A 34 J app_put`,
    examples:[{input:'a,b',output:'"a,b"'},{input:'say "hi"',output:'"say ""hi"""'},{input:'"'.repeat(54),output:'"'.repeat(110)},{input:'',output:'""'}],
  },
  {
    number:46,kind:'text',id:'csv-unquote',site:'toolshed',title:'CSV field reader',
    description:'Reads one printable ASCII CSV field, quoted or unquoted. Quoted fields may contain commas and doubled quotes. Rejects extra columns, unmatched or stray quotes, and text after the closing quote. Spaces are preserved.',
    inputs:['Serialized field'],outputs:['Field text'],
    algorithm:`app_compute: M J 2552 R K 2610 E K Z M A Z E K Z O S P R A J E A 34 J app_quoted
app_plain: E K Z M A Z E K Z O S P R A J E A 34 J app_bad E A 44 J app_bad C S app_put I J 1 I K -1 J app_plain
app_quoted: I J 1 I K -1
app_next: E K Z J app_bad R A J
 ife A 34 ife K 1 M A Z O S P end ifl K 3 J app_bad end N J/1 34 J app_bad I J 1 I K -1 end
 C S app_put I J 1 I K -1 J app_next
${bad}`,
    examples:[{input:'"a,b"',output:'a,b'},{input:'"say ""hi"""',output:'say "hi"'},{input:' a ',output:' a '},{input:'""',output:''},{input:'',output:''},{input:'a,b',error:true},{input:'"a",b',error:true},{input:'"a"x',error:true},{input:'"a',error:true},{input:'"""',error:true}],
  },
];
