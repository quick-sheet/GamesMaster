# Games Master

Classic games in one calm, polished app: Tic Tac Toe, Block Puzzle, Water Sort and Ludo. No ads, no accounts, and it works offline.

Live at **https://quick-sheet.github.io/GamesMaster/**

## Install
- **Android (Chrome):** open the link and tap **Install** on the banner, or Chrome ⋮ → **Install app**.
- **iPhone (Safari):** open the link, tap **Share** → **Add to Home Screen**, keep **Open as Web App** on, then **Add**. Always open it from the home-screen icon.

## Share
Send the link above. Each phone keeps its own scores and saved games.

## Update
1. Upload the changed files to this repo (same names replace the old ones) and commit.
2. Bump the release in **both** places together: `?v=N` on every script in `index.html`, and `CACHE = 'gamesmaster-vN'` in `sw.js`.
3. Wait a minute, then fully close and reopen the app (twice if it still looks old).

## Files
- `index.html`: the hub, settings, themes, sounds and shared game screen
- `core.js`: game rules and computer players (no screen code)
- `game-*.js`: one file per game
- `sw.js`, `manifest.webmanifest`, icons: offline use and home-screen install

## Good to know
- Everything is stored on the phone (`gmr.` keys in local storage). Clearing site data resets scores.
- Vibration works on Android only; iPhone web apps can't vibrate.
- If Android shows "Tap to copy the URL for this app" with a sound on every launch, that's Chrome's **Full screen site controls** notification. Long-press the notification and turn that category off. The app's code can't switch it off.
