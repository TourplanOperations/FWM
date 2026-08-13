// ============================================================================
// Scoring, aggregation, and leaderboard logic. Pure functions over the
// store's state + the host-only answer key — kept separate from server.js
// so the rules in section 19/23 of the brief live in one obvious place.
// ============================================================================

const { ANSWER_KEY, SCORING } = require('./config');

// Score a single submission against the answer key for that round.
// Returns { distilleryCorrect, ageCorrect, points }
function scoreSubmission(round, submission) {
  if (!submission) return { distilleryCorrect: false, ageCorrect: false, points: 0 };
  const key = ANSWER_KEY[round];
  const distilleryCorrect = submission.distilleryGuess === key.distillery;
  const ageCorrect = Number(submission.ageGuess) === Number(key.age);
  let points = 0;
  if (distilleryCorrect) points += SCORING.DISTILLERY_POINT;
  if (ageCorrect) points += SCORING.AGE_POINT;
  if (distilleryCorrect && ageCorrect) points += SCORING.BONUS_BOTH;
  return { distilleryCorrect, ageCorrect, points };
}

// A round's points only count toward a participant's score once that round
// has been marked REVEALED by the host — this is what keeps the running
// total from leaking information about an unrevealed round's answer.
function participantProgress(state, participantId) {
  const subs = state.submissions[participantId] || {};
  const rounds = {};
  let totalScore = 0;
  let maxPossible = 0;
  let perfectGuesses = 0;
  let correctDistilleries = 0;
  let correctAges = 0;

  for (let r = 1; r <= SCORING.TOTAL_ROUNDS; r++) {
    const roundState = state.rounds[r];
    const submission = subs[r];
    const entry = { round: r, status: roundState.status, submitted: !!submission };

    if (roundState.status === 'REVEALED') {
      maxPossible += SCORING.MAX_PER_ROUND;
      const result = scoreSubmission(r, submission);
      entry.score = result.points;
      entry.distilleryCorrect = result.distilleryCorrect;
      entry.ageCorrect = result.ageCorrect;
      entry.yourDistilleryGuess = submission ? submission.distilleryGuess : null;
      entry.yourAgeGuess = submission ? submission.ageGuess : null;
      entry.correctDistillery = ANSWER_KEY[r].distillery;
      entry.correctAge = ANSWER_KEY[r].age;
      entry.whisky = ANSWER_KEY[r].whisky;
      totalScore += result.points;
      if (result.points === SCORING.MAX_PER_ROUND) perfectGuesses += 1;
      if (result.distilleryCorrect) correctDistilleries += 1;
      if (result.ageCorrect) correctAges += 1;
    } else if (roundState.status === 'OPEN' || roundState.status === 'CLOSED') {
      // Round is live/awaiting reveal — it still counts toward the visible
      // max-possible denominator (per section 5 example: "7 / 9" after three
      // whiskies means whisky #3 itself isn't revealed yet but rounds 1-3
      // are all counted in the denominator once round 3 has opened).
      maxPossible += SCORING.MAX_PER_ROUND;
    }
    rounds[r] = entry;
  }

  return { rounds, totalScore, maxPossible, perfectGuesses, correctDistilleries, correctAges };
}

function allParticipantScores(state) {
  return Object.values(state.participants).map((p) => {
    const progress = participantProgress(state, p.id);
    return { participantId: p.id, name: p.name, ...progress };
  });
}

// Tie-break order per section 23: most perfect guesses, then most correct
// distillery guesses, then most correct age guesses, else tied.
function leaderboard(state) {
  const scores = allParticipantScores(state);
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.perfectGuesses !== a.perfectGuesses) return b.perfectGuesses - a.perfectGuesses;
    if (b.correctDistilleries !== a.correctDistilleries) return b.correctDistilleries - a.correctDistilleries;
    if (b.correctAges !== a.correctAges) return b.correctAges - a.correctAges;
    return 0;
  });

  let position = 0;
  let lastKey = null;
  return scores.map((s, idx) => {
    const key = `${s.totalScore}|${s.perfectGuesses}|${s.correctDistilleries}|${s.correctAges}`;
    if (key !== lastKey) {
      position = idx + 1;
      lastKey = key;
    }
    return { ...s, position };
  });
}

// Group-level stats for a round, shown on the big screen after it closes.
// Never includes the answer — that only appears once the round is REVEALED.
function groupStats(state, round) {
  const key = ANSWER_KEY[round];
  const entries = Object.entries(state.submissions)
    .map(([participantId, subs]) => subs[round])
    .filter(Boolean);

  const n = entries.length;
  const avg = (field) => (n ? entries.reduce((sum, e) => sum + Number(e[field] || 0), 0) / n : 0);

  const distilleryCounts = {};
  const ageCounts = {};
  entries.forEach((e) => {
    if (e.distilleryGuess) distilleryCounts[e.distilleryGuess] = (distilleryCounts[e.distilleryGuess] || 0) + 1;
    if (e.ageGuess !== undefined && e.ageGuess !== null && e.ageGuess !== '') {
      ageCounts[e.ageGuess] = (ageCounts[e.ageGuess] || 0) + 1;
    }
  });

  const roundState = state.rounds[round];
  const revealed = roundState.status === 'REVEALED';

  let correctDistilleryPct = null;
  let correctAgePct = null;
  let correctBothPct = null;
  let perfectNames = [];

  if (revealed) {
    let cD = 0, cA = 0, cBoth = 0;
    Object.entries(state.submissions).forEach(([participantId, subs]) => {
      const sub = subs[round];
      if (!sub) return;
      const result = scoreSubmission(round, sub);
      if (result.distilleryCorrect) cD += 1;
      if (result.ageCorrect) cA += 1;
      if (result.distilleryCorrect && result.ageCorrect) {
        cBoth += 1;
        const p = state.participants[participantId];
        if (p) perfectNames.push(p.name);
      }
    });
    correctDistilleryPct = n ? Math.round((cD / n) * 100) : 0;
    correctAgePct = n ? Math.round((cA / n) * 100) : 0;
    correctBothPct = n ? Math.round((cBoth / n) * 100) : 0;
  }

  return {
    round,
    responses: n,
    avgNose: avg('nose'),
    avgPalate: avg('palate'),
    avgFinish: avg('finish'),
    avgOverall: avg('overall'),
    distilleryCounts,
    ageCounts,
    revealed,
    answer: revealed ? key : null,
    correctDistilleryPct,
    correctAgePct,
    correctBothPct,
    perfectNames,
  };
}

function eventSummary(state) {
  // Highest/lowest-rated whisky, most/least correctly identified, across
  // revealed rounds only.
  const perRound = [];
  for (let r = 1; r <= SCORING.TOTAL_ROUNDS; r++) {
    if (state.rounds[r].status !== 'REVEALED') continue;
    const gs = groupStats(state, r);
    perRound.push({ round: r, whisky: ANSWER_KEY[r].whisky, ...gs });
  }
  if (!perRound.length) return null;

  const highestRated = [...perRound].sort((a, b) => b.avgOverall - a.avgOverall)[0];
  const lowestRated = [...perRound].sort((a, b) => a.avgOverall - b.avgOverall)[0];
  const mostCorrect = [...perRound].sort((a, b) => (b.correctBothPct ?? 0) - (a.correctBothPct ?? 0))[0];
  const leastCorrect = [...perRound].sort((a, b) => (a.correctBothPct ?? 0) - (b.correctBothPct ?? 0))[0];
  const totalPerfect = allParticipantScores(state).reduce((sum, s) => sum + s.perfectGuesses, 0);

  return {
    participantCount: Object.keys(state.participants).length,
    highestRatedWhisky: { whisky: highestRated.whisky, avgOverall: highestRated.avgOverall },
    lowestRatedWhisky: { whisky: lowestRated.whisky, avgOverall: lowestRated.avgOverall },
    mostCorrectlyIdentified: { whisky: mostCorrect.whisky, correctBothPct: mostCorrect.correctBothPct },
    leastCorrectlyIdentified: { whisky: leastCorrect.whisky, correctBothPct: leastCorrect.correctBothPct },
    totalPerfectGuesses: totalPerfect,
  };
}

module.exports = {
  scoreSubmission,
  participantProgress,
  allParticipantScores,
  leaderboard,
  groupStats,
  eventSummary,
};
