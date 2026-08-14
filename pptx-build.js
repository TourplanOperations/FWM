// Builds the ceremonial / static PowerPoint deck for the Mystery Malt tasting.
// The dynamic content (live group results, reveals, leaderboard) is handled
// by public/display.html on the big screen instead of PowerPoint — see the
// speaker notes on each round slide for the handoff cue.

const pptxgen = require('pptxgenjs');
const path = require('path');

const COLORS = {
  bg: '130E09',
  bg2: '1F1712',
  amber: 'C98A3A',
  amberBright: 'E8A83F',
  gold: 'D4B06A',
  cream: 'F0E6D2',
  creamDim: 'B9AC93',
  line: '3A2C1C',
};

const QR_PATH = path.join(__dirname, 'assets', 'qr-placeholder.png');

const DISPLAY_URL = 'thompsonbrostasting.onrender.com';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.3" x 7.5"

function baseSlide() {
  const s = pres.addSlide();
  s.background = { color: COLORS.bg };
  return s;
}

function kicker(s, text, opts = {}) {
  s.addText(text.toUpperCase(), {
    x: 0.6, y: opts.y ?? 0.55, w: 12.1, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, color: COLORS.amberBright,
    charSpacing: 3, align: 'center',
  });
}

function footerNote(s, text) {
  s.addText(text, {
    x: 0.6, y: 6.95, w: 12.1, h: 0.4,
    fontFace: 'Calibri', fontSize: 11, color: COLORS.creamDim,
    align: 'center', italic: true,
  });
}

// ---------------------------------------------------------------------------
// 1. Opening / Start Here
// ---------------------------------------------------------------------------
{
  const s = baseSlide();
  kicker(s, 'Thomson Bros', { y: 0.7 });
  s.addText('MYSTERY MALT SERIES NO.5', {
    x: 0.6, y: 1.05, w: 12.1, h: 0.9,
    fontFace: 'Cambria', fontSize: 40, bold: true, color: COLORS.cream, align: 'center',
  });
  s.addText('BLIND WHISKY TASTING', {
    x: 0.6, y: 1.85, w: 12.1, h: 0.55,
    fontFace: 'Calibri', fontSize: 20, color: COLORS.gold, align: 'center', charSpacing: 2,
  });

  s.addText('START HERE', {
    x: 0.6, y: 2.55, w: 12.1, h: 0.5,
    fontFace: 'Calibri', fontSize: 18, bold: true, color: COLORS.amberBright, align: 'center', charSpacing: 2,
  });

  s.addImage({ path: QR_PATH, x: 5.4, y: 3.15, w: 2.5, h: 2.5 });

  s.addText('Scan the QR code', {
    x: 0.6, y: 5.75, w: 12.1, h: 0.4,
    fontFace: 'Calibri', fontSize: 16, color: COLORS.cream, align: 'center',
  });
  s.addText('OR', {
    x: 0.6, y: 6.1, w: 12.1, h: 0.3,
    fontFace: 'Calibri', fontSize: 12, color: COLORS.creamDim, align: 'center',
  });
  s.addText(`Visit: ${DISPLAY_URL}`, {
    x: 0.6, y: 6.4, w: 12.1, h: 0.4,
    fontFace: 'Calibri', fontSize: 18, bold: true, color: COLORS.amberBright, align: 'center',
  });

  footerNote(s, 'Open the tasting dashboard once and keep it open throughout the evening.');
  s.addNotes('PLACEHOLDER QR + URL — replace assets/qr-placeholder.png and the two URL text boxes above with your real deployed Start-Here link before the event. See DEPLOYMENT.md.');
}

// ---------------------------------------------------------------------------
// 2. How Tonight Works
// ---------------------------------------------------------------------------
{
  const s = baseSlide();
  kicker(s, 'Friday Whisky Mafia');
  s.addText('How Tonight Works', {
    x: 0.6, y: 0.95, w: 12.1, h: 0.7,
    fontFace: 'Cambria', fontSize: 32, bold: true, color: COLORS.cream, align: 'center',
  });

  const steps = [
    { n: '1', t: 'Join once', d: 'Scan the QR code or visit the Start Here link and enter your name.' },
    { n: '2', t: 'Taste in order', d: 'Six mystery malts, one at a time — nose, palate, finish, overall.' },
    { n: '3', t: 'Guess & submit', d: 'Guess the distillery and age for each dram, then submit on your phone.' },
    { n: '4', t: 'Watch it unfold', d: 'Results, reveals and the leaderboard appear here on the big screen.' },
  ];
  const colW = 2.85, gap = 0.25, startX = 0.6;
  steps.forEach((step, i) => {
    const x = startX + i * (colW + gap);
    s.addShape(pres.ShapeType.ellipse, { x, y: 2.0, w: 0.7, h: 0.7, fill: { color: COLORS.amber }, line: { color: COLORS.gold, width: 1 } });
    s.addText(step.n, { x, y: 2.0, w: 0.7, h: 0.7, align: 'center', valign: 'middle', fontFace: 'Cambria', fontSize: 24, bold: true, color: COLORS.bg });
    s.addText(step.t, { x, y: 2.85, w: colW, h: 0.5, fontFace: 'Cambria', fontSize: 17, bold: true, color: COLORS.amberBright });
    s.addText(step.d, { x, y: 3.35, w: colW, h: 1.7, fontFace: 'Calibri', fontSize: 13, color: COLORS.creamDim, valign: 'top' });
  });

  footerNote(s, 'No leaderboard on your phone during the tasting — the suspense stays on the big screen.');
}

// ---------------------------------------------------------------------------
// 3-8. Six "Taste & Submit" round slides
// ---------------------------------------------------------------------------
for (let r = 1; r <= 6; r++) {
  const s = baseSlide();
  kicker(s, 'Mystery Malt Series No.5', { y: 0.5 });
  s.addText(`WHISKY #${r}`, {
    x: 0.6, y: 0.85, w: 12.1, h: 0.95,
    fontFace: 'Cambria', fontSize: 46, bold: true, color: COLORS.cream, align: 'center',
  });
  s.addText('Taste. Rate. Guess. Submit.', {
    x: 0.6, y: 1.8, w: 12.1, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, color: COLORS.gold, align: 'center',
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 2.9, y: 2.5, w: 7.5, h: 1.1, rectRadius: 0.12,
    fill: { color: COLORS.bg2 }, line: { color: COLORS.line, width: 1 },
  });
  s.addText('Already joined?', {
    x: 3.1, y: 2.62, w: 7.1, h: 0.35, fontFace: 'Calibri', fontSize: 14, bold: true, color: COLORS.amberBright,
  });
  s.addText('Use the tasting dashboard already open on your phone.', {
    x: 3.1, y: 2.98, w: 7.1, h: 0.5, fontFace: 'Calibri', fontSize: 14, color: COLORS.cream,
  });

  s.addText('Joining late?', {
    x: 0.6, y: 3.85, w: 12.1, h: 0.35,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: COLORS.amberBright, align: 'center',
  });
  s.addImage({ path: QR_PATH, x: 5.77, y: 4.25, w: 1.8, h: 1.8 });
  s.addText('SCAN TO JOIN', {
    x: 0.6, y: 6.1, w: 12.1, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: COLORS.creamDim, align: 'center', charSpacing: 2,
  });
  s.addText(`Visit: ${DISPLAY_URL}`, {
    x: 0.6, y: 6.45, w: 12.1, h: 0.35,
    fontFace: 'Calibri', fontSize: 13, italic: true, color: COLORS.creamDim, align: 'center',
  });

  s.addNotes(`HOST CUE — after closing this round's submissions, switch to the live big-screen display (/display) for Group Results → Reveal → Leaderboard, then return here (or straight to Whisky #${r + 1 <= 6 ? r + 1 : 'Final Results'}) to open the next round.`);
}

// ---------------------------------------------------------------------------
// 9. Final Results transition
// ---------------------------------------------------------------------------
{
  const s = baseSlide();
  kicker(s, 'Mystery Malt Series No.5');
  s.addText('FINAL RESULTS', {
    x: 0.6, y: 2.3, w: 12.1, h: 1.1,
    fontFace: 'Cambria', fontSize: 48, bold: true, color: COLORS.cream, align: 'center',
  });
  s.addText('🥇  🥈  🥉', {
    x: 0.6, y: 3.5, w: 12.1, h: 0.9, fontSize: 40, align: 'center',
  });
  s.addText('Winner, runner-up and third place appear live on the big-screen display.', {
    x: 1.5, y: 4.5, w: 10.3, h: 0.6,
    fontFace: 'Calibri', fontSize: 16, color: COLORS.gold, align: 'center',
  });
  s.addNotes('HOST CUE — switch to /display now that Whisky #6 has been revealed. It shows the podium plus event highlights (highest/lowest rated, most/least identified, total perfect guesses).');
}

// ---------------------------------------------------------------------------
// 10. Thank you
// ---------------------------------------------------------------------------
{
  const s = baseSlide();
  s.addText('SLÀINTE MHATH', {
    x: 0.6, y: 2.7, w: 12.1, h: 1.0,
    fontFace: 'Cambria', fontSize: 40, bold: true, color: COLORS.amberBright, align: 'center',
  });
  s.addText('Thank you for tasting with us.', {
    x: 0.6, y: 3.75, w: 12.1, h: 0.6,
    fontFace: 'Calibri', fontSize: 18, color: COLORS.cream, align: 'center',
  });
  s.addText('Friday Whisky Mafia  ·  Thomson Bros Mystery Malt Series No.5', {
    x: 0.6, y: 4.35, w: 12.1, h: 0.4,
    fontFace: 'Calibri', fontSize: 12, color: COLORS.creamDim, align: 'center',
  });
}

pres.writeFile({ fileName: path.join(__dirname, 'Mystery_Malt_Series_No5.pptx') }).then(() => {
  console.log('Deck written.');
});
