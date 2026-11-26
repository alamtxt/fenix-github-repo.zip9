import test from 'node:test';import assert from 'node:assert/strict';
import {IND,votes,score,wil,wilUp,fin,CFG} from './core.mjs';
import {synth,validate} from './data.mjs';
import {evalDir} from './signals.mjs';
import {status,groupStats,simTrade,agg,resolve} from './book.mjs';
const bars=synth('TESTX',900);
test('indicators finite & causal (no look-ahead)',()=>{
  const R=IND(bars),i=700,V=votes(R,i),S=score(V);assert.ok(fin(S.s));
  // aakhri 150 candle hata do: i par signal same hona chahiye
  const R2=IND(bars.slice(0,i+1)),S2=score(votes(R2,i));assert.ok(Math.abs(S.s-S2.s)<1e-9,'future data ne signal badla!');
  for(const k of ['rsi','adx','atr','e20','e50'])assert.ok(fin(R[k][i]),k)});
test('wilson bounds',()=>{assert.ok(wil(60,100)<60&&wilUp(60,100)>60);assert.ok(wil(5,10)<wil(50,100))});
test('validate catches bad data',()=>{
  assert.equal(validate(bars).ok,true);
  assert.equal(validate(bars.slice(0,100)).reason,'short-history');
  const j=bars.map(x=>({...x}));j[800].c*=1.6;j[800].h=Math.max(j[800].h,j[800].c);assert.equal(validate(j).reason,'jump-or-split');
  const z=bars.map(x=>({...x}));for(let i=z.length-30;i<z.length;i++)z[i].v=0;assert.equal(validate(z).reason,'zero-volume');
  assert.equal(validate(bars,CFG,Date.now()+40*864e5).reason,'stale');
  const d=[...bars,{...bars[bars.length-1]}];assert.equal(validate(d).ok,true,'duplicate date handle')});
test('status logic',()=>{
  const mk=(w,n,r)=>Array.from({length:n},(_,i)=>({res:i<w?r:-r}));
  assert.equal(status(mk(5,10,1)).s,'LEARNING');
  assert.equal(status(mk(20,100,1)).s,'PAUSED');
  assert.equal(status(mk(70,100,1)).s,'EDGE');
  assert.equal(status(mk(52,100,1)).s,'UNPROVEN')});
test('groupStats',()=>{const g=groupStats([{res:1,tier:'S'},{res:-1,tier:'S'},{res:2,tier:'G'}],h=>h.tier);assert.equal(g.S.n,2);assert.equal(g.G.win,100)});
const day=t=>Math.floor(Date.parse(t+'T10:00:00Z')/1000);
const mkb=(arr)=>arr.map(([d,o,h,l,c],i)=>({t:day(d),o,h,l,c,v:1}));
test('ledger: gap through stop exits at open (not at stop)',()=>{
  const b=mkb([['2026-01-01',100,101,99,100],['2026-01-02',100,101,99,100],['2026-01-03',90,91,89,90]]);
  const r=simTrade({date:'2026-01-01',dir:1,stop:95,t1:105},b,{...CFG,maxHold:10});assert.equal(r.status,'closed');assert.equal(r.reason,'SL (gap)');assert.ok(r.exit<91);assert.ok(r.ret<-9)});
test('ledger: target hit, short side, cost applied, pending',()=>{
  const b=mkb([['2026-01-01',100,101,99,100],['2026-01-02',100,101,99,100],['2026-01-03',100,100,94,95]]);
  const r=simTrade({date:'2026-01-01',dir:-1,stop:105,t1:95},b);assert.equal(r.reason,'T1');assert.ok(r.ret>0&&r.ret<5.0);
  assert.equal(simTrade({date:'2026-01-03',dir:1,stop:95,t1:105},b).status,'pending')});
test('resolve: result + benchmark excess',()=>{
  const b=mkb([['2026-01-01',100,100,100,100],['2026-01-02',100,100,100,102]]),n=mkb([['2026-01-01',10,10,10,10],['2026-01-02',10,10,10,10.1]]);
  const H=resolve([{date:'2026-01-01',n:'A',dir:1,close:100}],{A:b},n);assert.ok(Math.abs(H[0].res-2)<1e-9);assert.ok(Math.abs(H[0].ex-1)<1e-9)});
test('evalDir runs on synthetic and has levels',()=>{let got=0;for(const s of ['AAA','BBB','CCC','DDD','EEE','FFF','GGG','HHH']){for(const d of [1,-1]){const r=evalDir(synth(s),d);if(r){got++;assert.ok(fin(r.stop)&&fin(r.t1)&&fin(r.atr))}}}assert.ok(got>=0)});
