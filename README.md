# Fenix Pro – GitHub scan + Telegram (A se Z setup)

Ye repo roz **3:50 PM IST (Mon–Fri)** apne-aap chalta hai: ~500 NSE stocks (kam liquid ya galat symbol apne-aap skip) ka real daily data (Yahoo) leta hai, Strong/Good signal rule lagata hai,
**"Kal ke Top 5 Buy / Sell"** Telegram par bhejta hai, aur purane picks ka agle din ka **asli result** `data/picks.json` me jodta jata hai.

> Guarantee nahi. 1 din ka move random ke bahut kareeb hota hai. Sirf analysis – order apne broker app me hi confirm karein.

## Is repo me kya hai
| File | Kaam |
|---|---|
| `scan.mjs` | Scan ka poora code (koi package install nahi) |
| `symbols.txt` | Kin stocks ko scan karna hai (ek line = ek NSE symbol, `.NS` ke bina) |
| `.github/workflows/fenix-scan.yml` | Roz ka timer (GitHub Actions) |
| `WORKFLOW_COPY_fenix-scan.yml.txt` | Upar wali workflow file ki copy – mobile par paste karne ke liye |
| `data/picks.json` | Picks ka forward-test result (bot khud update karta hai) |

---

## STEP 1 – Telegram bot (token)
1. Telegram me **@BotFather** kholo → `/newbot` → bot ka naam aur username do.
2. Wo ek lamba **TOKEN** dega (jaise `123456:ABC...`). **Ise kisi ko mat bhejo, chat me bhi nahi, repo ki file me bhi nahi.**
3. Apne naye bot ko kholo aur usko "hi" bhejo (ye zaroori hai, warna bot aapko message nahi kar paata).
4. Chat id: `scan.mjs` me aapka chat id pehle se default daala hua hai. Alag se `TELEGRAM_CHAT_ID` secret banane ki zaroorat nahi (banaoge to wo default ko override karega).

## STEP 2 – GitHub repo banao
1. github.com par login / signup.
2. Upar **+ → New repository**.
3. Name: `fenix-scan` · **Private** chuno · "Add a README" tick mat karo · **Create repository**.

## STEP 3 – Files daalo
**Tarika A (computer / phone ka "Desktop site"):**
1. Zip ko phone/computer me **extract** karo (GitHub zip khud nahi kholta).
2. Repo me **Add file → Upload files** → extract hui files drag/select karo: `scan.mjs`, `symbols.txt`, `README.md`, `WORKFLOW_COPY_fenix-scan.yml.txt` aur `data` folder → **Commit changes**.
3. Dot-folder (`.github`) kai baar upload nahi hota. Isliye workflow ke liye niche wala Tarika B karo.

**Tarika B – workflow file (ye zaroori hai):**
1. Repo me **Add file → Create new file**.
2. Upar file ke naam wali jagah type karo: `.github/workflows/fenix-scan.yml` (har `/` lagate hi folder ban jata hai).
3. `WORKFLOW_COPY_fenix-scan.yml.txt` kholo, poora text copy karo aur yahan paste karo.
4. **Commit changes**.

Agar `data/picks.json` upload nahi hui: **Create new file** → naam `data/picks.json` → andar sirf `[]` likho → Commit.

## STEP 4 – Secret daalo (sirf token)
Repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `TELEGRAM_BOT_TOKEN`
- Secret: BotFather wala token → **Add secret**

## STEP 5 – Pehli baar chalao
1. Repo → **Actions** tab. Pehli baar "I understand my workflows, enable them" aaye to dabao.
2. Left me **Fenix scan (market close)** → **Run workflow** → Run workflow.
3. 1–3 minute baad Telegram par message aana chahiye. Run ke andar "Scan + Telegram" step ka log dekh sakte ho.

Uske baad ye har weekday 3:50 PM IST par apne-aap chalega.

---

## Dikkat aaye to
| Dikkat | Kya karo |
|---|---|
| Telegram message nahi aaya, log me "Telegram: 401" | Token galat/purana hai – BotFather se naya token lo, secret update karo |
| "Telegram: 400" / chat not found | Bot ko "hi" bheja? Nahi to pehle bhejo, phir dobara run karo |
| Log me "Telegram secrets nahi mile" | Secret ka naam bilkul `TELEGRAM_BOT_TOKEN` hona chahiye |
| Run hi nahi dikh raha | `.github/workflows/fenix-scan.yml` ka path/naam check karo (dot ke saath) |
| "scan hue" count bahut kam | Yahoo ne kuch requests roke – agle din phir chalega, ya dobara Run workflow |
| Message nahi aaya par run green hai | Holiday/weekend ya aaj ka candle nahi mila – tab jaan-boojhkar message nahi bhejte |
| Push fail ("permission denied") | Repo → Settings → Actions → General → Workflow permissions → **Read and write** |

## Dhyan rakho
- Token kabhi file/chat/screenshot me mat daalo. Sirf GitHub Secrets me.
- Repo **Private** rakho.
- GitHub ka schedule kabhi 5–30 minute late ho sakta hai.
- Yahan 14 price-based indicators chalte hain (app me Nifty-strength aur AI engine bhi hote hain), isliye list app se thodi alag ho sakti hai.
- Stocks badalne ho to `symbols.txt` edit karo.
