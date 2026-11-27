// intraday.mjs – 5-minute candles par breakout/breakdown alerts (sirf analysis, order nahi)
import {fin,ISTd,f2,esc,CFG} from './core.mjs';
import {SELF,yurl,yhead} from './data.mjs';
const UA={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'};
const dayStart=d=>Date.parse(d+'T03:45:00Z')/1000; // 9:15 IST
export function synth5(sym,today=ISTd()){let seed=[...sym].reduce((s,c)=>s+c.charCodeAt(0),11);const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const out=[];let p=100;const days=[];for(let k=4;k>=1;k--)days.push(ISTd(Date.parse(today+'T06:00:00Z')-k*864e5));
  for(const d of days)for(let i=0;i<75;i++){const o=p;p=o*(1+(rnd()-.5)*.002);out.push({t:dayStart(d)+i*300,o,h:Math.max(o,p)*1.0005,l:Math.min(o,p)*.9995,c:p,v:1e5*(.8+rnd()*.4)})}
  const up=sym.charCodeAt(0)%2==0,go=sym.charCodeAt(1)%3!=0;
  for(let i=0;i<12;i++){const o=p;const jump=go&&i==11?(up?1:-1)*.014:0;p=o*(1+(rnd()-.5)*.0006+jump);out.push({t:dayStart(today)+i*300,o,h:Math.max(o,p)*1.0003,l:Math.min(o,p)*.9997,c:p,v:(go&&i==11?4e5:1e5)*(.8+rnd()*.4)})}
  return out}
export async function fetch5(sym,now=Date.now()){
  if(SELF)return synth5(sym);
  for(const h of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
    try{const r=await fetch(yurl(h,'/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=5m&range=5d'),{headers:yhead(),signal:AbortSignal.timeout(12000)});if(!r.ok)continue;
      const j=await r.json(),q=j.chart.result[0],z=q.indicators.quote[0];
      let b=(q.timestamp||[]).map((t,i)=>({t,o:z.open[i],h:z.high[i],l:z.low[i],c:z.close[i],v:z.volume[i]||0})).filter(x=>[x.h,x.l,x.c].every(fin)&&(x.o=fin(x.o)?x.o:x.c,true));
      if(b.length&&b[b.length-1].t*1000+300000>now)b=b.slice(0,-1); // adhura candle nahi
      return b}catch(e){}}
  return null}
export function indexChg(bars,today=ISTd()){const T=(bars||[]).filter(b=>ISTd(b.t*1000)===today);return T.length>1?(T[T.length-1].c/T[0].o-1)*100:null}
export function analyze(bars,cfg=CFG,today=ISTd()){
  if(!bars||bars.length<30)return null;const by={};bars.forEach(b=>{const d=ISTd(b.t*1000);(by[d]=by[d]||[]).push(b)});
  const T=by[today],pd=Object.keys(by).filter(d=>d<today).sort();if(!T||T.length<4||!pd.length)return null;
  const P=by[pd[pd.length-1]],pdh=Math.max(...P.map(b=>b.h)),pdl=Math.min(...P.map(b=>b.l));
  const older=pd.flatMap(d=>by[d]),h5=Math.max(...older.map(b=>b.h)),l5=Math.min(...older.map(b=>b.l));
  const pv=older.map(b=>b.v).filter(v=>v>0),avgV=pv.reduce((a,b)=>a+b,0)/(pv.length||1);
  const L=T[T.length-1],orh=Math.max(...T.slice(0,3).map(b=>b.h)),orl=Math.min(...T.slice(0,3).map(b=>b.l));
  let a1=0,a2=0;T.forEach(b=>{a1+=(b.h+b.l+b.c)/3*b.v;a2+=b.v});const vwap=a2?a1/a2:L.c;
  const A=bars.slice(-15),tr=[];for(let i=1;i<A.length;i++)tr.push(Math.max(A[i].h-A[i].l,Math.abs(A[i].h-A[i-1].c),Math.abs(A[i].l-A[i-1].c)));
  const atr=tr.reduce((a,b)=>a+b,0)/(tr.length||1);if(!(atr>0)||!(avgV>0))return null;
  const volx=((L.v+T[T.length-2].v)/2)/avgV,minV=cfg.intradayVol||1.5,out=[];
  for(const d of [1,-1]){const lv=[];const chk=(lvl,txt)=>{if((d>0?L.c>lvl:L.c<lvl)&&Math.abs(L.c-lvl)/atr<=3)lv.push(txt)};
    chk(d>0?orh:orl,`pehle 15 min ki range ka ${d>0?'high '+f2(orh)+' ke upar':'low '+f2(orl)+' ke neeche'} 5m close`);
    chk(d>0?pdh:pdl,`kal ka ${d>0?'high '+f2(pdh):'low '+f2(pdl)} ${d>0?'tod diya':'toot gaya'}`);
    chk(d>0?h5:l5,`5-din ka ${d>0?'high':'low'} ${f2(d>0?h5:l5)} ${d>0?'paar':'toota'}`);
    if(!lv.length||volx<minV||!(d>0?L.c>vwap:L.c<vwap))continue;
    const risk=Math.max(1.5*atr,L.c*0.003);
    out.push({dir:d,price:L.c,t:L.t,why:[...lv,`volume ${volx.toFixed(1)}x normal`,`vwap ${f2(vwap)} ke ${d>0?'upar':'neeche'}`],pts:lv.length+1+(volx>=2.5?1:0),volx,vwap,stop:L.c-d*risk,t1:L.c+d*1.5*risk,risk})}
  return out.length?out.sort((a,b)=>b.pts-a.pts)[0]:null}
export function alertMsg(n,a,idx,sz){const hm=new Date(a.t*1000+19800000+300000).toISOString().slice(11,16),buy=a.dir>0;
  const weak=idx!=null&&(buy?idx<-0.6:idx>0.6);
  return `⚡ <b>${buy?'🟢 BUY':'🔴 SELL'} – ${esc(n)}</b> ₹${f2(a.price)} · ${hm} IST\n<i>kyu: ${a.why.map(esc).join(' · ')}</i>\nSL ${f2(a.stop)} · T1 ${f2(a.t1)}${sz?` · size ~${sz.qty} sh (risk ≈₹${sz.riskRs})`:''} · strength ${'●'.repeat(Math.min(a.pts,5))}${'○'.repeat(Math.max(0,5-a.pts))}${idx!=null?`\nnifty aaj ${idx>=0?'+':''}${idx.toFixed(2)}%`:''}${weak?' ⚠ index ulta chal raha – jokhim zyada':''}\n⚠ sirf analysis; guarantee nahi. 5-10 min late ho sakta hai – order se pehle apne broker app me price dekho.`}
