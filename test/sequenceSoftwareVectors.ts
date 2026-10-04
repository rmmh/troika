import type { TextSoftware } from '../src/world/software/native';

/** Exhaustive subset/span references independent of the native streaming/DP algorithms. */
export function sequenceSoftwareVectors(app:TextSoftware):TextSoftware['examples'] {
  if(!['best-segment','rising-subseq','peak-drop','turning-points'].includes(app.id)) return [];
  const cases:TextSoftware['examples']=[];
  const lists:number[][]=[];
  for(let n=1;n<=9;n++) {
    lists.push(Array(n).fill(0),Array(n).fill(-99),Array(n).fill(99));
    for(let seed=0;seed<8;seed++) lists.push(Array.from({length:n},(_,i)=>((seed*37+i*i*13+i*seed*19)%199)-99));
  }
  // All short ternary sequences cover ties, plateaus and repeated extrema.
  for(let code=0;code<243;code++) {
    let k=code;const values:number[]=[];
    for(let i=0;i<5;i++) {values.push(k%3-1);k=Math.floor(k/3);}
    lists.push(values);
  }
  for(const a of lists) {
    let output='';
    if(app.id==='best-segment') {
      let sum=-Infinity,start=0,end=0;
      for(let i=0;i<a.length;i++) for(let j=i;j<a.length;j++) {
        const candidate=a.slice(i,j+1).reduce((x,y)=>x+y,0);
        if(candidate>sum) {sum=candidate;start=i;end=j;}
      }
      output=`sum=${sum} start=${start} end=${end}`;
    } else if(app.id==='rising-subseq') {
      let length=0;
      for(let mask=1;mask<2**a.length;mask++) {
        const selected=a.filter((_,i)=>mask&(1<<i));
        if(selected.every((x,i)=>i===0||x>selected[i-1]!)) length=Math.max(length,selected.length);
      }
      output=String(length);
    } else if(app.id==='peak-drop') {
      let drop=0,peak=0,trough=0;
      for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++) if(a[i]!-a[j]!>drop) {drop=a[i]!-a[j]!;peak=i;trough=j;}
      output=`drop=${drop} peak=${peak} trough=${trough}`;
    } else {
      const compact=a.filter((x,i)=>i===0||x!==a[i-1]);
      let peaks=0,troughs=0;
      for(let i=1;i+1<compact.length;i++) {
        if(compact[i]!>compact[i-1]!&&compact[i]!>compact[i+1]!) peaks++;
        if(compact[i]!<compact[i-1]!&&compact[i]!<compact[i+1]!) troughs++;
      }
      output=`peaks=${peaks} troughs=${troughs} turns=${peaks+troughs}`;
    }
    cases.push({input:a.join(' '),output});
  }
  for(const input of ['', ' ', '+', '-', '100', '-100', '1.5', '1,2', '1 2 3 4 5 6 7 8 9 0']) cases.push({input,error:true});
  return cases;
}
