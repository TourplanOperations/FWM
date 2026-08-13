// ============================================================================
// Excel export — produces the "Central Excel Workbook" described in the
// brief as a downloadable snapshot (Host Control Panel > Download Excel
// Export). Since this build replaces the Forms/Excel-Online/Power-Automate
// pipeline with a self-contained web app, this workbook exists as the
// audit trail / backup / take-home record rather than as the live data
// store — the live store is store.js.
// ============================================================================

const ExcelJS = require('exceljs');
const { ANSWER_KEY, SCORING, EVENT_NAME, CLUB_NAME } = require('./config');
const { participantProgress, leaderboard, groupStats, eventSummary } = require('./scoring');

async function buildWorkbook(state) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mystery Malt Tasting System';
  wb.created = new Date();

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B1B0E' } };
  const headerFont = { color: { argb: 'FFE8D5B5' }, bold: true };
  const styleHeader = (row) => { row.eachCell((c) => { c.fill = headerFill; c.font = headerFont; }); };

  // --- Control -------------------------------------------------------------
  const control = wb.addWorksheet('Control');
  control.addRow(['Event', EVENT_NAME]);
  control.addRow(['Club', CLUB_NAME]);
  control.addRow(['Exported At', new Date().toISOString()]);
  control.addRow(['Current Round', state.event.currentRound]);
  control.addRow(['Show Personal Position', state.event.showPersonalPosition]);
  control.addRow(['Finished', state.event.finished]);
  control.addRow([]);
  control.addRow(['Round', 'Status']);
  styleHeader(control.lastRow);
  for (let r = 1; r <= 6; r++) control.addRow([r, state.rounds[r].status]);
  control.addRow([]);
  control.addRow(['CONFIDENTIAL — this workbook contains the answer key. Do not share before all rounds are revealed.']);
  control.columns = [{ width: 28 }, { width: 40 }];

  // --- Answer Key ------------------------------------------------------------
  const ansSheet = wb.addWorksheet('Answer Key');
  ansSheet.addRow(['Round', 'Whisky', 'Distillery', 'Age']);
  styleHeader(ansSheet.lastRow);
  for (let r = 1; r <= 6; r++) {
    const k = ANSWER_KEY[r];
    ansSheet.addRow([r, k.whisky, k.distillery, k.age]);
  }
  ansSheet.columns = [{ width: 10 }, { width: 32 }, { width: 28 }, { width: 8 }];

  // --- Participants ----------------------------------------------------------
  const partSheet = wb.addWorksheet('Participants');
  partSheet.addRow([
    'Participant ID', 'Participant Name', 'Registration Time', 'Session Status',
    'Whisky 1 Submitted', 'Whisky 2 Submitted', 'Whisky 3 Submitted',
    'Whisky 4 Submitted', 'Whisky 5 Submitted', 'Whisky 6 Submitted',
    'Current Score', 'Perfect Guesses', 'Final Score', 'Final Position',
  ]);
  styleHeader(partSheet.lastRow);
  const board = leaderboard(state);
  const posById = Object.fromEntries(board.map((b) => [b.participantId, b.position]));
  Object.values(state.participants).forEach((p) => {
    const progress = participantProgress(state, p.id);
    const subs = state.submissions[p.id] || {};
    const recentlyActive = (Date.now() - new Date(p.lastSeenAt).getTime()) < 30 * 60 * 1000;
    partSheet.addRow([
      p.id, p.name, p.registeredAt, recentlyActive ? 'Active' : 'Idle',
      !!subs[1], !!subs[2], !!subs[3], !!subs[4], !!subs[5], !!subs[6],
      progress.totalScore, progress.perfectGuesses,
      state.event.finished ? progress.totalScore : '',
      state.event.finished ? posById[p.id] : '',
    ]);
  });
  partSheet.columns = Array(14).fill({ width: 16 });

  // --- Whisky N Responses ------------------------------------------------
  for (let r = 1; r <= 6; r++) {
    const sheet = wb.addWorksheet(`Whisky ${r} Responses`);
    sheet.addRow(['Participant', 'Nose', 'Palate', 'Finish', 'Overall', 'Distillery Guess', 'Age Guess', 'Notes', 'Submitted At']);
    styleHeader(sheet.lastRow);
    Object.values(state.participants).forEach((p) => {
      const sub = (state.submissions[p.id] || {})[r];
      if (!sub) return;
      sheet.addRow([p.name, sub.nose, sub.palate, sub.finish, sub.overall, sub.distilleryGuess, sub.ageGuess, sub.notes || '', sub.submittedAt]);
    });
    sheet.columns = [{ width: 20 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 26 }, { width: 10 }, { width: 40 }, { width: 22 }];
  }

  // --- Combined Results ----------------------------------------------------
  const combined = wb.addWorksheet('Combined Results');
  combined.addRow(['Participant', 'Round', 'Nose', 'Palate', 'Finish', 'Overall', 'Distillery Guess', 'Age Guess', 'Notes', 'Submitted At']);
  styleHeader(combined.lastRow);
  Object.values(state.participants).forEach((p) => {
    for (let r = 1; r <= 6; r++) {
      const sub = (state.submissions[p.id] || {})[r];
      if (!sub) continue;
      combined.addRow([p.name, r, sub.nose, sub.palate, sub.finish, sub.overall, sub.distilleryGuess, sub.ageGuess, sub.notes || '', sub.submittedAt]);
    }
  });
  combined.columns = [{ width: 20 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 26 }, { width: 10 }, { width: 40 }, { width: 22 }];

  // --- Scoring (reference rules) -------------------------------------------
  const scoringSheet = wb.addWorksheet('Scoring');
  scoringSheet.addRow(['Result', 'Score']);
  styleHeader(scoringSheet.lastRow);
  scoringSheet.addRow(['Neither correct', 0]);
  scoringSheet.addRow(['Distillery only', SCORING.DISTILLERY_POINT]);
  scoringSheet.addRow(['Age only', SCORING.AGE_POINT]);
  scoringSheet.addRow(['Both correct', SCORING.MAX_PER_ROUND]);
  scoringSheet.addRow([]);
  scoringSheet.addRow(['Max per round', SCORING.MAX_PER_ROUND]);
  scoringSheet.addRow(['Max overall', SCORING.MAX_TOTAL]);
  scoringSheet.columns = [{ width: 22 }, { width: 10 }];

  // --- Participant Scores (per-round breakdown) -----------------------------
  const psheet = wb.addWorksheet('Participant Scores');
  psheet.addRow(['Participant', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Total', 'Max Possible', 'Perfect Guesses']);
  styleHeader(psheet.lastRow);
  Object.values(state.participants).forEach((p) => {
    const progress = participantProgress(state, p.id);
    const perRound = [1, 2, 3, 4, 5, 6].map((r) => (progress.rounds[r].status === 'REVEALED' ? progress.rounds[r].score : ''));
    psheet.addRow([p.name, ...perRound, progress.totalScore, progress.maxPossible, progress.perfectGuesses]);
  });
  psheet.columns = Array(10).fill({ width: 12 });

  // --- Leaderboard -----------------------------------------------------------
  const lb = wb.addWorksheet('Leaderboard');
  lb.addRow(['Position', 'Participant', 'Score', 'Perfect Guesses', 'Correct Distilleries', 'Correct Ages']);
  styleHeader(lb.lastRow);
  board.forEach((b) => lb.addRow([b.position, b.name, b.totalScore, b.perfectGuesses, b.correctDistilleries, b.correctAges]));
  lb.columns = [{ width: 10 }, { width: 20 }, { width: 10 }, { width: 16 }, { width: 20 }, { width: 14 }];

  // --- Whisky Results (per-round aggregate) ---------------------------------
  const wr = wb.addWorksheet('Whisky Results');
  wr.addRow(['Round', 'Status', 'Responses', 'Avg Nose', 'Avg Palate', 'Avg Finish', 'Avg Overall', '% Correct Distillery', '% Correct Age', '% Correct Both', 'Revealed Whisky']);
  styleHeader(wr.lastRow);
  for (let r = 1; r <= 6; r++) {
    const gs = groupStats(state, r);
    wr.addRow([
      r, state.rounds[r].status, gs.responses,
      gs.avgNose.toFixed(2), gs.avgPalate.toFixed(2), gs.avgFinish.toFixed(2), gs.avgOverall.toFixed(2),
      gs.correctDistilleryPct ?? '', gs.correctAgePct ?? '', gs.correctBothPct ?? '',
      gs.revealed ? gs.answer.whisky : '',
    ]);
  }
  wr.columns = Array(11).fill({ width: 14 });

  // --- Dashboard (KPIs) --------------------------------------------------
  const dash = wb.addWorksheet('Dashboard');
  const summary = eventSummary(state);
  dash.addRow(['Metric', 'Value']);
  styleHeader(dash.lastRow);
  dash.addRow(['Participants', Object.keys(state.participants).length]);
  dash.addRow(['Current Round', state.event.currentRound]);
  if (summary) {
    dash.addRow(['Highest Rated Whisky', `${summary.highestRatedWhisky.whisky} (${summary.highestRatedWhisky.avgOverall.toFixed(2)})`]);
    dash.addRow(['Lowest Rated Whisky', `${summary.lowestRatedWhisky.whisky} (${summary.lowestRatedWhisky.avgOverall.toFixed(2)})`]);
    dash.addRow(['Most Correctly Identified', `${summary.mostCorrectlyIdentified.whisky} (${summary.mostCorrectlyIdentified.correctBothPct}%)`]);
    dash.addRow(['Least Correctly Identified', `${summary.leastCorrectlyIdentified.whisky} (${summary.leastCorrectlyIdentified.correctBothPct}%)`]);
    dash.addRow(['Total Perfect Guesses', summary.totalPerfectGuesses]);
  }
  dash.columns = [{ width: 28 }, { width: 40 }];

  // --- PowerPoint Data (flattened, chart-ready) -----------------------------
  const pptData = wb.addWorksheet('PowerPoint Data');
  pptData.addRow(['Round', 'Whisky (if revealed)', 'Avg Nose', 'Avg Palate', 'Avg Finish', 'Avg Overall', 'Responses', '% Correct Distillery', '% Correct Age', '% Correct Both']);
  styleHeader(pptData.lastRow);
  for (let r = 1; r <= 6; r++) {
    const gs = groupStats(state, r);
    pptData.addRow([
      r, gs.revealed ? gs.answer.whisky : '(not yet revealed)',
      gs.avgNose.toFixed(2), gs.avgPalate.toFixed(2), gs.avgFinish.toFixed(2), gs.avgOverall.toFixed(2),
      gs.responses, gs.correctDistilleryPct ?? '', gs.correctAgePct ?? '', gs.correctBothPct ?? '',
    ]);
  }
  pptData.columns = Array(10).fill({ width: 16 });

  return wb;
}

module.exports = { buildWorkbook };
