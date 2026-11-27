# Fenix Pro Scanner v3

Roz market close ke baad ~550 NSE stocks scan → Telegram par Top 5 upar / Top 5 neeche + subah yaad + weekly report + mahine ka re-check.
**Sirf analysis hai. Guarantee nahi. Order apne broker app me hi confirm karein.**

## Kya naya hai (v3)
- **Data safety**: Yahoo ka backup host, 429 par ruk-ruk kar retry, kharab data (split/jump, zero volume, stale, duplicate, kam history) reason ke saath skip.
- **Asli holiday check**: Nifty ka aakhri candle hi saboot hai ki market khula tha; `holidays.json` me extra chhutti likh sakte ho.
- **Sach naapna**: har pick ka agle din ka asli result + **Nifty se compare**; tier/side/sector-wise stats; `docs/index.html` dashboard; paper-trade ledger (next-open entry, gap-aware SL/T1, 10-din exit, slippage+cost).
- **Auto-pause**: 50 closed picks ke baad agar live record me edge nahi (win ≤50% ya avg negative) to picks bhejna ruk jata hai (background me log chalta rahta hai). Status: LEARNING / UNPROVEN / EDGE / PAUSED.
- **Monthly re-check**: drift check (pichle 30 vs purane) + data ka gzip backup `data/archive/`.
- **Code safety**: modules + `tests.mjs` (no-look-ahead test samet); galat code ho to workflow scan se pehle ruk jata hai; 20 min timeout; dependabot.
- **Options** (`config.json`): topN, onlyStrong, mute, minLiquidityCr, capital, riskPct (position size har pick par), autoPause, sendMorning/sendWeekly.
- `events.json`: RBI/Budget jaisi tareekh daalo – 2 din ke andar ho to pick par ⚠ dikhega. `holdings.txt`: aapke stocks par SELL signal aaye to alert. `mute.txt`: kuch stocks hamesha skip.

## Intraday alerts (naya)
- Market ghanton me (9:35–14:45 IST) har ~15 min par ~120 stocks ke 5-min candles check hote hain. Breakout/breakdown par Telegram alert: **BUY/SELL, price, SL, T1, size aur "kyu:" (italic, chhote letters me wajah)**.
- Rule: pehle 15 min ki range / kal ka high-low / 5-din ka high-low toote **aur** volume normal se ≥1.5x **aur** price VWAP ke sahi taraf. Alert ek stock+direction par din me ek hi baar.
- Kis par chalega: `intraday.txt` (top 100), `watch.txt` (aapke stocks), holdings, aur raat ke Top 5. `mute.txt` wale skip.
- **Seema:** GitHub cron 5–30 min late ya kabhi skip ho sakta hai; ye tick-by-tick live nahi hai. Alert ko order signal na samjho; broker app me price/volume dekho.
- Har alert din ke close par jaanch hota hai (kitna sahi nikla) aur close/weekly message me dikhta hai. 40 closed alerts ke baad edge na dikhe to intraday alert apne-aap pause (sirf log).
- Private repo me GitHub ke free 2000 min/mahine lagte hain: intraday ~700–900 min khata hai. Public repo me limit nahi. Kam chahiye to workflow me `*/15` ko `*/30` kar do.
- Config (`config.json`): intradayVol, intradayMaxAlerts, intradayMax, intradayLast.

## Upload kaise karein (mobile)
1. GitHub repo kholo → **Add file → Upload files**. ZIP extract karke **saari files** (folder nahi, files) daalo: `scan.mjs core.mjs data.mjs signals.mjs book.mjs msgs.mjs intraday.mjs intraday.txt watch.txt tests.mjs config.json holidays.json events.json symbols.txt holdings.txt mute.txt README.md`. Purani `scan.mjs`/`picks.json` replace ho jayengi (root wali `picks.json` delete kar do).
2. `data` folder: **Add file → Create new file** → naam `data/picks.json` → andar `[]` → Commit.
3. Workflows (naam me **dot** zaroori): **Create new file** → naam `.github/workflows/fenix-scan.yml` → `WORKFLOW_COPY_fenix-scan.yml.txt` ka poora text paste → Commit. Dobara `.github/workflows/tests.yml` (WORKFLOW_COPY_tests.yml.txt) aur `.github/dependabot.yml` (WORKFLOW_COPY_dependabot.yml.txt).
4. **Settings → Secrets and variables → Actions**: `TELEGRAM_BOT_TOKEN` (zaroori). `TELEGRAM_CHAT_ID` optional (default aapka id).
5. **Actions → Scan + Telegram → Run workflow → mode: close**. Green + Telegram message = kaam kar gaya.
6. Dashboard (optional): Settings → Pages → Branch `main`, folder `/docs`. (Private repo par Pages paid plan maangta hai – dashboard `data/dashboard.json` me bhi milta hai.)

## Safety
- Bot token kisi ko/chat me mat bhejo. Leak hua to @BotFather → `/revoke`, naya token sirf GitHub Secret me.
- Repo ko **Private** rakho (Settings → General → Danger zone). Note: app ka ☁ box sirf Public repo padh pata hai.

## Dhyan rakho
- Ye code sandbox me nakli data par test hua hai; asli Yahoo/GitHub par pehla run aap hi karoge. Pehle hafte log dhyan se dekho.
- 1 din ka move random ke bahut kareeb hota hai. 50 closed picks se pehle koi % bharosemand nahi.
- Yahoo free data kabhi late/ghalat ho sakta hai – isliye skip reasons message me dikhte hain.

## Problem aaye to
- Actions me red ❌: run kholo → jo step red hai uska log dekho. `Tests` step red = koi file galat upload hui.
- "data bahut kam mila": Yahoo ne rok diya; 15–30 min baad Run workflow.
- Telegram nahi aaya: Secret ka naam exact `TELEGRAM_BOT_TOKEN`; bot ko ek baar /start bhejo.
