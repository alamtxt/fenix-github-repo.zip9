// scan.mjs v3 – modes: close | morning | weekly | recheck | fail   (--selftest = nakli data, Telegram nahi)
import fs from 'node:fs';import os from 'node:os';
import {fin,ISTd,ISTm,isWeekday,sleep,rd,wr,esc,CFG,VERSION,IND} from './core.mjs';
import {SELF,getBars,one,validate,trimPartial,regime,enrich,stats,setDeadline,pastDeadline} from './data.mjs';
import {evalDir,pickTop} from './signals.mjs';
import {resolve,resolveIntra,status,agg,ledgerOf,buildDash,dashHTML,archiveMonth,drift} from './book.mjs';
import {closeMsg,morningMsg,weeklyMsg,holdMsg} from './msgs.mjs';
import {fetch5,analyze,alertMsg,indexChg} from './intraday.mjs';
import {sizing} from './signals.mjs';
const MODE=(process.argv.find(a=>a.startsWith('--mode='))||'--mode=close').slice(7);
const ROOT=SELF?os.tmpdir()+'/fenix-selftest':'.';if(SELF&&MODE=='close')fs.rmSync(ROOT,{recursive:true,force:true});
const DATA=ROOT+'/data',DOCS=ROOT+'/docs',HERE=p=>new URL(p,import.meta.url);
const list=f=>{try{return fs.readFileSync(HERE(f),'utf8').split(/\r?\n/).map(x=>x.replace(/#.*/,'').trim().toUpperCase()).filter(Boolean)}catch(e){return[]}};
async function tg(text){const T=process.env.TELEGRAM_BOT_TOKEN,C=process.env.TELEGRAM_CHAT_ID||'7784180001';
  if(SELF||!T){console.log(SELF?'':'(Telegram secret nahi mila – message sirf log me)');return}
  const parts=[];let cur='';for(const ln of text.split('\n')){if((cur+ln).length>3800){parts.push(cur);cur=''}cur+=ln+'\n'}if(cur)parts.push(cur);
  for(const p of parts){const r=await fetch('https://api.telegram.org/bot'+T+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:C,text:p,parse_mode:'HTML',disable_web_page_preview:true})});console.log('Telegram:',r.status);await sleep(400)}}
const plain=s=>s.replace(/<[^>]+>/g,'');
const summary=s=>{if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'```\n'+plain(s)+'\n```\n')};
const loadH=()=>rd(DATA+'/picks.json',[]);
async function close(){
  const t0=Date.now(),today=ISTd(),hol=rd(HERE('./holidays.json'),[]);
  if(!SELF&&(hol.includes(today)||!isWeekday())){console.log('Aaj holiday/weekend – scan skip');return}
  const mute=new Set([...(CFG.mute||[]).map(x=>String(x).toUpperCase()),...list('./mute.txt')]);
  const syms=list('./symbols.txt').filter(s=>!mute.has(s));const skip={},bump=k=>skip[k]=(skip[k]||0)+1;
  const map={},B=[],Sl=[];let lastDay='',idx=0,abort=false;setDeadline(t0+(CFG.budgetMin||13)*60000);
  const nraw=await getBars('^NSEI','5y'),nv=nraw&&validate(nraw);let nifty=nv&&nv.bars?trimPartial(nv.bars,ISTm(),today):null;
  const niftyDay=nifty&&nifty.length?ISTd(nifty[nifty.length-1].t*1000):'';
  const worker=async()=>{while(idx<syms.length&&!abort){const s=syms[idx++];const raw=await getBars(s+'.NS');if(!SELF)await sleep(120);
    if(!SELF&&idx>=40&&stats.primary+stats.backup==0){abort=true;break} // 40 koshish, ek bhi data nahi = Yahoo block
    const v=validate(raw);if(!v.ok){bump(pastDeadline()?'time-budget':v.reason);continue}let bars=trimPartial(v.bars,ISTm(),today);if(bars.length<420){bump('short-history');continue}
    const ld=ISTd(bars[bars.length-1].t*1000);if(lastDay<ld)lastDay=ld;
    const tv=bars.slice(-20).reduce((a,x)=>a+x.c*x.v,0)/20;if(!SELF&&tv<CFG.minLiquidityCr*1e7){bump('kam-liquid');continue}
    map[s]=bars;try{const lb=SELF?0:Math.min(5,Math.max(0,Math.log10(tv/(CFG.minLiquidityCr*1e7))*3));const b=evalDir(bars,1),sl=evalDir(bars,-1);
      if(b){b.rank+=lb;B.push({n:s,...b})}if(sl){sl.rank+=lb;Sl.push({n:s,...sl})}}catch(e){bump('calc-error')}}};
  await Promise.all([1,2,3,4,5,6].map(worker));
  const scanned=Object.keys(map).length,skipped=syms.length-scanned;if(abort)skip['yahoo-block']=syms.length-idx+1;
  if(scanned<syms.length*0.5&&!SELF){console.log('Data bahut kam mila ('+scanned+'/'+syms.length+')');await tg(`❌ <b>Fenix Pro</b>: sirf ${scanned}/${syms.length} stocks ka data mila (skip: ${esc(JSON.stringify(skip))}).\nYahoo ke jawab: ${esc(JSON.stringify(stats.codes))}\n${abort?'Yahoo GitHub ke server ko block/rok raha lagta hai (429/403).':''} Aaj ke picks nahi bheje. Thodi der baad dobara chalao ya mode diag chalao.`);process.exitCode=1;return}
  const day=niftyDay||lastDay; // "market khula tha ya nahi" ka asli saboot = Nifty ka aakhri candle
  const reg=await regime(nifty&&nifty.length>=220?nifty:null).catch(()=>null)||(SELF?'(selftest)':null);
  const H=resolve(loadH(),map,nifty);
  const done=H.filter(h=>h.res!=null),st=status(done);
  const up=pickTop(B),dn=pickTop(Sl),all=[...up,...dn];
  const info=await enrich(all.map(r=>r.n));all.forEach(r=>{r.info=info[r.n]||null});
  const conc=[[up,'Buy'],[dn,'Sell']].map(([L,nm])=>{const c={};L.forEach(r=>{const s=r.info&&r.info.sector;if(s)c[s]=(c[s]||0)+1});const k=Object.keys(c).filter(s=>c[s]>=3);return k.length?`⚠ ${nm} picks me ek hi sector ke ${k.map(s=>s+' ('+c[s]+')').join(', ')} stock – sab saath ulte gaye to risk judta hai`:''}).filter(Boolean);
  const EV=rd(HERE('./events.json'),[]);const evOf=r=>EV.filter(e=>{const d=(Date.parse(e.date)-Date.parse(day))/864e5;return d>=0&&d<=2}).map(e=>e.name+' ('+e.date+')');
  const sessionOk=SELF||day===today;
  if(sessionOk)all.forEach(r=>{if(!H.some(h=>h.n==r.n&&h.date==day&&h.dir==r.dir))H.push({date:day,n:r.n,dir:r.dir,close:r.close,tier:r.tier,stop:+r.stop.toFixed(2),t1:+r.t1.toFixed(2),sector:r.info&&r.info.sector||null})});
  const Hs=H.slice(-3000),L=ledgerOf(Hs,map);wr(DATA+'/picks.json',Hs);wr(DATA+'/ledger.json',L);
  const health={scanned,total:syms.length,skipped:skip,sec:Math.round((Date.now()-t0)/1000),src:{...stats},version:VERSION};
  const D=buildDash(Hs,L,status(Hs.filter(h=>h.res!=null)),health);wr(DATA+'/dashboard.json',D);fs.mkdirSync(DOCS,{recursive:true});fs.writeFileSync(DOCS+'/index.html',dashHTML(D));
  wr(DATA+'/latest.json',{date:day,reg,up,dn,status:D.status,health});
  const IL=rd(DATA+'/intraday_log.json',[]);resolveIntra(IL,map);wr(DATA+'/intraday_log.json',IL);const iD=IL.filter(h=>h.res!=null),iA=agg(iD),iS=iA.n?`\nIntraday alerts (din ke close tak): ${iA.w}/${iA.n} sahi (${iA.win.toFixed(0)}%), avg ${iA.avg.toFixed(2)}%`:'';
  const A=D.overall,stat0=A.n?`Forward-test: ${A.w}/${A.n} sahi (${A.win.toFixed(0)}%), avg ${A.avg.toFixed(2)}%${fin(A.ex)?', Nifty se '+(A.ex>=0?'+':'')+A.ex.toFixed(2)+'%':''}`:'Forward-test: abhi koi closed pick nahi.';const stat=stat0+iS;
  const dataNote=stats.backup?`ℹ️ ${stats.backup} stocks ka data backup host se aaya`:'';
  const msg=closeMsg({lastDay:day,reg,total:syms.length,scanned,skipped,up,dn,conc,st:D.status,stat,evOf,dataNote});
  console.log(plain(msg));summary(msg);
  if(!sessionOk){console.log('Aaj ('+today+') ka candle nahi mila.');if(isWeekday()&&!SELF)await tg('ℹ️ Fenix Pro: aaj ('+today+') ka daily candle nahi mila (holiday ya data late). Picks nahi bheje – thodi der baad Run workflow se dobara chalao.');return}
  await tg(msg);
  const hs=list('./holdings.txt'),al=hs.map(h=>{const r=Sl.find(x=>x.n==h);return r?holdMsg(h,r):null}).filter(Boolean);
  if(al.length){if(SELF)console.log(plain(al.join('\n')));else await tg('💼 <b>Holdings alert</b>\n'+al.join('\n'))}}
async function intraday(){const today=ISTd(),m=ISTm(),hol=rd(HERE('./holidays.json'),[]);
  if(!SELF&&(!isWeekday()||hol.includes(today)||m<575||m>(CFG.intradayLast||885))){console.log('intraday: abhi alert ka time nahi (9:35–14:45 IST)');return}
  const mute=new Set([...(CFG.mute||[]).map(x=>String(x).toUpperCase()),...list('./mute.txt')]);
  const L=rd(DATA+'/latest.json',{}),extra=[...(L.up||[]),...(L.dn||[])].map(r=>r.n);
  const uni=[...new Set([...list('./watch.txt'),...list('./holdings.txt'),...extra,...list('./intraday.txt')])].filter(s=>!mute.has(s)).slice(0,CFG.intradayMax||120);
  let S=rd(DATA+'/intraday_state.json',{date:'',sent:{}});if(S.date!==today)S={date:today,sent:{}};
  const IL=rd(DATA+'/intraday_log.json',[]),st=status(IL.filter(h=>h.res!=null),{...CFG,pauseMinClosed:CFG.intradayPauseMin||40}),paused=st.s=='PAUSED'&&CFG.autoPause;
  const res=[];let idx=0,ok=0;const w=async()=>{while(idx<uni.length){const s=uni[idx++];const b=await fetch5(s+'.NS');if(!SELF)await sleep(100);if(!b){continue}ok++;const a=analyze(b,CFG,today);if(a)res.push({n:s,...a})}};
  await Promise.all([1,2,3,4,5].map(w));
  if(ok<uni.length*0.3&&!SELF){console.log('intraday: data nahi mila '+ok+'/'+uni.length);if(!S.errSent){S.errSent=1;wr(DATA+'/intraday_state.json',S);await tg('ℹ️ Fenix intraday: Yahoo se 5-min data nahi mil raha ('+ok+'/'+uni.length+'). Aaj ke baaki alert shayad na aayein.')}return}
  const nb=await fetch5('^NSEI'),ic=indexChg(nb,today);
  const fresh=res.filter(r=>!S.sent[r.n+'|'+r.dir]).sort((a,b)=>b.pts-a.pts||b.volx-a.volx).slice(0,CFG.intradayMaxAlerts||6);
  for(const r of fresh){S.sent[r.n+'|'+r.dir]=r.t;IL.push({date:today,n:r.n,dir:r.dir,price:+r.price.toFixed(2),stop:+r.stop.toFixed(2),t1:+r.t1.toFixed(2),why:r.why.join('; ').slice(0,200),t:r.t});
    const msg=alertMsg(r.n,r,ic,sizing({p:r.price,stop:r.stop}));console.log(plain(msg)+'\n');if(!paused)await tg(msg)}
  console.log(`intraday: ${uni.length} stocks, ${res.length} signal, ${fresh.length} naye, status ${st.s}${paused?' (PAUSED: alert nahi bheje, sirf log)':''}`);
  if(fresh.length||S.date!==rd(DATA+'/intraday_state.json',{}).date){wr(DATA+'/intraday_state.json',S);wr(DATA+'/intraday_log.json',IL.slice(-2000))}}
async function morning(){const L=rd(DATA+'/latest.json',null);if(!L||!L.date||(Date.now()-Date.parse(L.date))/864e5>4){console.log('latest.json nahi/purana');return}
  if(CFG.sendMorning===false)return;if(L.status&&L.status.s=='PAUSED'&&CFG.autoPause){console.log('PAUSED – morning skip');return}
  const msg=morningMsg(L,SELF?'(selftest)':await regime().catch(()=>null),L.status||{s:'?'});console.log(plain(msg));await tg(msg)}
async function weekly(){if(CFG.sendWeekly===false)return;const H=rd(DATA+'/picks.json',[]),D=rd(DATA+'/dashboard.json',null)||buildDash(H,[],status(H.filter(h=>h.res!=null)),null);
  const done=H.filter(h=>h.res!=null),wk=done.filter(h=>h.rd&&(Date.now()-Date.parse(h.rd))/864e5<=8),S=agg,best=[...wk].sort((a,b)=>b.res-a.res)[0],worst=[...wk].sort((a,b)=>a.res-b.res)[0];
  const IL=rd(DATA+'/intraday_log.json',[]).filter(h=>h.res!=null),iw=IL.filter(h=>(Date.now()-Date.parse(h.date))/864e5<=8),ia=S(iw),il=ia.n?`⚡ Intraday alerts is hafte: ${ia.w}/${ia.n} sahi (${ia.win.toFixed(0)}%), avg ${ia.avg.toFixed(2)}% (din ke close tak)`:'⚡ Intraday alerts: is hafte koi closed nahi';
  const msg=weeklyMsg(D,{all:S(wk),buy:S(wk.filter(h=>h.dir>0)),sell:S(wk.filter(h=>h.dir<0))},best,worst,drift(done)).replace('\n\nGuarantee nahi.','\n'+il+'\n\nGuarantee nahi.');console.log(plain(msg));summary(msg);await tg(msg)}
async function recheck(){const H=rd(DATA+'/picks.json',[]),done=H.filter(h=>h.res!=null),st=status(done),dr=drift(done),ar=archiveMonth(DATA,H);
  const msg=`🔁 <b>Fenix Pro – mahine ka re-check</b>\nStatus: <b>${st.s}</b> – ${esc(st.why)}\nClosed picks: ${st.n}${st.n?`, win ${st.win.toFixed(0)}% (Wilson ${st.lb.toFixed(0)}–${st.ub.toFixed(0)}%), avg ${st.avg.toFixed(2)}%`:''}\n${dr?`Pichle 30 vs purane: win ${dr.recent.win.toFixed(0)}% vs ${dr.older.win.toFixed(0)}% ${dr.worse?'⚠ drift (kharab)':'✔ stable'}`:'Drift check ke liye 60+ closed picks chahiye.'}\n${ar?'🗄 Is mahine ka backup data/archive me rakha.':''}\n\nAgar status PAUSED/drift dikhe to picks par bharosa kam rakho; thresholds config.json me badal sakte ho.`;
  console.log(plain(msg));summary(msg);await tg(msg)}
async function diag(){const out=[];for(const h of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){for(const s of ['RELIANCE.NS','^NSEI']){const t=Date.now();try{const u='https://'+h+'/v8/finance/chart/'+encodeURIComponent(s)+'?interval=1d&range=1mo';const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'},signal:AbortSignal.timeout(15000)});let n='';if(r.ok){const j=await r.json();n=' candles='+((j.chart.result[0].timestamp||[]).length)}out.push(`${h} ${s}: HTTP ${r.status}${n} (${Date.now()-t}ms)`)}catch(e){out.push(`${h} ${s}: ERROR ${e.name||e.message} (${Date.now()-t}ms)`)}}}
  const msg='🩺 <b>Fenix Pro diag</b> v'+VERSION+'\n'+out.map(esc).join('\n')+'\n\n200 + candles = theek. 429/403 = Yahoo GitHub ko rok raha hai. ERROR = network.';console.log(plain(msg));summary(msg);await tg(msg)}
async function fail(){await tg('❌ <b>Fenix Pro scan fail hua</b>\nGitHub → Actions tab me run kholkar fail hue step ka log dekho. Aksar Yahoo ne rok diya hota hai; thodi der baad Run workflow se dobara chalao.')}
const run={close,morning,weekly,recheck,fail,diag,intraday}[MODE]||close;
run().catch(async e=>{console.error(e);try{if(!SELF&&MODE!='fail')await tg('❌ Fenix Pro ('+MODE+') error: '+esc(String(e.message||e).slice(0,200)))}catch(x){}process.exit(1)});
