# Reaper's Ledger

A real-time Grim Reaper game for the hackathon prompt *"Create your best project that a Halloween character could use in their day-to-day life."*

Everyone in the people database is a dot on a 3D globe with a birth date, a home city and an appointed time of death. You play the Reaper: work through the list of souls who are due, but only where it is currently **night**. To reap someone, draw your tool (a dagger, a storm, a flame…) and watch the fate play out as a short 3D cinematic. Or grant them a little more time.

Game time is real time. Everything runs in the browser; there is no backend.

## Running it

```bash
npm install
npm run dev          # local dev server at http://localhost:5173
npm run build        # production build into dist/
npm run preview      # serve the production build locally
npm run build:single # one self-contained HTML file in dist-single/
npm run generate:people # rebuild the people database (server/data/people.json)
```

To deploy, upload the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages…). Asset paths are relative, so it works from a subfolder too.

## How the game works

1. **Setup.** Choose the average age of death (30–110), a workload (how many people die per hour), and the city where the Reaper starts.
2. **People come from the database.** The game shuffles `server/data/people.json` and puts the first batch on the schedule. Each person gets a death time somewhere in the next 72 hours and a lifespan drawn from a bell curve around your chosen average (±9 years). That lifespan only decides which year they were born; their birthday, name, city, job, bio and look all come from the database. More people join the schedule from the database as time passes, until everyone has had their turn.
3. **The globe** shows everyone, coloured by urgency, with the real day/night line moving in real time.
4. **The list** shows who is due now, who is due in the next 24 hours, and a ledger of everyone already handled.
5. **Choosing someone** opens their details and two options:
   - **Kill now**: only enabled when it is night where they are. Opens the drawing dialog. The Reaper travels instantly.
   - **Delay death**: pushes their death back by a random 30 minutes to 12 hours. Each person can be delayed up to 3 times.
6. **Scoring.**
   - Reaped within an hour of their time: 100 points.
   - Reaped late: fewer points the later you are (minimum 30).
   - Reaped more than an hour early: 20 points.
   - Left more than 6 hours overdue: they escape as a wandering ghost, and you lose 50 points.

Progress is saved in the browser's local storage, so closing the tab doesn't reset the game. **New ledger** in the header wipes it and starts over.

## The people database

`server/data/people.json` holds 1,500 fictional people, one per line. Each record has:

| Field | Example | Meaning |
| --- | --- | --- |
| `id` | `"p0001"` | Unique id |
| `name` | `"Boris Blackwood"` | Full name (unique) |
| `job` | `"barber"` | Occupation |
| `bio` | `"Works as a barber in Casablanca and…"` | One-line description shown in their details |
| `city`, `country` | `"Casablanca"`, `"Morocco"` | Home city |
| `tz` | `"Africa/Casablanca"` | Time zone, for their local time |
| `lat`, `lon` | `33.743`, `-8.033` | Where their dot sits on the globe |
| `birthday` | `"07-30"` | Month and day of birth (the year is set by the game) |
| `look` | `{ "skin": "#8a5638", "hairStyle": "long", … }` | How they appear in the cinematic: skin, hair colour, hair style (`bald`, `short`, `long`), shirt and trouser colours, height and build |

You can edit the file by hand, or regenerate it with `npm run generate:people`. The generator is seeded, so it produces the same database every time; pass a count and seed to change it, for example `node server/scripts/generate-people.mjs 3000 42`.

While you play, the people on the schedule are copied from the database into the game state, together with their birth date, death date, delays and status. That state is saved in local storage under `reaper-ledger-v3`; the database file itself is never changed by the game.

## Project structure

```
reaper-tracker/
├── index.html
├── package.json
├── vite.config.js
├── server/
│   ├── db.js
│   ├── data/
│   │   ├── people.json
│   │   └── cities.js
│   └── scripts/
│       └── generate-people.mjs
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    ├── components/
    │   ├── Setup.jsx
    │   ├── Hud.jsx
    │   ├── Globe.jsx
    │   ├── SoulList.jsx
    │   ├── SoulPanel.jsx
    │   ├── DrawPad.jsx
    │   └── Cinema.jsx
    └── lib/
        ├── game.js
        ├── sun.js
        ├── geo3d.js
        ├── sketch.js
        └── cinema.js
```

### Root files

| File | What it does |
| --- | --- |
| `index.html` | The page shell. Loads the Google Fonts and mounts the React app into `#root`. |
| `package.json` | Dependencies and the npm scripts listed above. |
| `package-lock.json` | Exact dependency versions npm installed, so every install matches. |
| `vite.config.js` | Build configuration. Uses relative asset paths (`base: './'`), and in `single` mode bundles everything into one HTML file. |

### `server/`: the database

Everything about the people database lives here. Right now it is bundled into the app at build time; the game only reads it through `db.js`, so this folder can later become a real backend without changing the game.

| File | What it does |
| --- | --- |
| `db.js` | The only way the game reads the database. Exports `DATABASE_SIZE`, `allPersonIds()`, `getPerson(id)` and the city list. To move to a real backend (for example Supabase), change this file. |
| `data/people.json` | The people database (see above). |
| `data/cities.js` | About 80 real cities with coordinates and time zones. Used by the generator and for the Reaper's starting city. |
| `scripts/generate-people.mjs` | Writes `data/people.json`. Builds each person from name, job and habit lists and `data/cities.js`, using a seeded random generator so the output is repeatable. Run it with `npm run generate:people`. |

### `src/`: app entry

| File | What it does |
| --- | --- |
| `main.jsx` | Entry point. Renders `<App />` inside React's StrictMode and loads the stylesheet. |
| `App.jsx` | The game controller. Holds the world state, ticks a real-time clock every second, saves to local storage, and connects every component. It also runs the kill flow: **Kill now** → `DrawPad` → `Cinema` → the person is marked reaped and scored. |
| `styles.css` | All styling: colour and font tokens, header, sidebar, list rows, panels, the drawing dialog, the cinematic overlay and toasts. Includes a layout for phone-width screens. |

### `src/components/`: what you see

| File | What it does |
| --- | --- |
| `Setup.jsx` | The opening screen. Average-age slider with a live bell-curve preview, workload choice, starting city, the database size, and the rules. Creates the world when you press **Open the ledger**. |
| `Hud.jsx` | The top bar. Clock (local and UTC), where the Reaper was last seen, score, how many are due, reaped and ghosts, and the **New ledger** button (click twice to confirm). |
| `Globe.jsx` | The 3D globe (three.js). Paints real coastlines onto the globe, shades day and night from the sun's real position, draws a dot per person and a marker for the Reaper, and handles dragging, zooming and clicking a dot. Turns to face whoever is selected, keeping north up. |
| `SoulList.jsx` | The sidebar list, with tabs for **Due now**, **Next 24h** and **Ledger**. Each row shows the city, local time, a countdown (red when overdue) and a Night or Day badge. Also exports `NightBadge`, which `SoulPanel` reuses. |
| `SoulPanel.jsx` | One person's details: bio, countdown, birth date, age, appointed time, local time and delays used. Holds the **Kill now** and **Delay death** buttons, explains why a kill is blocked in daylight (and when night falls there), and offers **Replay the fate** for someone already reaped. |
| `DrawPad.jsx` | The "Draw the tool" dialog. A drawing canvas, a shelf of the 8 tools to pick directly, and Undo, Clear, Cancel and **Unleash**. On Unleash it works out which tool you drew (see `sketch.js`). |
| `Cinema.jsx` | The full-screen kill cinematic. Creates a fresh canvas each time it opens, plays the fate from `cinema.js`, reports when the soul has risen, then shows the closing line and **Return to the world**. |

### `src/lib/`: game logic and graphics (no React)

| File | What it does |
| --- | --- |
| `game.js` | The rules. Reads people through `server/db.js`, schedules them (`schedulePerson` picks their death time and fits their birth year to the chosen average), creates the world, works out scores, and handles reaping (`reap`, `canReap`), delays (`delayDeath`), and the per-second update (`tick`), which turns long-overdue people into ghosts and schedules new deaths. Also has the formatting helpers and local-storage save and load. All game constants (age spread, 72-hour window, 6-hour ghost limit, 3 delays…) are at the top. |
| `sun.js` | Sun-position maths. `subsolarPoint` finds where the sun is overhead right now, `isNight` checks a place, and `nextTransition` finds when it next switches between day and night. |
| `geo3d.js` | Small shared 3D helpers: converting latitude and longitude to a point on the globe, an easing curve, a tiny animation runner, and the starfield. |
| `sketch.js` | The 8 tools and their closing-line phrases. Recognises a drawing in two ways: when published as a Claude artifact it asks Claude to look at the sketch; otherwise a built-in recogniser judges it from the strokes (a straight line is a knife, a zigzag is lightning, a loop is a curse, and so on). |
| `cinema.js` | The kill cinematic, ported from *The Reaper's Atlas*. Builds a moonlit graveyard, the person (dressed from the `look` in their database record) and the hooded Reaper, then plays one of 8 animations before the soul rises. |

## Built with

- [React](https://react.dev) and [Vite](https://vitejs.dev)
- [three.js](https://threejs.org) for the globe and the cinematic
- [d3-geo](https://github.com/d3/d3-geo), [topojson-client](https://github.com/topojson/topojson-client) and [world-atlas](https://github.com/topojson/world-atlas) for the coastlines

All people in the game are fictional.