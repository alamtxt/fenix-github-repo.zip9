// msgs.mjs – Telegram messages (Hinglish)
import {fin,esc,f2,CFG,VERSION} from './core.mjs';
import {sizing} from './signals.mjs';
const sg=v=>fin(v)?(v>=0?'+':'')+v.toFixed(2)+'%':'-';
export const fm=s=>s.n?`${s.w}/${s.n} sahi (${s.win.toFixed(0)}%), Wilson low ${s.lb.toFixed(0)}%, avg ${sg(s.avg)}${fin(s.ex)?', Nifty se behtar/kharab '+sg(s.ex):''}`:'koi closed pick nahi';
export const FOOT='⚠ Guarantee nahi – 1 din ka move random ke bahut kareeb hota hai. Order apne broker app me hi confirm karein.';
export const STICON={LEARNING:'🧪',PAUSED:'⏸',EDGE:'✅',UNPROVEN:'❔'};
export function pickLine(r,i,events=[]){
  const nd=r.nd.n>=15?`5Y me aise signal ke baad agle din ${r.dir>0?'upar':'neeche'} band ${r.nd.win.toFixed(0)}% (${r.nd.n} baar, Wilson low ${r.nd.lb.toFixed(0)}%), normal ${r.nd.base.toFixed(0)}% → edge ${r.nd.edge>=0?'+':''}${r.nd.edge.toFixed(0)} pts`:'history kam – % bharosemand nahi';
  const sz=sizing(r),inf=r.info,ev=events.length?'\n   📅 '+events.map(esc).join(', '):'';
  return `${i+1}. <b>${esc(r.n)}</b> ${r.tier=='S'?'⭐':'✅'} ₹${f2(r.p)} · consensus ${(r.sc*100).toFixed(0)}% · kal ka normal range ±${r.sd.toFixed(1)}%\n   ${nd}\n   ${inf?(inf.sector?'🏭 '+esc(inf.sector):'')+(inf.earn!=null&&inf.earn>=0&&inf.earn<=10?' · ⚠ <b>Results '+inf.earn+' din me</b> – gap risk':inf.earn!=null&&inf.earn>=0?' · results '+inf.earn+' din me':''):''}\n   SL ${f2(r.stop)} · T1 ${f2(r.t1)}${sz?` · size ~${sz.qty} sh (₹${sz.value.toLocaleString('en-IN')}, risk ≈₹${sz.riskRs})`:''}${ev}`}
export function closeMsg(o){const {lastDay,reg,total,scanned,skipped,up,dn,conc,st,stat,evOf,dataNote}=o;
  const head=`🌙 <b>Fenix Pro v${VERSION} – Kal ke Top ${CFG.topN}</b> (${lastDay})\n${reg||''}\n${scanned}/${total} stocks scan hue${skipped?' (skip: '+skipped+')':''}${dataNote?'\n'+dataNote:''}`;
  const stl=`${STICON[st.s]||''} Live status: <b>${st.s}</b> – ${esc(st.why)}`;
  if(st.s=='PAUSED'&&CFG.autoPause)return `${head}\n\n${stl}\n\n⏸ <b>Auto-pause</b>: live forward-test me edge nahi dikha, isliye aaj picks bheje nahi ja rahe. Picks background me log hote rahenge; status sudhra to apne-aap wapas shuru.\n${stat}\n\n${FOOT}`;
  return `${head}\n\n🟢 <b>Kal upar ja sakte hain</b>\n${up.length?up.map((r,i)=>pickLine(r,i,evOf(r))).join('\n'):'koi stock Strong/Good rule pass nahi kar raha'}\n\n🔴 <b>Kal neeche ja sakte hain</b>\n${dn.length?dn.map((r,i)=>pickLine(r,i,evOf(r))).join('\n'):'koi stock Strong/Good rule pass nahi kar raha'}\n\n${conc.length?conc.join('\n')+'\n\n':''}${stl}\n${stat}\n\n${FOOT}`}
export function morningMsg(L,reg,st){const f=r=>`<b>${esc(r.n)}</b>${r.nd&&r.nd.n>=15?' ('+r.nd.win.toFixed(0)+'%)':''}`;
  return `🌅 <b>Fenix Pro – subah ka yaad</b> (kal raat ka scan: ${L.date})\n${reg||''}\n${STICON[st.s]||''} Status: ${st.s}\n\n🟢 Upar: ${(L.up||[]).map(f).join(', ')||'koi nahi'}\n🔴 Neeche: ${(L.dn||[]).map(f).join(', ')||'koi nahi'}\n\n📌 9:15 par pehle 15–30 min ka gap/shor dekho, turant mat daudo. SL pehle se tay rakho.\n${FOOT}`}
export function weeklyMsg(D,wk,best,worst,drift){const A=D.overall;
  return `📊 <b>Fenix Pro – weekly report</b>\n\n<b>Is hafte:</b> ${fm(wk.all)}\nBuy: ${fm(wk.buy)}\nSell: ${fm(wk.sell)}${best?`\nSabse achha: ${esc(best.n)} ${sg(best.res)} · sabse kharab: ${esc(worst.n)} ${sg(worst.res)}`:''}\n\n<b>Ab tak (sab):</b> ${fm(A)}\n${STICON[D.status.s]} Status: <b>${D.status.s}</b> – ${esc(D.status.why)}\n${D.ledger.n?`📒 Paper ledger: ${D.ledger.n} closed, win ${D.ledger.win.toFixed(0)}%, avg ${sg(D.ledger.avg)}, max DD ${D.ledger.maxDD.toFixed(1)}%\n`:''}${drift&&drift.worse?'⚠ Pichle 30 picks purane se kharab chal rahe hain (drift).\n':''}\n🩺 Health: ${D.health?`${D.health.scanned}/${D.health.total} scan, skip ${JSON.stringify(D.health.skipped)}, ${D.health.sec}s`:'-'}\n\n${A.n<30?'ℹ️ 30–50 closed picks se pehle % bharosemand nahi. 50% ke aas-paas matlab edge nahi.':''}\n\nGuarantee nahi. Order apne broker app me hi confirm karein.`}
export const holdMsg=(h,r)=>`⚠ <b>${esc(h)}</b> (aapke holdings me) par ${r.tier=='S'?'⭐ Strong':'✅ Good'} SELL signal – consensus ${(r.sc*100).toFixed(0)}%, ₹${f2(r.p)}, SL ${f2(r.stop)}`;
