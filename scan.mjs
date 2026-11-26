// Fenix Pro – post-close scan (GitHub Actions). Node 20, koi package nahi chahiye.
// Strong/Good signal rule app ke "Strong Signals" tab jaisa hi hai (16 me se 14 price-based indicators; Nifty-RS aur AI-engine yahan nahi hote).
// Kal ke Top 5 -> Telegram + data/latest.json. Purane picks ka agle din ka asli result data/picks.json me judta jaata hai.
// Analysis-only. Guarantee nahi. Order apne broker app me hi confirm karein.
import fs from 'node:fs';
const fin=v=>typeof v=='number'&&isFinite(v);
const ISTms=()=>Date.now()+19800000,ISTd=ms=>new Date((ms==null?Date.now():ms)+19800000).toISOString().slice(0,10),ISTm=()=>{const d=new Date(ISTms());return d.getUTCHours()*60+d.getUTCMinutes()};
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

const f2=v=>fin(v)?(+v).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}):'-';
const SELF=process.argv.includes('--selftest');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getBars(sym,range='5y'){
  if(SELF){let seed=[...sym].reduce((s,c)=>s+c.charCodeAt(0),7);const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const out=[];let p=100;const drift=(sym.charCodeAt(0)%3-1)*.0012;
    for(let k=0;k<1250;k++){const o=p*(1+(rnd()-.5)*.004);p=o*(1+.0004+drift+(rnd()-.5)*.025);out.push({t:Math.floor((Date.now()-(1250-k)*864e5)/1000),o,h:Math.max(o,p)*1.004,l:Math.min(o,p)*.996,c:p,v:1e6*(1+rnd())})}return out}
  const u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range='+range;
  for(let a=0;a<3;a++){try{const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'}});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json(),q=j.chart.result[0],z=q.indicators.quote[0];
    const b=(q.timestamp||[]).map((t,i)=>({t,o:z.open[i],h:z.high[i],l:z.low[i],c:z.close[i],v:z.volume[i]||0})).filter(x=>[x.h,x.l,x.c].every(fin));return b}catch(e){await sleep(800*(a+1))}}
  return null}
const wil=(w,n)=>{const p=w/n,z=1.96;return(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n)*100};
function evalDir(bars,dir){
  const R=IND(bars),n=R.n,last=n-1,p=R.c[last],A=R.atr[last];if(!(A>0))return null;
  const V=votes(R,last),S=score(V),sc=dir*S.s,bull=dir>0?S.bu:S.be,bear=dir>0?S.be:S.bu,adx=R.adx[last],rsi=R.rsi[last],e20=R.e20[last],ext=dir*(p-e20)/A;
  const day=(p/R.c[last-1]-1)*100,five=(p/R.c[last-5]-1)*100;
  const hard=fin(adx)&&adx>=20&&(dir>0?rsi<72:rsi>28)&&ext<=2.5;
  const tier=sc>=.6&&bull>=10&&bear<=1&&hard?'S':sc>=.4&&bull>=8&&bear<=2&&fin(adx)&&adx>=18&&(dir>0?rsi<76:rsi>24)?'G':null;
  if(!tier)return null;
  const stop=p-dir*2*A,t1=p+dir*A,sd=(()=>{const L=[];for(let j=Math.max(1,last-59);j<=last;j++)L.push(Math.log(R.c[j]/R.c[j-1]));const m=L.reduce((s,v)=>s+v,0)/L.length;return Math.sqrt(L.reduce((s,v)=>s+(v-m)**2,0)/L.length)})();
  // 5Y: aise signal ke baad agle din ka natija
  let w=0,m=0,base=0,bm=0,sum=0;for(let i=210;i<n-1;i++){const up=dir*(R.c[i+1]/R.c[i]-1)>0;bm++;if(up)base++;if(dir*score(votes(R,i)).s>=.5){m++;if(up)w++;sum+=dir*(R.c[i+1]/R.c[i]-1)*100}}
  const nd=m?{n:m,win:w/m*100,lb:wil(w,m),base:base/bm*100,edge:w/m*100-base/bm*100,avg:sum/m}:{n:0};
  return{dir,tier,sc,bull,bear,p,adx,rsi,day,five,stop,t1,sd:sd*100,nd,rank:sc*100-Math.max(0,ext)*5-Math.max(0,dir*five-5)*2,close:p}}
function pickTop(L){const ok=r=>r.nd&&r.nd.n>=15,k=r=>(ok(r)?(r.nd.lb>=50&&r.nd.edge>=4?2:r.nd.edge>0?1:0):0)*1000+r.rank;
  L.sort((a,b)=>(a.tier==b.tier?0:a.tier=='S'?-1:1)||b.rank-a.rank);return L.slice(0,10).sort((a,b)=>k(b)-k(a)).slice(0,5)}
async function regime(){const b=await getBars('^NSEI','2y');if(!b||b.length<220)return null;const R=IND(b),n=R.n-1,c=R.c[n],e50=R.e50[n],e200=R.e200[n],adx=R.adx[n];
  return c>e50&&e50>e200&&adx>=20?'🟢 Nifty UPTREND':c<e50&&e50<e200&&adx>=20?'🔴 Nifty DOWNTREND':'🟡 Nifty SIDEWAYS'}
async function tg(text){const T=process.env.TELEGRAM_BOT_TOKEN,C=process.env.TELEGRAM_CHAT_ID||'7784180001'; // chat id default: aapka; secret se badal bhi sakte ho;if(!T||!C){console.log('(Telegram secrets nahi mile – message sirf log me)');return}
  const r=await fetch('https://api.telegram.org/bot'+T+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:C,text,parse_mode:'HTML',disable_web_page_preview:true})});console.log('Telegram:',r.status)}
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function main(){
  const syms=fs.readFileSync(new URL('./symbols.txt',import.meta.url),'utf8').split(/\s+/).filter(Boolean);
  const today=ISTd();let bad=[],B=[],Sl=[],map={},lastDay='';
  let idx=0;const worker=async()=>{while(idx<syms.length){const s=syms[idx++];const bars=await getBars(s+'.NS');if(!SELF)await sleep(120);if(!bars||bars.length<420){bad.push(s);continue}
    if(!SELF&&ISTd(bars[bars.length-1].t*1000)===today&&ISTm()<940)bars.pop(); // adhura aaj ka candle
    const ld=ISTd(bars[bars.length-1].t*1000);lastDay=lastDay<ld?ld:lastDay;if(!SELF&&(Date.now()-bars[bars.length-1].t*1000)/864e5>5){bad.push(s+'(purana)');continue}
    {const L=bars.slice(-20);const tv=L.reduce((s,x)=>s+x.c*x.v,0)/L.length;if(!SELF&&!(tv>=5e7)){bad.push(s+'(kam liquid)');continue}}map[s]=bars;try{const b=evalDir(bars,1),sl=evalDir(bars,-1);if(b)B.push({n:s,...b});if(sl)Sl.push({n:s,...sl})}catch(e){bad.push(s+'(err)')}}};
  await Promise.all([1,2,3,4,5,6].map(worker));
  const reg=SELF?'(selftest)':await regime();
  const up=pickTop(B),dn=pickTop(Sl);
  // purane picks ka agle din ka asli result
  fs.mkdirSync('data',{recursive:true});let H=[];try{H=JSON.parse(fs.readFileSync('data/picks.json','utf8'))}catch(e){}
  H.forEach(h=>{if(h.res!=null)return;const b=map[h.n];if(!b)return;const k=b.findIndex(x=>ISTd(x.t*1000)>h.date);if(k<0)return;const c1=b[k].c;h.res=h.dir*(c1/h.close-1)*100;h.rd=ISTd(b[k].t*1000)});
  const done=H.filter(h=>h.res!=null),wins=done.filter(h=>h.res>0).length;
  const stat=done.length?`Forward-test (kal ke picks ka asli agle din ka result): ${wins}/${done.length} sahi (${(wins/done.length*100).toFixed(0)}%), avg ${(done.reduce((s,h)=>s+h.res,0)/done.length).toFixed(2)}%`:'Forward-test: abhi koi closed pick nahi (kal se judna shuru hoga).';
  const sessionOk=SELF||lastDay===today;
  if(sessionOk){[...up,...dn].forEach(r=>{if(!H.some(h=>h.n==r.n&&h.date==lastDay&&h.dir==r.dir))H.push({date:lastDay,n:r.n,dir:r.dir,close:r.close,tier:r.tier})})}
  fs.writeFileSync('data/picks.json',JSON.stringify(H.slice(-600),null,1));
  const ln=(r,i)=>{const nd=r.nd.n>=15?`5Y me aise signal ke baad agle din ${r.dir>0?'upar':'neeche'} band ${r.nd.win.toFixed(0)}% (${r.nd.n} baar, Wilson low ${r.nd.lb.toFixed(0)}%), normal ${r.nd.base.toFixed(0)}% → edge ${r.nd.edge>=0?'+':''}${r.nd.edge.toFixed(0)} pts`:'history kam – % bharosemand nahi';
    return `${i+1}. <b>${esc(r.n)}</b> ${r.tier=='S'?'⭐':'✅'} ₹${f2(r.p)} · consensus ${(r.sc*100).toFixed(0)}% · kal ka normal range ±${r.sd.toFixed(1)}%\n   ${nd}\n   SL ${f2(r.stop)} · T1 ${f2(r.t1)}`};
  const msg=`🌙 <b>Fenix Pro – Kal ke Top 5</b> (${lastDay||today})\n${reg||''}\n${syms.length-bad.length}/${syms.length} stocks scan hue (kam liquid/invalid skip: ${bad.length})\n\n🟢 <b>Kal upar ja sakte hain</b>\n${up.length?up.map(ln).join('\n'):'koi stock Strong/Good rule pass nahi kar raha'}\n\n🔴 <b>Kal neeche ja sakte hain</b>\n${dn.length?dn.map(ln).join('\n'):'koi stock Strong/Good rule pass nahi kar raha'}\n\n${stat}\n\n⚠ Guarantee nahi – 1 din ka move random ke bahut kareeb hota hai. Order apne broker app me hi confirm karein.`;
  fs.writeFileSync('data/latest.json',JSON.stringify({date:lastDay,reg,up,dn,stat,bad},null,1));
  console.log(msg.replace(/<[^>]+>/g,''));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'```\n'+msg.replace(/<[^>]+>/g,'')+'\n```\n');
  if(!sessionOk){console.log('Aaj ('+today+') ka candle nahi mila (holiday/weekend/Yahoo late).');const wd=!['Sat','Sun'].includes(new Date(ISTms()).toUTCString().slice(0,3));if(wd&&!SELF)await tg('ℹ️ Fenix Pro: aaj ('+today+') ka daily candle Yahoo par nahi mila (holiday ya data late). Aaj ke picks nahi bheje – Actions me Run workflow se thodi der baad dobara chalao.');return}
  if(!SELF)await tg(msg.length>3900?msg.slice(0,3850)+'\n…(message chhota kiya)':msg)}
main().catch(e=>{console.error(e);process.exit(1)});
