# Quest Academy

A Math, English and Coding adventure game for grades 2 to 8, built for Android phones and tablets as an installable web app (PWA). It also runs in any desktop browser.

Two ways to play:

- **Explore the World**: walk around a top-down map, meet characters in Math Meadow, Word Woods and Code Cove, and play their games to earn coins, XP and stars. Zones unlock as you earn stars.
- **Challenge Mode**: pick any of the 9 games directly and chase 3-star ratings.

Each player has a local profile (name, avatar, grade). The grade picks the difficulty band: grades 2-3, 4-5 or 6-8. Several kids can share one device. No account, no server, works offline.

## Games

| Subject | Game | What it practises |
|---|---|---|
| Math | Number Dash | Quick arithmetic against the clock |
| Math | Fraction Pizza | Shading, equivalent and comparing fractions |
| Math | Pattern Bridge | Number sequences and rules |
| English | Word Builder | Spelling by unscrambling letters |
| English | Grammar Gate | Fill-in-the-blank grammar |
| English | Word Match | Synonyms, antonyms and definitions |
| Coding | Robo Maze | Block programs: sequences, loops, if, functions |
| Coding | Bug Hunt | Find and fix the broken block |
| Coding | Predict the Robot | Trace a program by reading it |

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. Use arrow keys or WASD and Enter on desktop. On a phone or tablet on the same Wi-Fi, open the "Network" URL that Vite prints.

## Test

```bash
npm test
```

Runs the Vitest suite for the question generators, the block interpreter, level solvability, the map and the save system.

## Build and install on Android

```bash
npm run build
npm run preview
```

Open the Network URL on the Android device in Chrome. Because service workers need a secure context, either:

- open `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on the phone, add the preview URL and relaunch Chrome, or
- expose the preview server over https, for example `npx cloudflared tunnel --url http://localhost:4173`.

Then use Chrome's menu, **Add to Home screen** / **Install app**. The app opens full screen, keeps progress on the device, and works in airplane mode.

To publish, upload the `dist/` folder to any static host with https (GitHub Pages, Netlify, Cloudflare Pages). A Play Store build can be made later by wrapping `dist/` with Capacitor.

## Project layout

- `src/scenes/` screens: profiles, home, world, HUD, challenge menu, level select, results, pause, and `minigames/` per subject
- `src/systems/` save system, store, progression rules, mini-game launcher, procedural textures, audio, input
- `src/generators/` question generators and the block-code interpreter (pure, unit tested)
- `src/data/` game registry, grade bands, word banks, coding levels, world map and NPCs
- `src/ui/` buttons, panels, text styles, stars, progress bars, toasts

All art is generated in code at start-up, so there are no image assets to load. Sound is a tiny Web Audio synth.
