// book.mjs – forward-test record, benchmark, auto-pause status, paper ledger, dashboard, archive
import fs from 'node:fs';import zlib from 'node:zlib';
import {fin,ISTd,wil,wilUp,esc,CFG,VERSION,rd,wr} from './core.mjs';
export function resolve(H,map,nifty){ // pichle picks ka agle din ka asli result + Nifty se compare
  const nd=d=>{if(!nifty)return null;const k=nifty.findIndex(x=>ISTd(x.t*1000)>d);return k>0?{r:(nifty[k].c/nifty[k-1].c-1)*100}:null};
  H.forEach(h=>{if(h.res!=null)return;const b=map[h.n];if(!b)return;const k=b.findIndex(x=>ISTd(x.t*1000)>h.date);if(k<0)return;
    h.res=h.dir*(b[k].c/h.close-1)*100;h.rd=ISTd(b[k].t*1000);const m=nd(h.date);if(m){h.bm=m.r;h.ex=h.res-h.dir*m.r}});return H}
export function resolveIntra(IL,map){ // intraday alert ka din ke close tak ka natija (aur SL/T1 touch)
  IL.forEach(h=>{if(h.res!=null)return;const bars=map[h.n];if(!bars)return;const b=bars.find(x=>ISTd(x.t*1000)===h.date);if(!b)return;
    h.res=h.dir*(b.c/h.price-1)*100;const sl=h.dir>0?b.l<=h.stop:b.h>=h.stop,tg=h.dir>0?b.h>=h.t1:b.l<=h.t1;h.hit=sl&&tg?'dono':sl?'SL':tg?'T1':'-'});return IL}
export function simTrade(p,bars,cfg=CFG,maxHold=10){ // paper trade: next open entry, gap-aware SL/T1, time exit, slippage+cost
  if(!fin(p.stop)||!fin(p.t1))return{status:'nolevels'};
  const k=bars.findIndex(x=>ISTd(x.t*1000)>p.date);if(k<0)return{status:'pending'};
  const s=cfg.slippagePct/100,d=p.dir,e=bars[k].o*(1+d*s);if(!fin(e))return{status:'pending'};
  const fin_=(x,why,j)=>{const xp=x*(1-d*s);return{status:'closed',entry:e,exit:xp,ret:d*(xp/e-1)*100-cfg.costPct,reason:why,days:j-k+1,xd:ISTd(bars[j].t*1000)}};
  for(let j=k;j<Math.min(bars.length,k+maxHold);j++){const b=bars[j];
    const gapS=d>0?b.o<=p.stop:b.o>=p.stop,gapT=j>k&&(d>0?b.o>=p.t1:b.o<=p.t1);
    if(gapS)return fin_(b.o,'SL (gap)',j);if(gapT)return fin_(b.o,'T1 (gap)',j);
    const hs=d>0?b.l<=p.stop:b.h>=p.stop,ht=d>0?b.h>=p.t1:b.l<=p.t1;
    if(hs)return fin_(p.stop,'SL',j);if(ht)return fin_(p.t1,'T1',j)}
  if(bars.length>=k+maxHold)return fin_(bars[k+maxHold-1].c,'time-exit',k+maxHold-1);
  return{status:'open',entry:e}}
export function agg(a){const n=a.length,w=a.filter(h=>h.res>0).length;return{n,w,win:n?w/n*100:NaN,lb:n?wil(w,n):NaN,ub:n?wilUp(w,n):NaN,avg:n?a.reduce((s,h)=>s+h.res,0)/n:NaN,ex:a.filter(h=>fin(h.ex)).length?a.filter(h=>fin(h.ex)).reduce((s,h)=>s+h.ex,0)/a.filter(h=>fin(h.ex)).length:NaN}}
export function groupStats(done,fn){const g={};done.forEach(h=>{const k=fn(h)||'?';(g[k]=g[k]||[]).push(h)});const o={};for(const k in g)o[k]=agg(g[k]);return o}
export function status(done,cfg=CFG){const a=agg(done);
  if(a.n<cfg.pauseMinClosed)return{s:'LEARNING',...a,why:`abhi ${a.n}/${cfg.pauseMinClosed} closed picks – pehle itne tak sirf seekhna`};
  if(a.ub<50||(a.win<50&&a.avg<0))return{s:'PAUSED',...a,why:'live record me edge nahi dikha (win ≤50% aur/ya avg negative)'};
  if(a.lb>50&&a.avg>0)return{s:'EDGE',...a,why:'live record me edge dikh raha hai (Wilson low >50%, avg positive)'};
  return{s:'UNPROVEN',...a,why:'na edge sabit, na fail – nazar rakho'}}
export function ledgerOf(H,map,cfg=CFG){return H.map(p=>({n:p.n,date:p.date,dir:p.dir,tier:p.tier,...simTrade(p,map[p.n]||[],cfg)}))}
export function ledgerStats(L){const c=L.filter(x=>x.status=='closed'),n=c.length;if(!n)return{n:0,open:L.filter(x=>x.status=='open').length};
  const w=c.filter(x=>x.ret>0).length,sum=c.reduce((s,x)=>s+x.ret,0),gp=c.filter(x=>x.ret>0).reduce((s,x)=>s+x.ret,0),gl=-c.filter(x=>x.ret<=0).reduce((s,x)=>s+x.ret,0);
  let eq=0,pk=0,dd=0;c.forEach(x=>{eq+=x.ret;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq)});
  return{n,open:L.filter(x=>x.status=='open').length,win:w/n*100,lb:wil(w,n),avg:sum/n,pf:gl?gp/gl:null,total:sum,maxDD:dd}}
export function buildDash(H,L,st,health){const done=H.filter(h=>h.res!=null);
  return{version:VERSION,updated:new Date().toISOString(),status:st,overall:agg(done),tier:groupStats(done,h=>h.tier=='S'?'Strong':'Good'),side:groupStats(done,h=>h.dir>0?'Buy':'Sell'),sector:groupStats(done,h=>h.sector),ledger:ledgerStats(L),health,
    recent:done.slice(-15).reverse().map(h=>({d:h.rd,n:h.n,dir:h.dir,res:+h.res.toFixed(2),ex:fin(h.ex)?+h.ex.toFixed(2):null}))}}
const P=v=>fin(v)?v.toFixed(0)+'%':'-',R=v=>fin(v)?(v>=0?'+':'')+v.toFixed(2)+'%':'-';
export function dashHTML(D){const row=(k,a)=>`<tr><td>${esc(k)}</td><td>${a.n}</td><td>${P(a.win)}</td><td>${P(a.lb)}</td><td>${R(a.avg)}</td><td>${R(a.ex)}</td></tr>`;
  const grp=(t,o)=>`<h3>${t}</h3><table><tr><th></th><th>n</th><th>win</th><th>Wilson low</th><th>avg</th><th>vs Nifty</th></tr>${Object.keys(o).map(k=>row(k,o[k])).join('')}</table>`;
  const L=D.ledger;
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Fenix Pro – Forward Test</title><style>body{font:15px system-ui;margin:12px;background:#0b1020;color:#e6e9f2}table{width:100%;border-collapse:collapse;margin-bottom:10px}td,th{padding:4px 6px;border-bottom:1px solid #243}th{text-align:left;color:#9ab}h1{font-size:18px}h3{margin:14px 0 4px}.b{padding:6px 10px;border-radius:8px;background:#1d2a4a;display:inline-block}</style>
<h1>Fenix Pro – live forward-test</h1><div class=b>Status: <b>${esc(D.status.s)}</b> – ${esc(D.status.why)}</div><p>Update: ${esc(D.updated.slice(0,16))} UTC · v${esc(D.version)}</p>
${grp('Overall',{All:D.overall})}${grp('Tier',D.tier)}${grp('Side',D.side)}${grp('Sector',D.sector)}
<h3>Paper ledger (next-open entry, SL/T1, 10-din exit, cost+slippage)</h3><p>Closed ${L.n}, open ${L.open||0}${L.n?` · win ${P(L.win)} (low ${P(L.lb)}) · avg ${R(L.avg)} · profit factor ${L.pf?L.pf.toFixed(2):'-'} · max drawdown ${L.maxDD.toFixed(1)}%`:''}</p>
<h3>Recent</h3><table>${D.recent.map(r=>`<tr><td>${esc(r.d)}</td><td>${esc(r.n)}</td><td>${r.dir>0?'Buy':'Sell'}</td><td>${R(r.res)}</td></tr>`).join('')}</table>
<p style="color:#9ab">Sirf analysis. Guarantee nahi. ${D.overall.n<30?'30–50 closed picks se pehle % bharosemand nahi.':''}</p>`}
export function archiveMonth(dir,H){ // mahine me ek baar picks ki gzip copy
  const ym=new Date().toISOString().slice(0,7),f=dir+'/archive/picks-'+ym+'.json.gz';if(fs.existsSync(f))return false;
  fs.mkdirSync(dir+'/archive',{recursive:true});fs.writeFileSync(f,zlib.gzipSync(JSON.stringify(H)));return true}
export function drift(done){ // pichle 30 closed vs usse pehle: kya edge ghat raha hai?
  if(done.length<60)return null;const r=agg(done.slice(-30)),o=agg(done.slice(0,-30));return{recent:r,older:o,worse:r.win<o.win-10||r.avg<o.avg-0.3}}
