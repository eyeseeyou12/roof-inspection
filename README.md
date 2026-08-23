# Roof Assessment Details

An installable, phone-friendly checklist for on-site roof assessments, styled to match the Priority Roofing brand. Fill it out during the inspection, tap **Generate & Email Report**, and a PDF report gets emailed to whoever filled it out — sent from `geplutoroofs@gmail.com`. This is an internal report (inspection details), not something sent to the client — it's meant to be used afterward when preparing the client's actual estimate or report.

The checklist itself is a static site (plain HTML/CSS/JS, same as `arbor-sleep-log`). Sending the email needs a tiny bit of server-side code — a [Netlify Function](https://docs.netlify.com/functions/overview/) that sends via Gmail through [Nodemailer](https://nodemailer.com/) — because attaching a file to an email from pure client-side JS turned out to require a paid plan on every no-backend email service (EmailJS included: free tier has no attachment support at all). Netlify's free tier hosts both the static site and this function together, no separate server to run.

## One-time setup

Two things only you can do (a Google login and a Netlify login), then everything else is already wired up.

### 1. Get a Gmail App Password for geplutoroofs@gmail.com

Regular Gmail passwords don't work for this — you need an **App Password**, which requires 2-Step Verification to be turned on for the account first.

1. Sign in to `geplutoroofs@gmail.com`.
2. Turn on 2-Step Verification if it isn't already: [myaccount.google.com/signinoptions/two-step-verification](https://myaccount.google.com/signinoptions/two-step-verification).
3. Generate an app password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — name it something like "Roof Assessment App".
4. Copy the 16-character password it gives you (spaces don't matter). You'll paste this into Netlify in step 3 below — it's not saved anywhere in this repo.

### 2. Deploy to Netlify

1. Push this repo to GitHub (see **Deploying** below if it isn't already).
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → connect GitHub → pick this repo.
3. Build settings: leave the build command blank and publish directory as `.` — `netlify.toml` in this repo already has these set, so Netlify should pick them up automatically.
4. Deploy. Netlify gives you a URL like `https://random-name-123.netlify.app` (you can rename it or add a custom domain later in **Site configuration → Domain management**).

### 3. Set the environment variables

In the Netlify site: **Site configuration → Environment variables → Add a variable**, add:

| Key | Value |
|---|---|
| `GMAIL_USER` | `geplutoroofs@gmail.com` |
| `GMAIL_APP_PASSWORD` | the 16-character app password from step 1 |
| `ALLOWED_ORIGIN` | your Netlify site URL, e.g. `https://random-name-123.netlify.app` (optional but recommended — see **Security note** below) |

Then trigger a redeploy (**Deploys → Trigger deploy → Deploy site**) so the function picks up the new variables.

That's it — the checklist and the send function are now both live at your Netlify URL.

## Deploying (pushing this repo to GitHub)

This folder is its own git repo, like `arbor-sleep-log` and `the-arcade`.

```bash
gh repo create roof-inspection --public --source=. --push
```

## Installing on a phone

1. Open your Netlify URL on the phone in Safari (iPhone) or Chrome (Android).
2. iPhone: tap the Share icon → **Add to Home Screen**. Android: tap the menu (⋮) → **Add to Home screen** / **Install app**.
3. Launch it from the home screen like any app.

## Security note

The send function (`netlify/functions/send-report.js`) is a public URL once deployed. It checks that requests come from your own site's origin (via `ALLOWED_ORIGIN`), validates the recipient looks like an email address, and caps attachment size — but since the site's source is public, this isn't a hard security boundary against a determined attacker, only against casual scanning/abuse. The Gmail app password itself is never exposed to the browser — it lives only in Netlify's environment variables and is used server-side, which is the main thing keeping the account safe. Gmail's own daily send limits (500/day on a regular account) also cap worst-case damage.

## What the checklist covers

- Property address, optional client name, your email (where the PDF report is sent — for internal records, not the client)
- Active leak: yes/no, plus location and cause if yes
- Soffit (open/closed), existing soffit intake, gable vents, fascia damage/rot, drip edge
- Roof type (architectural / 3-tab / other), one or two story
- Existing roof components with optional quantity/size: box vents, turtle vent, ridge vent, rain caps (3–5" / 6"+), pipe jacks (1.5" / 2" / 3"), bathroom vent, dryer vent, satellite dish, roof intake ventilation, chimney (+ existing cricket), other
- Storm damage per slope (left/right/front/back): wind damage + qty of wind-damaged shingles, hail damage + hail hits in test square
- Collateral damage checklist: window screens, window aluminum/vinyl trim, siding, garage door, AC unit screen, other (with description)
- Free-text additional notes

If sending fails (e.g. no signal on site, or the function isn't deployed/configured yet), the PDF downloads locally instead so nothing is lost — just re-send or share it manually later.

## Local development

The checklist itself needs no build step and can be opened directly:

```bash
python3 -m http.server 8000
```

Note that with a plain static server like this, the **Generate & Email Report** button will always fall back to downloading the PDF, since there's no function running to send it — that requires either a full Netlify deploy, or running `netlify dev` locally (needs [Node.js](https://nodejs.org/) and the [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed: `npm install -g netlify-cli`, then `netlify dev` from this folder, with `GMAIL_USER` / `GMAIL_APP_PASSWORD` set in a local `.env` file).

## Stack

Plain HTML/CSS/JS front end. PDF generation via a locally vendored copy of [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) (MIT licensed, in `vendor/`). Email sending via a [Netlify Function](netlify/functions/send-report.js) using [Nodemailer](https://nodemailer.com/) over Gmail SMTP. Installable as a PWA with a service worker for offline use of the checklist itself (sending the email still needs a connection).
