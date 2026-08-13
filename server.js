const express = require('express');
const path = require('path');
const QRCode = require('qrcode');

const config = require('./config');
const store = require('./store');
const scoring = require('./scoring');
const { buildWorkbook } = require('./export');

const app = express();
app.use(express.json());

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

function requireHostKey(req, res, next) {
  const key = req.header('x-host-key') || req.query.hostKey;
  if (key !== config.HOST_KEY) {
    return res.status(401).json({ error: 'Invalid or missing host key.' });
  }
  next();
}

function getParticipantFromReq(req) {
  const token = req.header('x-participant-token') || req.query.token;
  return store.findParticipantByToken(token);
}

// Shape of what a participant is allowed to see for "their view" of a round —
// never includes the answer key fields unless that round is REVEALED. This
// is the single choke point that keeps unrevealed answers off the wire.
function publicRoundState(state, participantId) {
  const progress = scoring.participantProgress(state, participantId);
  const rounds = {};
  for (let r = 1; r <= config.SCORING.TOTAL_ROUNDS; r++) {
    const roundState = state.rounds[r];
    const entry = { status: roundState.status };
    const submitted = !!(state.submissions[participantId] || {})[r];
    entry.submitted = submitted;
    if (roundState.status === 'REVEALED') {
      Object.assign(entry, progress.rounds[r]);
    }
    rounds[r] = entry;
  }
  return rounds;
}

// ----------------------------------------------------------------------------
// PARTICIPANT API
// ----------------------------------------------------------------------------

app.post('/api/register', (req, res) => {
  const name = (req.body && req.body.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (name.length > 60) return res.status(400).json({ error: 'Name is too long.' });
  const participant = store.registerParticipant(name);
  res.json({ participantId: participant.id, token: participant.token, name: participant.name });
});

app.get('/api/distilleries', (req, res) => {
  res.json({ distilleries: [...config.DISTILLERY_CANDIDATES].sort() });
});

app.get('/api/ages', (req, res) => {
  res.json({ ages: config.AGE_OPTIONS });
});

app.get('/api/state', (req, res) => {
  const participant = getParticipantFromReq(req);
  if (!participant) return res.status(401).json({ error: 'Unknown or expired session.' });
  store.touchParticipant(participant.id);

  const state = store.getState();
  const progress = scoring.participantProgress(state, participant.id);
  let position = null;
  if (state.event.showPersonalPosition) {
    const board = scoring.leaderboard(state);
    const mine = board.find((b) => b.participantId === participant.id);
    if (mine) position = mine.position;
  }

  res.json({
    name: participant.name,
    currentRound: state.event.currentRound,
    finished: state.event.finished,
    rounds: publicRoundState(state, participant.id),
    totalScore: progress.totalScore,
    maxPossible: progress.maxPossible,
    perfectGuesses: progress.perfectGuesses,
    correctDistilleries: progress.correctDistilleries,
    correctAges: progress.correctAges,
    showPersonalPosition: state.event.showPersonalPosition,
    position,
  });
});

app.post('/api/submit/:round', (req, res) => {
  const participant = getParticipantFromReq(req);
  if (!participant) return res.status(401).json({ error: 'Unknown or expired session.' });

  const round = Number(req.params.round);
  if (!Number.isInteger(round) || round < 1 || round > 6) {
    return res.status(400).json({ error: 'Invalid round.' });
  }

  const { nose, palate, finish, overall, distilleryGuess, ageGuess, notes } = req.body || {};
  const nums = [nose, palate, finish, overall].map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 10)) {
    return res.status(400).json({ error: 'Nose, Palate, Finish and Overall must each be whole numbers from 1 to 10.' });
  }
  if (!distilleryGuess || !config.DISTILLERY_CANDIDATES.includes(distilleryGuess)) {
    return res.status(400).json({ error: 'Please choose a distillery from the list.' });
  }
  if (!config.AGE_OPTIONS.includes(Number(ageGuess))) {
    return res.status(400).json({ error: 'Please choose an age from the list.' });
  }

  const result = store.recordSubmission(participant.id, round, {
    nose: nums[0], palate: nums[1], finish: nums[2], overall: nums[3],
    distilleryGuess, ageGuess: Number(ageGuess), notes: (notes || '').toString().slice(0, 500),
  });

  if (!result.ok) {
    if (result.reason === 'DUPLICATE') {
      return res.status(200).json({ ok: true, note: 'Already recorded — your original response stands.' });
    }
    return res.status(409).json({ error: 'This round is not currently open for submissions.' });
  }
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
// HOST API  (all require x-host-key)
// ----------------------------------------------------------------------------

app.get('/api/host/overview', requireHostKey, (req, res) => {
  const state = store.getState();
  const participants = Object.values(state.participants).map((p) => {
    const progress = scoring.participantProgress(state, p.id);
    const subs = state.submissions[p.id] || {};
    return {
      id: p.id,
      name: p.name,
      registeredAt: p.registeredAt,
      lastSeenAt: p.lastSeenAt,
      submitted: [1, 2, 3, 4, 5, 6].map((r) => !!subs[r]),
      totalScore: progress.totalScore,
      perfectGuesses: progress.perfectGuesses,
    };
  });

  const roundStats = {};
  for (let r = 1; r <= 6; r++) roundStats[r] = scoring.groupStats(state, r);

  res.json({
    event: state.event,
    rounds: state.rounds,
    participants,
    roundStats,
    duplicateLog: state.duplicateLog,
    leaderboard: scoring.leaderboard(state),
    summary: scoring.eventSummary(state),
  });
});

app.post('/api/host/round', requireHostKey, (req, res) => {
  const { round, status, currentRound } = req.body || {};
  if (round !== undefined) {
    const r = Number(round);
    const validStatuses = ['LOCKED', 'OPEN', 'CLOSED', 'REVEALED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    if (!store.setRoundStatus(r, status)) return res.status(400).json({ error: 'Invalid round.' });
  }
  if (currentRound !== undefined) {
    const cr = Number(currentRound);
    if (cr < 0 || cr > 7) return res.status(400).json({ error: 'Invalid current round.' });
    store.setCurrentRound(cr);
  }
  res.json({ ok: true, state: store.getState() });
});

app.post('/api/host/toggle-position', requireHostKey, (req, res) => {
  store.togglePersonalPosition(!!(req.body && req.body.enabled));
  res.json({ ok: true });
});

app.post('/api/host/override-duplicate', requireHostKey, (req, res) => {
  const { participantId, round, payload } = req.body || {};
  if (!participantId || !round || !payload) return res.status(400).json({ error: 'participantId, round and payload are required.' });
  store.overrideDuplicate(participantId, Number(round), payload);
  res.json({ ok: true });
});

app.post('/api/host/reset', requireHostKey, (req, res) => {
  if (!(req.body && req.body.confirm === 'RESET')) {
    return res.status(400).json({ error: 'Send { "confirm": "RESET" } to confirm this destroys all event data.' });
  }
  store.resetAll();
  res.json({ ok: true });
});

app.get('/api/host/export.xlsx', requireHostKey, async (req, res) => {
  const wb = await buildWorkbook(store.getState());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="mystery-malt-export-${Date.now()}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

app.get('/api/host/qr', requireHostKey, async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Provide ?url=' });
  const png = await QRCode.toBuffer(url, { width: 900, margin: 2, color: { dark: '#1a120a', light: '#f3e6c8' } });
  res.setHeader('Content-Type', 'image/png');
  res.send(png);
});

// ----------------------------------------------------------------------------
// DISPLAY API (big screen — read-only, same host key so it isn't public)
// ----------------------------------------------------------------------------

app.get('/api/display/state', requireHostKey, (req, res) => {
  const state = store.getState();
  const round = state.event.currentRound;
  const payload = {
    event: state.event,
    round,
    roundStatus: round >= 1 && round <= 6 ? state.rounds[round].status : null,
    groupStats: round >= 1 && round <= 6 ? scoring.groupStats(state, round) : null,
    leaderboard: scoring.leaderboard(state),
    summary: scoring.eventSummary(state),
    participantCount: Object.keys(state.participants).length,
  };
  res.json(payload);
});

// ----------------------------------------------------------------------------
// Static files + SPA-ish fallbacks
// ----------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/display', (req, res) => res.sendFile(path.join(__dirname, 'public', 'display.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mystery Malt tasting server listening on port ${PORT}`);
  console.log(`Participant dashboard: http://localhost:${PORT}/`);
  console.log(`Host control panel:    http://localhost:${PORT}/host`);
  console.log(`Big-screen display:    http://localhost:${PORT}/display`);
});
