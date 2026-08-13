# Before the Event — Checklist for `config.js`

`config.js` is host-only and never sent to any participant-facing endpoint.
Everything below is in that one file.

## Answer key — already set

`ANSWER_KEY` matches the fixed tasting order from the brief exactly
(Kingsbarns 8yo → Auchroisk 13yo → Loch Lomond/Inchmurrin 13yo → Glenburgie
16yo → Clynelish 12yo → Glen Garioch 27yo). No action needed unless the
running order changes.

## Distillery candidate list — needs your confirmation

`DISTILLERY_CANDIDATES` is the dropdown list guests choose from when
guessing a distillery, on every round's form. It currently contains the
six correct answers plus a placeholder spread of ~20 Highland, Speyside,
Island and Lowland malts as decoys — reasonable guesses that don't give
the game away by elimination, but invented for this build rather than
pulled from your actual Thomson Bros box materials.

Check this against whatever candidate/shortlist Thomson Bros ships with
the Mystery Malt Series No.5 set (a leaflet, card, or list on their site)
and replace the array if it differs. There's no wrong number of entries —
just make sure all six correct distilleries are present and the list is
long enough that a guess isn't trivially narrowed down.

## Age options — already set

`AGE_OPTIONS` matches the exact list given in the brief (5, 7, 8, 9, 10,
11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 24, 26, 27). No action needed.

## Host key — change this

`HOST_KEY` gates `/host` and `/display`. Change the default value, or set
a `HOST_KEY` environment variable on whichever platform you deploy to (see
DEPLOYMENT.md) so the default never ships live.

## Personal position — defaults to off

`showPersonalPosition` starts `false` in `store.js` per the brief ("Default
this feature to NO during the early rounds"). Toggle it from the host
panel's Settings card whenever you want to turn it on mid-event.
