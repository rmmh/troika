import type { TextSoftware } from '../src/world/software/native';
export function networkSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  const cases:TextSoftware['examples']=[];
  if(app.id==='ipv4-cidr') {
    const ips=['0.0.0.0','255.255.255.255','1.2.3.4','127.128.254.255','192.168.1.42','10.99.17.201','128.0.0.1','001.002.003.004'];
    const dotted=(n:bigint)=>[24n,16n,8n,0n].map(shift=>Number(n>>shift&255n)).join('.');
    for(let prefix=0;prefix<=32;prefix++)for(const ip of ips) {
      const value=ip.split('.').reduce((n,part)=>n*256n+BigInt(part),0n);
      const all=(1n<<32n)-1n,host=(1n<<BigInt(32-prefix))-1n,mask=all^host,network=value&mask;
      cases.push({input:`${ip}/${prefix}`,output:`net=${dotted(network)} last=${dotted(network|host)} mask=${dotted(mask)}`});
    }
    for(const input of ['', '1.2.3.4', '1.2.3/24','1.2.3.4.5/24','1.2.3.4/33','1.2.3.4/-1','1.2.3.4/','1.2.3.4/1/2','1..3.4/24','256.0.0.0/0','0.0.0.999/32','0000.0.0.0/0',' 1.2.3.4/24','1.2.3.4/24 ','1.2.3.4/+1','1.2.3.4/0000','a.2.3.4/2'])cases.push({input,error:true});
  } else if(app.id==='mac-inspect') {
    for(let first=0;first<256;first++) {
      const bytes=[first,255-first,first^85,first^170,0,255],canonical=bytes.map(b=>b.toString(16).padStart(2,'0')).join(':');
      cases.push({input:first%2?canonical.toUpperCase():canonical,output:`${canonical.toUpperCase()} group=${first&1} local=${first>>1&1}`});
    }
    for(const input of ['', '0:00:00:00:00:00','000:00:00:00:00:00','00-00-00-00-00-00','00:00:00:00:00','00:00:00:00:00:00:00','0g:00:00:00:00:00','00:00:00:00:00:GG',' 00:00:00:00:00:00','00:00:00:00:00:00 ','00:00:00:00:00:0/'])cases.push({input,error:true});
  }
  return cases;
}
