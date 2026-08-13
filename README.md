# Mystery Malt Tasting System

Thomson Bros — Mystery Malt Series No.5 · Friday Whisky Mafia

A self-contained live blind-tasting and scoring system: one permanent QR
code / link takes participants to a personal tasting dashboard that stays
open all evening; a host control panel drives the six rounds; a big-screen
display shows group results, reveals, and the leaderboard.

See **DEPLOYMENT.md** for how to get this online before the event —
including hosting, the QR code / short link, and swapping in your final
URL. See **CONFIG.md** for what to double-check in `config.js` before the
tasting (answer key is already set; the distillery candidate list needs
your confirmation).

## Running locally

```
npm install
npm start
```

Then open:

- `http://localhost:3000/` — participant dashboard
- `http://localhost:3000/host` — host control panel (asks for the host key
  in `config.js`)
- `http://localhost:3000/display` — big-screen display (same host key)

## Project layout

```
server.js       Express app — all API routes
store.js        In-memory + JSON-file-backed data store
scoring.js      Scoring rules, per-participant progress, leaderboard, group stats
export.js       Builds the downloadable Excel workbook (host panel)
config.js       HOST-ONLY: answer key, distillery/age options, host key
public/
  index.html    Participant dashboard
  host.html     Host control panel
  display.html  Big-screen display
  styles.css    Shared "private whisky club" visual theme
pptx-build.js   Generates Mystery_Malt_Series_No5.pptx (opening/closing/round slides)
assets/         QR code image used by the PowerPoint deck
data/           Runtime data (state.json) — not committed to git
```

## How the pieces fit together

- **Participant dashboard** registers a name, stores a session token in
  the browser, and polls the server every 15 seconds for the current round
  and this participant's own results. It never receives an unrevealed
  round's answer — the server only ever sends answer-key fields once that
  round's status is `REVEALED`.
- **Host control panel** sets `Current Round` (0–7) and each round's
  status (`LOCKED` → `OPEN` → `CLOSED` → `REVEALED`), same as section 18 of
  the original brief. It also shows participants, submission counts,
  duplicate-attempt audit log, and a Download Excel Export button.
- **Big-screen display** is the "live PowerPoint" for the parts that
  actually change during the night — group results, the reveal, and the
  leaderboard — since a static PowerPoint can't reflect live data on its
  own. The real PowerPoint deck handles the ceremonial parts: the opening
  Start Here slide, one title slide per round, and the closing slide.
- **Excel export** (`/api/host/export.xlsx` via the host panel) produces a
  workbook with every sheet named in the original brief — Control, Answer
  Key, Participants, Whisky 1–6 Responses, Combined Results, Scoring,
  Participant Scores, Leaderboard, Whisky Results, Dashboard, PowerPoint
  Data — built from the night's real data, as a downloadable record rather
  than a live co-authored store.

## Scoring

Correct distillery = 1 point, correct age = 1 point, both correct = a
further +1 bonus, so a perfect round is worth 3 points and the whole event
18. A participant's visible "max possible" score grows as each round opens
— e.g. after three whiskies have opened it reads out of 9, not 18 — and
only counts a round toward the numerator once the host reveals it.
