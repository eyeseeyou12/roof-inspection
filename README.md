# Roof Inspection Checklist

An installable, phone-friendly checklist for on-site roof assessments, styled to match the Priority Roofing brand. Fill it out during the inspection, tap **Generate & Email Report**, and a PDF report gets emailed to whoever filled it out — sent from `geplutoroofs@gmail.com`. This is an internal report (inspection details), not something sent to the client — it's meant to be used afterward when preparing the client's actual estimate or report.

No backend server: it's a static site that sends email client-side via [EmailJS](https://www.emailjs.com/), the same way `arbor-sleep-log` generates PDFs with a locally vendored copy of jsPDF.

## One-time setup: connect EmailJS to geplutoroofs@gmail.com

This part has to be done by hand in a browser (it's an OAuth login to the Gmail account) — nothing here can do it automatically.

1. **Create a free EmailJS account** at [emailjs.com](https://www.emailjs.com/) (sign up with any login — it doesn't need to be the Gmail account itself).
2. **Add an Email Service:** Dashboard → *Email Services* → *Add New Service* → choose **Gmail** → connect and authorize `geplutoroofs@gmail.com`. Note the generated **Service ID**.
3. **Create an Email Template:** Dashboard → *Email Templates* → *Create New Template*. Set it up like this:
   - **To Email:** `{{to_email}}` (this is the inspector's own email entered on the form, not the client's)
   - **From Name:** `Priority Roofing`
   - **Subject:** `Roof Inspection Report – {{address}}`
   - **Content:** something like:
     ```
     Inspection report attached.

     Address: {{address}}
     Client: {{client_name}}
     ```
   - **Attachment:** click *Add Attachment* in the template editor and set its variable name to exactly `attachment` (this must match `app.js`, which names the uploaded file field `attachment`).
   - Save the template and note the **Template ID**.
4. **Get your Public Key:** Dashboard → *Account* → *General* → copy the **Public Key**.
5. **Restrict the key to your domain (do this after deploying):** Dashboard → *Account* → *Security* → add your GitHub Pages URL (e.g. `https://yourusername.github.io`) to the allowed origins, so the key can't be used to send from anywhere else.
6. **Fill in [`config.js`](config.js)** with the three values from above:
   ```js
   window.EMAILJS_CONFIG = {
     PUBLIC_KEY: "...",
     SERVICE_ID: "...",
     TEMPLATE_ID: "..."
   };
   ```

Until `config.js` is filled in, tapping the submit button just downloads the PDF locally instead of emailing it — so the app is fully usable (minus auto-email) even before setup is finished.

**Note on limits:** EmailJS's free tier caps monthly email volume and message size. These reports are plain-text-and-table PDFs (small, generally well under any attachment cap), but if you start hitting limits, check your plan on the EmailJS pricing page.

## Deploying

This folder is its own git repo, like `arbor-sleep-log` and `the-arcade`. To publish it:

```bash
gh repo create roof-inspection --public --source=. --push
```

Then in the new GitHub repo: **Settings → Pages → Deploy from branch → main → / (root)**. GitHub gives you an `https://<username>.github.io/roof-inspection/` URL — that's what you add to the EmailJS allowed origins above, and what you open on the phone to install it.

## Installing on a phone

1. Open the deployed URL on the phone in Safari (iPhone) or Chrome (Android).
2. iPhone: tap the Share icon → **Add to Home Screen**. Android: tap the menu (⋮) → **Add to Home screen** / **Install app**.
3. Launch it from the home screen like any app.

## What the checklist covers

- Property address, optional client name, your email (where the PDF report is sent — for internal records, not the client)
- Soffit (open/closed), existing soffit intake, gable vents, fascia damage/rot, drip edge
- Roof type (architectural / 3-tab / other), one or two story
- Existing roof components with optional quantity/size: box vents, turtle vent, ridge vent, rain caps (3–5" / 6"+), pipe jacks (1.5" / 2" / 3"), bathroom vent, dryer vent, satellite dish, roof intake ventilation, chimney (+ existing cricket), other
- Free-text additional notes

If sending fails (e.g. no signal on site), the PDF downloads locally instead so nothing is lost — just re-send or share it manually later.

## Local development

No build step needed.

```bash
python3 -m http.server 8000
```

## Stack

Plain HTML/CSS/JS. PDF generation via a locally vendored copy of [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) (MIT licensed, in `vendor/`). Email sending via a locally vendored copy of the [EmailJS browser SDK](https://github.com/emailjs/emailjs-sdk) (MIT licensed). Installable as a PWA with a service worker for offline use of the checklist itself (sending the email still needs a connection).
