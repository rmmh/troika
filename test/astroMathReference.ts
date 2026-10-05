/** Independent test-only arbitrary precision oracle. Production never imports it. */
export const ASTRO_RADIX=81n,ASTRO_SCALE=3n**27n,ASTRO_LIMIT=(81n**10n-1n)/2n;
export function nearest(n:bigint,d:bigint){const sign=n<0n?-1n:1n,v=n<0n?-n:n;return sign*((v+(d-1n)/2n)/d);}
export function astroEncode(n:bigint,count=10,radix=81n){const out:number[]=[];for(let i=0;i<count;i++){const q=nearest(n,radix);out.push(Number(n-q*radix));n=q;}if(n)throw Error('Outside limb range');return out;}
export function astroDecode(limbs:number[],radix=81n){return limbs.reduceRight((n,d)=>n*radix+BigInt(d),0n);}
export function astroClenshaw(coefficients:bigint[],x:bigint){let next=0n,after=0n;for(let k=coefficients.length-1;k>=1;k--){const current=coefficients[k]!+nearest(2n*x*next,ASTRO_SCALE)-after;after=next;next=current;}return coefficients[0]!+nearest(x*next,ASTRO_SCALE)-after;}
/** Different polynomial recurrence, useful to bound accumulated rounding. */
export function astroDirect(coefficients:bigint[],x:bigint){let a=ASTRO_SCALE,b=x,total=coefficients[0]!*a;for(let k=1;k<coefficients.length;k++){total+=coefficients[k]!*b;const c=nearest(2n*x*b,ASTRO_SCALE)-a;a=b;b=c;}return nearest(total,ASTRO_SCALE);}
/** Exact rational Chebyshev polynomial, independent of the Clenshaw recurrence. */
export function astroRational(coefficients:bigint[],x:bigint){const n=coefficients.length-1;let prev=1n,current=x,total=coefficients[0]!*ASTRO_SCALE**BigInt(n);for(let k=1;k<=n;k++){total+=coefficients[k]!*current*ASTRO_SCALE**BigInt(n-k);const next=2n*x*current-ASTRO_SCALE*ASTRO_SCALE*prev;prev=current;current=next;}return nearest(total,ASTRO_SCALE**BigInt(n));}
