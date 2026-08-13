// ============================================================================
// HOST-ONLY CONFIGURATION
// This file is never sent to the browser. It is loaded only by server.js.
// ============================================================================

// The fixed, secret tasting order. NEVER expose this object (or any field
// from it) to a participant-facing endpoint before that round's status is
// REVEALED. Server routes must always filter this down to only the fields
// a given response is allowed to see.
const ANSWER_KEY = {
  1: { whisky: 'Kingsbarns 8-Year-Old',                 distillery: 'Kingsbarns',                    age: 8  },
  2: { whisky: 'Auchroisk 13-Year-Old',                 distillery: 'Auchroisk',                     age: 13 },
  3: { whisky: 'Loch Lomond (Inchmurrin) 13-Year-Old',  distillery: 'Loch Lomond / Inchmurrin',      age: 13 },
  4: { whisky: 'Glenburgie 16-Year-Old',                distillery: 'Glenburgie',                    age: 16 },
  5: { whisky: 'Clynelish 12-Year-Old',                 distillery: 'Clynelish',                     age: 12 },
  6: { whisky: 'Glen Garioch 27-Year-Old',               distillery: 'Glen Garioch',                  age: 27 },
};

// Candidate distillery list shown in every round's guess dropdown.
// This MUST include all 6 correct answers plus enough plausible decoys that
// no round's dropdown gives away the answer by elimination.
//
// *** PLACEHOLDER — CONFIRM AGAINST YOUR ACTUAL THOMSON BROS MYSTERY MALT
// SERIES NO.5 BOX MATERIALS BEFORE THE EVENT. *** The six correct distilleries
// are included below along with a broad spread of Highland / Speyside /
// Island / Lowland malts as decoys. Edit this array freely — order does not
// matter, the dashboard sorts it alphabetically for display.
const DISTILLERY_CANDIDATES = [
  'Aberlour', 'Auchroisk', 'Balmenach', 'Benrinnes', 'Benromach',
  'Clynelish', 'Craigellachie', 'Dailuaine', 'Deanston', 'Fettercairn',
  'Glen Garioch', 'Glenburgie', 'Glendullan', 'Glen Elgin', 'Glenrothes',
  'Kingsbarns', 'Knockdhu', 'Linkwood', 'Loch Lomond / Inchmurrin', 'Longmorn',
  'Mannochmore', 'Miltonduff', 'Speyburn', 'Strathmill', 'Teaninich', 'Tomintoul',
];

// Age guess choices offered on every form.
const AGE_OPTIONS = [5, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 24, 26, 27];

const SCORING = {
  DISTILLERY_POINT: 1,
  AGE_POINT: 1,
  BONUS_BOTH: 1, // awarded in addition to the two above, so both-correct = 3
  MAX_PER_ROUND: 3,
  TOTAL_ROUNDS: 6,
  MAX_TOTAL: 18,
};

// Simple shared secret the host control panel and big-screen display must
// send as `x-host-key` (host.html / display.html prompt for this once and
// remember it in that browser's localStorage — it is never sent to the
// participant dashboard). Change this before the event.
const HOST_KEY = process.env.HOST_KEY || 'thomson-bros-host-2026';

const EVENT_NAME = 'Thomson Bros — Mystery Malt Series No.5';
const CLUB_NAME = 'Friday Whisky Mafia';

module.exports = { ANSWER_KEY, DISTILLERY_CANDIDATES, AGE_OPTIONS, SCORING, HOST_KEY, EVENT_NAME, CLUB_NAME };
