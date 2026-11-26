// signals.mjs – signal engine (sirf past data; aaj ke candle tak)
import {fin,wil,CFG,IND,votes,score} from './core.mjs';
export function evalDir(bars,dir,cfg=CFG){
  const R=IND(bars),n=R.n,last=n-1,p=R.c[last],A=R.atr[last];if(!(A>0))return null;
  const V=votes(R,last),S=score(V),sc=dir*S.s,bull=dir>0?S.bu:S.be,bear=dir>0?S.be:S.bu,adx=R.adx[last],rsi=R.rsi[last],e20=R.e20[last],ext=dir*(p-e20)/A;
  const day=(p/R.c[last-1]-1)*100,five=(p/R.c[last-5]-1)*100;
  const hard=fin(adx)&&adx>=cfg.adxStrong&&(dir>0?rsi<72:rsi>28)&&ext<=cfg.maxExtATR;
  const tier=sc>=cfg.strongScore&&bull>=10&&bear<=1&&hard?'S':sc>=cfg.goodScore&&bull>=8&&bear<=2&&fin(adx)&&adx>=cfg.adxGood&&(dir>0?rsi<76:rsi>24)?'G':null;
  if(!tier)return null;
  const stop=p-dir*2*A,t1=p+dir*A;
  const sd=(()=>{const L=[];for(let j=Math.max(1,last-59);j<=last;j++)L.push(Math.log(R.c[j]/R.c[j-1]));const m=L.reduce((s,v)=>s+v,0)/L.length;return Math.sqrt(L.reduce((s,v)=>s+(v-m)**2,0)/L.length)})();
  let w=0,m=0,base=0,bm=0,sum=0;for(let i=210;i<n-1;i++){const up=dir*(R.c[i+1]/R.c[i]-1)>0;bm++;if(up)base++;if(dir*score(votes(R,i)).s>=.5){m++;if(up)w++;sum+=dir*(R.c[i+1]/R.c[i]-1)*100}}
  const nd=m?{n:m,win:w/m*100,lb:wil(w,m),base:base/bm*100,edge:w/m*100-base/bm*100,avg:sum/m}:{n:0};
  return{dir,tier,sc,bull,bear,p,adx,rsi,day,five,stop,t1,atr:A,sd:sd*100,nd,rank:sc*100-Math.max(0,ext)*5-Math.max(0,dir*five-5)*2,close:p}}
export function pickTop(L,cfg=CFG){const ok=r=>r.nd&&r.nd.n>=15,k=r=>(ok(r)?(r.nd.lb>=50&&r.nd.edge>=4?2:r.nd.edge>0?1:0):0)*1000+r.rank;
  let A=cfg.onlyStrong?L.filter(r=>r.tier=='S'):[...L];
  A.sort((a,b)=>(a.tier==b.tier?0:a.tier=='S'?-1:1)||b.rank-a.rank);return A.slice(0,Math.max(cfg.topN*2,cfg.topN)).sort((a,b)=>k(b)-k(a)).slice(0,cfg.topN)}
export function sizing(r,cfg=CFG){const risk=Math.abs(r.p-r.stop);if(!(risk>0))return null;let q=Math.floor(cfg.capital*cfg.riskPct/100/risk);if(q*r.p>cfg.capital)q=Math.floor(cfg.capital/r.p);return q>0?{qty:q,value:Math.round(q*r.p),riskRs:Math.round(q*risk)}:null}
