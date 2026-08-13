// ============================================================================
// In-memory data store with a JSON file backup.
// Sized for a single evening, one club, a few dozen participants — no
// database server required. State is flushed to disk after every mutation
// so a server restart mid-event doesn't lose registrations or submissions.
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'state.json');

function freshState() {
  return {
    event: {
      currentRound: 0,        // 0 = registration, 1-6 = whisky rounds, 7 = finished
      showPersonalPosition: false,
      finished: false,
      startedAt: null,
    },
    rounds: {
      1: { status: 'LOCKED' },
      2: { status: 'LOCKED' },
      3: { status: 'LOCKED' },
      4: { status: 'LOCKED' },
      5: { status: 'LOCKED' },
      6: { status: 'LOCKED' },
    },
    // participantId -> { id, name, token, registeredAt, lastSeenAt }
    participants: {},
    // participantId -> { [round]: submission }
    submissions: {},
    // audit log of rejected duplicate attempts, never deleted
    duplicateLog: [],
  };
}

let state = freshState();

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Shallow-merge onto a fresh state so new fields added by later
      // versions of this file always exist even when loading old data.
      state = { ...freshState(), ...parsed };
      state.rounds = { ...freshState().rounds, ...parsed.rounds };
    }
  } catch (err) {
    console.error('[store] Failed to load state.json, starting fresh:', err.message);
    state = freshState();
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[store] Failed to save state.json:', err.message);
  }
}

load();

function getState() {
  return state;
}

function resetAll() {
  state = freshState();
  save();
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
}

function registerParticipant(name) {
  const id = newId('p');
  const token = newId('tok');
  state.participants[id] = {
    id,
    name: name.trim(),
    token,
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
  state.submissions[id] = {};
  save();
  return state.participants[id];
}

function findParticipantByToken(token) {
  if (!token) return null;
  return Object.values(state.participants).find((p) => p.token === token) || null;
}

function touchParticipant(id) {
  if (state.participants[id]) {
    state.participants[id].lastSeenAt = new Date().toISOString();
    // Don't save on every heartbeat-style touch to avoid disk churn on
    // every single poll; caller decides whether a save is warranted.
  }
}

function setRoundStatus(round, status) {
  if (!state.rounds[round]) return false;
  state.rounds[round].status = status;
  if (status === 'REVEALED') {
    state.rounds[round].revealedAt = new Date().toISOString();
  }
  save();
  return true;
}

function setCurrentRound(round) {
  state.event.currentRound = round;
  if (round === 1 && !state.event.startedAt) state.event.startedAt = new Date().toISOString();
  if (round === 7) state.event.finished = true;
  save();
}

function togglePersonalPosition(enabled) {
  state.event.showPersonalPosition = !!enabled;
  save();
}

// Returns { ok: true, submission } or { ok: false, reason, duplicate }
function recordSubmission(participantId, round, payload) {
  const roundState = state.rounds[round];
  if (!roundState || roundState.status !== 'OPEN') {
    return { ok: false, reason: 'ROUND_NOT_OPEN' };
  }
  const existing = state.submissions[participantId] && state.submissions[participantId][round];
  if (existing) {
    // Preserve the original for scoring; log the duplicate attempt for audit.
    state.duplicateLog.push({
      participantId,
      round,
      attemptedAt: new Date().toISOString(),
      payload,
    });
    save();
    return { ok: false, reason: 'DUPLICATE', duplicate: true };
  }
  const submission = {
    ...payload,
    submittedAt: new Date().toISOString(),
  };
  if (!state.submissions[participantId]) state.submissions[participantId] = {};
  state.submissions[participantId][round] = submission;
  save();
  return { ok: true, submission };
}

function overrideDuplicate(participantId, round, newPayload) {
  // Host-only escape hatch: replace the scored submission for a round with
  // a specific payload (e.g. picking a later duplicate instead of the first).
  if (!state.submissions[participantId]) state.submissions[participantId] = {};
  state.submissions[participantId][round] = {
    ...newPayload,
    submittedAt: new Date().toISOString(),
    hostOverride: true,
  };
  save();
}

module.exports = {
  getState,
  save,
  resetAll,
  registerParticipant,
  findParticipantByToken,
  touchParticipant,
  setRoundStatus,
  setCurrentRound,
  togglePersonalPosition,
  recordSubmission,
  overrideDuplicate,
};
