// core.mjs – utilities + indicators (pure functions, koi network nahi)
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export const VERSION='3.0.0';
export const fin=v=>typeof v=='number'&&isFinite(v);
export const ISTms=()=>Date.now()+19800000;
export const ISTd=ms=>new Date((ms==null?Date.now():ms)+19800000).toISOString().slice(0,10);
export const ISTm=()=>{const d=new Date(ISTms());return d.getUTCHours()*60+d.getUTCMinutes()};
export const isWeekday=()=>!['Sat','Sun'].includes(new Date(ISTms()).toUTCString().slice(0,3));
export const f2=v=>fin(v)?(+v).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}):'-';
export const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const wil=(w,n)=>{if(!n)return NaN;const p=w/n,z=1.96;return(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n)*100};
export const wilUp=(w,n)=>{if(!n)return NaN;const p=w/n,z=1.96;return(p+z*z/(2*n)+z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n)*100};
export const rd=(f,def)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return def}};
export const wr=(f,o)=>{const i=f.lastIndexOf('/');if(i>0)fs.mkdirSync(f.slice(0,i),{recursive:true});fs.writeFileSync(f,JSON.stringify(o,null,1))};
const DEF={minLiquidityCr:5,topN:5,onlyStrong:false,mute:[],capital:100000,riskPct:1,autoPause:true,pauseMinClosed:50,sendMorning:true,sendWeekly:true,useBhavFallback:true,slippagePct:0.05,costPct:0.1,strongScore:0.6,goodScore:0.4,adxStrong:20,adxGood:18,maxExtATR:2.5,maxStaleDays:5,maxJumpPct:25};
export const CFG={...DEF,...rd(fileURLToPath(new URL('./config.json',import.meta.url)),{})};
const NaNs=n=>new Array(n).fill(NaN);
/* ===== PURE indicator series ===== */
const sma=(a,n)=>{const o=NaNs(a.length);let s=0,c=0;for(let i=0;i<a.length;i++){if(fin(a[i])){s+=a[i];c++}if(i>=n&&fin(a[i-n])){s-=a[i-n];c--}if(i>=n-1&&c==n)o[i]=s/n}return o};
const ema=(a,n)=>{const k=2/(n+1),o=NaNs(a.length);let e=NaN;for(let i=0;i<a.length;i++){if(!fin(a[i]))continue;e=fin(e)?a[i]*k+e*(1-k):a[i];o[i]=e}return o};
const wild=(a,n,from)=>{const o=NaNs(a.length);let s=0;for(let i=from;i<a.length;i++){if(i<from+n-1)s+=a[i];else if(i==from+n-1){s+=a[i];o[i]=s/n}else o[i]=(o[i-1]*(n-1)+a[i])/n}return o};
function rsiS(C,n=14){const o=NaNs(C.length);let g=0,l=0;for(let i=1;i<C.length;i++){const d=C[i]-C[i-1];if(i<=n){g+=d>0?d:0;l+=d<0?-d:0;if(i==n){g/=n;l/=n;o[i]=l?100-100/(1+g/l):100}}else{g=(g*(n-1)+(d>0?d:0))/n;l=(l*(n-1)+(d<0?-d:0))/n;o[i]=l?100-100/(1+g/l):100}}return o}
function IND(a){const n=a.length,c=a.map(z=>z.c),h=a.map(z=>z.h),l=a.map(z=>z.l),v=a.map(z=>z.v||0),R={n,c,h,l,v};
 const tr=NaNs(n),pdm=NaNs(n),mdm=NaNs(n);for(let i=1;i<n;i++){tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));const u=h[i]-h[i-1],d=l[i-1]-l[i];pdm[i]=u>d&&u>0?u:0;mdm[i]=d>u&&d>0?d:0}
 R.atr=wild(tr,14,1);const sp=wild(pdm,14,1),sm=wild(mdm,14,1);
 R.pdi=c.map((_,i)=>R.atr[i]>0?100*sp[i]/R.atr[i]:NaN);R.mdi=c.map((_,i)=>R.atr[i]>0?100*sm[i]/R.atr[i]:NaN);
 const dx=c.map((_,i)=>{const s=R.pdi[i]+R.mdi[i];return s>0?100*Math.abs(R.pdi[i]-R.mdi[i])/s:NaN});const f0=dx.findIndex(fin);R.adx=f0<0?NaNs(n):wild(dx,14,f0);
 R.e20=ema(c,20);R.e50=ema(c,50);R.e200=ema(c,200);R.rsi=rsiS(c);
 const m12=ema(c,12),m26=ema(c,26),mac=m12.map((x,i)=>x-m26[i]),sig=ema(mac,9);R.mh=mac.map((x,i)=>x-sig[i]);
 /* supertrend 10,3 */
 const a10=wild(tr,10,1),st=NaNs(n);let fu=NaN,fl=NaN,dir=1;for(let i=1;i<n;i++){if(!fin(a10[i]))continue;const m=(h[i]+l[i])/2,bu=m+3*a10[i],bl=m-3*a10[i];
  if(!fin(fu)){fu=bu;fl=bl;dir=c[i]>=m?1:-1}else{fu=(bu<fu||c[i-1]>fu)?bu:fu;fl=(bl>fl||c[i-1]<fl)?bl:fl;if(dir==1&&c[i]<fl)dir=-1;else if(dir==-1&&c[i]>fu)dir=1}st[i]=dir}R.st=st;
 R.stl=NaNs(n);{let fu2=NaN,fl2=NaN,d2=1;for(let i=1;i<n;i++){if(!fin(a10[i]))continue;const m=(h[i]+l[i])/2,bu=m+3*a10[i],bl=m-3*a10[i];if(!fin(fu2)){fu2=bu;fl2=bl;d2=c[i]>=m?1:-1}else{fu2=(bu<fu2||c[i-1]>fu2)?bu:fu2;fl2=(bl>fl2||c[i-1]<fl2)?bl:fl2;if(d2==1&&c[i]<fl2)d2=-1;else if(d2==-1&&c[i]>fu2)d2=1}R.stl[i]=d2==1?fl2:fu2}}
 /* stochastic 14,3,3 */
 const rk=NaNs(n);for(let i=13;i<n;i++){let hh=-1e18,ll=1e18;for(let j=i-13;j<=i;j++){hh=Math.max(hh,h[j]);ll=Math.min(ll,l[j])}rk[i]=hh>ll?(c[i]-ll)/(hh-ll)*100:50}R.k=sma(rk,3);R.d=sma(R.k,3);
 /* CCI 20 */
 const tp=c.map((x,i)=>(h[i]+l[i]+x)/3),tm=sma(tp,20);R.cci=NaNs(n);for(let i=19;i<n;i++){let s=0;for(let j=i-19;j<=i;j++)s+=Math.abs(tp[j]-tm[i]);const md=s/20;R.cci[i]=md>0?(tp[i]-tm[i])/(.015*md):0}
 /* MFI 14 */
 R.mfi=NaNs(n);for(let i=14;i<n;i++){let p=0,q=0;for(let j=i-13;j<=i;j++){const f=tp[j]*v[j];if(tp[j]>tp[j-1])p+=f;else if(tp[j]<tp[j-1])q+=f}R.mfi[i]=q===0?(p===0?50:100):100-100/(1+p/q)}
 /* OBV */
 R.obv=NaNs(n);let o=0;R.obv[0]=0;for(let i=1;i<n;i++){o+=c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0;R.obv[i]=o}R.obvE=ema(R.obv,20);
 /* Bollinger %B */
 const b20=sma(c,20);R.pb=NaNs(n);for(let i=19;i<n;i++){let s=0;for(let j=i-19;j<=i;j++)s+=(c[j]-b20[i])**2;const sd=Math.sqrt(s/20),up=b20[i]+2*sd,lo=b20[i]-2*sd;R.pb[i]=up>lo?(c[i]-lo)/(up-lo):.5}
 /* Ichimoku */
 const mid=(i,k)=>{if(i<k-1)return NaN;let hh=-1e18,ll=1e18;for(let j=i-k+1;j<=i;j++){hh=Math.max(hh,h[j]);ll=Math.min(ll,l[j])}return(hh+ll)/2};
 R.tk=c.map((_,i)=>mid(i,9));R.kj=c.map((_,i)=>mid(i,26));const sbr=c.map((_,i)=>mid(i,52));R.sa=c.map((_,i)=>i>=26?(R.tk[i-26]+R.kj[i-26])/2:NaN);R.sb=c.map((_,i)=>i>=26?sbr[i-26]:NaN);
 /* Aroon 25 */
 R.au=NaNs(n);R.ad=NaNs(n);for(let i=25;i<n;i++){let hi=i,lo=i;for(let j=i-25;j<=i;j++){if(h[j]>=h[hi])hi=j;if(l[j]<=l[lo])lo=j}R.au[i]=100*(25-(i-hi))/25;R.ad[i]=100*(25-(i-lo))/25}
 R.v20=sma(v,20);return R}
const W={tr:1.5,st:1.5,adx:1.25,macd:1,rsi:1,sto:.75,cci:.75,mfi:1,obv:1,bb:.75,ich:1.25,aro:.75,brk:1,vol:.75,rs:1,fx:1.5};
const NM={tr:'EMA trend (20/50/200)',st:'Supertrend (10,3)',adx:'ADX + DI (14)',macd:'MACD histogram',rsi:'RSI (14) zone',sto:'Stochastic (14,3,3)',cci:'CCI (20)',mfi:'MFI (14) money flow',obv:'OBV (volume trend)',bb:'Bollinger %B',ich:'Ichimoku cloud',aro:'Aroon (25)',brk:'20D breakout / breakdown',vol:'Volume confirmation',rs:'Relative strength vs Nifty (20D)',fx:'Fenix AI engine (agents+bots)'};
/* signed votes at index i: +1 bull, -1 bear, 0 neutral */
function votes(R,i,ex){const c=R.c,V={},g=x=>fin(x);
 {const a=R.e20[i],b=R.e50[i],e=R.e200[i];V.tr=g(a)&&g(b)?(c[i]>a&&a>b&&(!g(e)||c[i]>e)?1:c[i]<a&&a<b&&(!g(e)||c[i]<e)?-1:0):0}
 V.st=g(R.st[i])?R.st[i]:0;
 V.adx=g(R.adx[i])&&R.adx[i]>=20?(R.pdi[i]>R.mdi[i]?1:-1):0;
 V.macd=g(R.mh[i])&&g(R.mh[i-1])?(R.mh[i]>0&&R.mh[i]>R.mh[i-1]?1:R.mh[i]<0&&R.mh[i]<R.mh[i-1]?-1:0):0;
 {const r=R.rsi[i];V.rsi=!g(r)?0:r>50&&r<70?1:r<50&&r>30?-1:0}
 {const k=R.k[i],d=R.d[i];V.sto=!g(k)||!g(d)?0:k>d&&k<80?1:k<d&&k>20?-1:0}
 {const x=R.cci[i];V.cci=!g(x)?0:x>0&&x<200?1:x<0&&x>-200?-1:0}
 {const m=R.mfi[i];V.mfi=!g(m)?0:m>50&&m<80?1:m<50&&m>20?-1:0}
 V.obv=g(R.obvE[i])&&i>=5?(R.obv[i]>R.obvE[i]&&R.obv[i]>R.obv[i-5]?1:R.obv[i]<R.obvE[i]&&R.obv[i]<R.obv[i-5]?-1:0):0;
 {const p=R.pb[i];V.bb=!g(p)?0:p>.5&&p<.95?1:p<.5&&p>.05?-1:0}
 {const a=R.sa[i],b=R.sb[i],t=R.tk[i],k=R.kj[i];V.ich=!(g(a)&&g(b)&&g(t)&&g(k))?0:c[i]>Math.max(a,b)&&t>k?1:c[i]<Math.min(a,b)&&t<k?-1:0}
 V.aro=g(R.au[i])?(R.au[i]>70&&R.ad[i]<30?1:R.ad[i]>70&&R.au[i]<30?-1:0):0;
 if(i>=21){let hh=-1e18,ll=1e18;for(let j=i-20;j<i;j++){hh=Math.max(hh,R.h[j]);ll=Math.min(ll,R.l[j])}V.brk=c[i]>=.97*hh&&g(R.e50[i])&&c[i]>R.e50[i]?1:c[i]<=1.03*ll&&g(R.e50[i])&&c[i]<R.e50[i]?-1:0}else V.brk=0;
 V.vol=g(R.v20[i])&&R.v20[i]>0&&R.v[i]/R.v20[i]>=1.2?(c[i]>c[i-1]?1:c[i]<c[i-1]?-1:0):0;
 if(ex){if('rs' in ex)V.rs=ex.rs;if('fx' in ex)V.fx=ex.fx}
 return V}
function score(V){let s=0,t=0,bu=0,be=0,cnt=0;for(const k in V){const w=W[k];t+=w;s+=w*V[k];cnt++;if(V[k]>0)bu++;else if(V[k]<0)be++}return{s:t?s/t:0,bu,be,cnt}}

export {IND,votes,score,W,NM,sma,ema};
