// data.mjs – Yahoo data (primary + backup host), validation, regime, sector/results enrich
import {fin,ISTd,sleep,CFG,IND} from './core.mjs';
export const SELF=process.argv.includes('--selftest');
const UA={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'};
export const stats={primary:0,backup:0,fail:0,retry429:0};
export function synth(sym,n=1250){let seed=[...sym].reduce((s,c)=>s+c.charCodeAt(0),7);const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const out=[];let p=100;const drift=(sym.charCodeAt(0)%3-1)*.0012;
  for(let k=0;k<n;k++){const o=p*(1+(rnd()-.5)*.004);p=o*(1+.0004+drift+(rnd()-.5)*.025);out.push({t:Math.floor((Date.now()-(n-k)*864e5)/1000),o,h:Math.max(o,p)*1.004,l:Math.min(o,p)*.996,c:p,v:1e6*(1+rnd())})}return out}
async function one(host,sym,range){const u='https://'+host+'/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range='+range;
  for(let a=0;a<3;a++){const r=await fetch(u,{headers:UA});
    if(r.status==429){stats.retry429++;await sleep(1500*(a+1)**2);continue}
    if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json(),q=j.chart.result[0],z=q.indicators.quote[0];
    return (q.timestamp||[]).map((t,i)=>({t,o:z.open[i],h:z.high[i],l:z.low[i],c:z.close[i],v:z.volume[i]||0}))}
  throw new Error('429 baar-baar')}
export async function getBars(sym,range='5y'){
  if(SELF)return synth(sym);
  try{const b=await one('query1.finance.yahoo.com',sym,range);stats.primary++;b.src='primary';return b}catch(e){}
  if(CFG.useBackupHost!==false){try{const b=await one('query2.finance.yahoo.com',sym,range);stats.backup++;b.src='backup';return b}catch(e){}}
  stats.fail++;return null}
/* ---- validation: kharab data ko chupchap use nahi karte, reason ke saath skip ---- */
export function validate(bars,cfg=CFG,now=Date.now()){
  if(!Array.isArray(bars)||!bars.length)return{ok:false,reason:'no-data'};
  let b=bars.map(x=>x&&({...x,o:fin(x.o)?x.o:x.c})).filter(x=>x&&[x.o,x.h,x.l,x.c].every(fin)&&x.c>0&&x.h>=x.l&&fin(x.t));
  b.sort((a,c)=>a.t-c.t);const seen=new Map();b.forEach(x=>seen.set(ISTd(x.t*1000),x));b=[...seen.values()];
  if(b.length<420)return{ok:false,reason:'short-history',bars:b};
  const last=b.slice(-500);for(let i=1;i<last.length;i++)if(Math.abs(last[i].c/last[i-1].c-1)*100>cfg.maxJumpPct)return{ok:false,reason:'jump-or-split',bars:b};
  const z=b.slice(-60).filter(x=>!(x.v>0)).length;if(z>12)return{ok:false,reason:'zero-volume',bars:b};
  if((now-b[b.length-1].t*1000)/864e5>cfg.maxStaleDays)return{ok:false,reason:'stale',bars:b};
  return{ok:true,bars:b}}
export function trimPartial(bars,istMin,today){ // aaj ka adhura candle hatao (3:40 PM se pehle)
  if(bars.length&&ISTd(bars[bars.length-1].t*1000)===today&&istMin<940)return bars.slice(0,-1);return bars}
export async function regime(nifty){const b=nifty||await getBars('^NSEI','2y');if(!b||b.length<220)return null;const R=IND(b),n=R.n-1,c=R.c[n],e50=R.e50[n],e200=R.e200[n],adx=R.adx[n];
  return c>e50&&e50>e200&&adx>=20?'🟢 Nifty UPTREND':c<e50&&e50<e200&&adx>=20?'🔴 Nifty DOWNTREND':'🟡 Nifty SIDEWAYS'}
export async function enrich(names){const out={};if(!names.length)return out;
  if(SELF){names.forEach((n,i)=>{out[n]={sector:i%2?'Financials':'IT',earn:i==1?4:null}});return out}
  try{const r0=await fetch('https://fc.yahoo.com',{redirect:'manual',headers:UA});const ck=(r0.headers.getSetCookie?r0.headers.getSetCookie():[]).map(x=>x.split(';')[0]).join('; ');
    const cr=await (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb',{headers:{...UA,Cookie:ck}})).text();if(!cr||cr.length>40||/<|Too Many/.test(cr))throw new Error('crumb nahi mila');
    for(const n of [...new Set(names)]){try{const u='https://query2.finance.yahoo.com/v10/finance/quoteSummary/'+encodeURIComponent(n+'.NS')+'?modules=assetProfile,calendarEvents&crumb='+encodeURIComponent(cr);
      const j=await (await fetch(u,{headers:{...UA,Cookie:ck}})).json(),q=j.quoteSummary.result[0],ed=(q.calendarEvents&&q.calendarEvents.earnings&&q.calendarEvents.earnings.earningsDate||[]).map(x=>x.raw*1000).filter(x=>x>Date.now()-864e5).sort()[0];
      out[n]={sector:q.assetProfile&&q.assetProfile.sector||null,earn:ed?Math.ceil((ed-Date.now())/864e5):null}}catch(e){}await sleep(150)}}
  catch(e){console.log('enrich skip:',e.message)}
  return out}
