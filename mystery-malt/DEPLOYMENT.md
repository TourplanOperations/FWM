# Deploying the Mystery Malt Tasting System

This is a self-contained Node.js app: one server, three web pages (participant
dashboard, host control panel, big-screen display), and a JSON file for
storage. No Microsoft 365 / Forms / Excel Online account is required to run
the live event — see "Why not Forms + Excel Online?" at the bottom if you
want the background on that decision.

## 1. Before the event — decide on hosting

You need somewhere that can run a small Node server and give you a stable
public URL for the QR code. Recommended, cheapest-to-simplest:

**Render.com (recommended)**
Free web service tier, no credit card required, deploys straight from a
GitHub repo, gives you a URL like `https://mysterymalt-fwm.onrender.com`.

1. Push this folder to a new GitHub repo (private is fine).
2. At https://render.com → New → Web Service → connect that repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add an environment variable `HOST_KEY` set to a password only you and
   whoever runs the display screen know (replaces the default in
   `config.js`).
5. Deploy. Render gives you the public URL once it's live.

Free-tier caveat: the service spins down after 15 minutes of no traffic and
takes ~30-60 seconds to wake back up on the next request. Visit the URL
yourself about 10 minutes before doors open to warm it up, or upgrade to
Render's $7/month "Starter" instance for the night so it never sleeps.

**Alternatives** if you'd rather not use Render: Railway.app (similar flow,
usage-based pricing after a trial credit) or Fly.io (free allowance, a bit
more command-line setup). Any host that runs a Node.js web service works —
the app has no other infrastructure dependency.

## 2. Get a short, memorable link

Render's own URL (`https://mysterymalt-fwm.onrender.com`) is usable as-is
for the QR code, but it's long to type or read off a screen. Two ways to
shorten it, in order of polish:

- **A domain you already own**: point a subdomain or path at the Render URL
  (e.g. `mysterymalt.yourdomain.com` via a CNAME record, or a redirect at
  `yourdomain.com/mysterymalt`). This is the "https://[domain]/mysterymalt"
  format the brief describes.
- **A free URL shortener**: is.gd, tinyurl.com, or similar, pointed at your
  Render URL. Takes two minutes, no domain needed. `is.gd/mysterymalt5` is
  a reasonable choice if available.

Whichever you land on, that's the one URL you use everywhere: the QR code,
the PowerPoint, table cards, WhatsApp.

## 3. Wire the real URL into the app

Once you have the final URL:

1. Open `host.html` (the control panel) in a browser, or just visit
   `https://your-url/host`.
2. Enter your `HOST_KEY` when prompted.
3. In the "Start Here QR Code" card, paste the final URL and click
   **Generate QR Code**. Right-click → save that image — this is your
   permanent QR code for printed table cards and the opening slide.
4. Open `pptx-build.js`, change the `DISPLAY_URL` constant near the top to
   your final URL (without `https://`, e.g. `mysterymalt.yourdomain.com`),
   replace `assets/qr-placeholder.png` with the QR image you just saved
   (same filename, or update `QR_PATH`), then run `node pptx-build.js`
   again to regenerate `Mystery_Malt_Series_No5.pptx` with the real link
   baked in.

## 4. Set the host key

`config.js` has a default `HOST_KEY`. Change it (or set the `HOST_KEY`
environment variable on your hosting platform) before the event — this key
gates `/host` and `/display`, which is what keeps the answer key and other
participants' data away from anyone who isn't running the show.

## 5. Do a dry run

1. Deploy, open the participant dashboard on your own phone, register.
2. Open `/host`, open Whisky #1, submit a test response from your phone,
   close the round, reveal it — confirm your phone updates within ~15
   seconds and shows the right score.
3. Open `/display` on a laptop connected to the projector/TV and confirm
   it mirrors the host panel's round state.
4. When you're happy, use the host panel's **Reset Entire Event** button
   (Danger Zone) to wipe the test data before real guests join.

## 6. On the night

Run the host control panel from your phone or a laptop — you don't need to
touch the participant dashboard or display screen once things are running.
The whole event is: **Current Round → Round Status (OPEN → CLOSED →
REVEALED) → Next Round**, repeated six times, per section 18 of the brief.
Use the big-screen display (`/display`) as your "PowerPoint" for group
results, reveals, and the leaderboard; use the actual PowerPoint deck only
for the opening slide, the six "Taste & Submit" title cards, and the
closing thank-you slide (see the speaker notes on each round slide for the
cue to alt-tab between the two).

After the event, download the Excel export from the host panel (Settings →
Download Excel Export) as your permanent record — it contains every sheet
listed in the original brief (Participants, Combined Results, Leaderboard,
etc.) built from the night's actual data.

## Confirm the distillery candidate list

`config.js` has a `DISTILLERY_CANDIDATES` array — the dropdown options
guests choose from when guessing a distillery. It currently contains the
six correct answers plus a placeholder spread of Highland/Speyside/Island
decoys. Check this against your actual Thomson Bros Mystery Malt Series
No.5 box materials (the leaflet or card that usually ships with the set)
before the event and edit the array if the real candidate list differs —
this is the one piece of content in the whole system that depends on
information only the box itself has.

---

## Why not Forms + Excel Online + Power Automate?

The original brief specified Microsoft Forms → Excel Online → Power
Automate → PowerPoint as the pipeline. That's a reasonable architecture if
you have Microsoft 365 admin access and want the data to live natively in
your tenant, but it requires manually building six Forms, an Excel Online
workbook with live formulas, and several Power Automate flows to bridge
registration → per-round locking → scoring → the dashboard — none of which
can be done by an AI session without direct access to your Microsoft 365
tenant.

This build replaces that pipeline with a single small web app that does
the same job end to end (registration, round locking, scoring, live
dashboards, host control) without needing any Microsoft 365 setup, and
still produces an Excel workbook as a downloadable record afterward. If
you'd prefer the literal Forms/Excel/Power Automate version instead, that's
a separate, larger build — happy to switch to it if you get me
edit access to set it up, or produce the exact form/flow specs for you to
build yourself.
