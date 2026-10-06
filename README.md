# Torrential News

AI & Software Intelligence for Torrent Capital. A private dashboard built with Vite + React, with secure Vercel backend routes.

## What is in the box

```
torrential-news/
  api/
    summarize.js      Secure AI summarization (Claude). Uses ANTHROPIC_API_KEY.
    onedrive.js       Downloads an Excel/CSV from a OneDrive/SharePoint link.
    status.js         Reports which features are configured (true/false only).
  public/
    favicon.svg
    torrential-news-template.csv   Blank template with the 19 columns.
  src/
    main.jsx, App.jsx, styles.css, constants.js
    components/       DataSources, DailyBrief, IntelligenceFeed, EntryCard,
                      NewsletterIntake, HealthSnapshot, Watchlist, ui
    utils/data.js     Parsing, filtering, export, storage helpers
  index.html, package.json, vite.config.js, vercel.json
  .env.example, .gitignore
```

## 1. Run locally (optional)

1. Install Node.js (LTS) from https://nodejs.org
2. Open Terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
3. Open the address it prints (usually http://localhost:5173).

The dashboard, Google Sheet import, and Excel/CSV upload work this way. The AI summary and OneDrive import need the backend: deploy to Vercel (below), or install the Vercel CLI (`npm i -g vercel`) and run `npm run dev:vercel`.

## 2. Upload to GitHub

1. Create a free account at https://github.com, then click **New repository**. Name it `torrential-news`, keep it **Private**, click **Create repository**.
2. On the new repo page click **uploading an existing file**.
3. Drag in everything INSIDE the project folder (not the folder itself, and not `node_modules` or `dist`). Make sure the `api`, `src`, and `public` folders are included.
4. Click **Commit changes**.

## 3. Deploy on Vercel

1. Sign in at https://vercel.com with your GitHub account.
2. Click **Add New... > Project**, pick `torrential-news`, click **Import**.
3. Vercel detects Vite automatically. Leave all settings as they are and click **Deploy**.
4. In about a minute you get a live link. Because the data is private, consider turning on **Vercel Authentication** (Project > Settings > Deployment Protection) so only your team can open it.

## 4. Add the API key securely

1. Get a key at https://console.anthropic.com (API Keys).
2. In Vercel open your project, then **Settings > Environment Variables**.
3. Add `ANTHROPIC_API_KEY` with your key. Tick Production, Preview, and Development, then **Save**.
4. Go to **Deployments**, open the latest one, click the three dots, and choose **Redeploy**.

The key lives only on Vercel's server. It is never in the browser or in GitHub. Until you add it, the dashboard still works and shows: "AI summarization is not configured yet. Add your API key in environment variables to enable this feature."

Optional: set `ANTHROPIC_MODEL` to use a different Claude model.

## 5. Connect your Google Sheet

1. Make your Sheet with these headers in row 1 (the order does not matter):
   Date Added, Published Date, Title, Source / Author, Organization, Source Type, Category, URL, Summary, Why It Matters, Key Signal, Signal Strength, Confidence, Priority, Tags, Status, Recommended Action, Notes, Verification Status
2. In Google Sheets: **File > Share > Publish to web**. Choose your tab, choose **Comma-separated values (.csv)**, click **Publish**.
3. Copy the link, paste it in **Data sources > Google Sheet**, and click **Import from Google Sheet**.

Re-click Import any time to refresh. By default an import replaces earlier imported entries (newsletter entries you added in the dashboard are kept). Tick "Add to existing entries" to combine instead.

Values should match these lists; anything else is handled safely:
- Category: AI Economics, AI Models, AI Agents & Tools, AI Infrastructure, Enterprise Software, Vertical B2B Software, Investor / Operator Commentary, Company-Building Lessons, Software Economics, GTM / Distribution, Other
- Priority: Core, Secondary, Monitor, Needs Review
- Signal Strength and Confidence: High, Medium, Low
- Status: New, Reviewed, Saved, Use in Weekly Brief, Archived
- Verification Status: Verified from source, Needs verification, Missing source

## 6. Upload Excel / CSV

**Data sources > Excel / CSV upload > Choose file.** Accepts .xlsx and .csv with the same headers. For Excel, the first sheet is read. A blank template is available from the **Download blank template** button.

## 7. OneDrive link

**Data sources > OneDrive link.** Paste a share link and click Import.

- **Works today** for links set to "Anyone with the link can view" (OneDrive personal or SharePoint). File must be .xlsx or .csv under 4 MB.
- **If you see "OneDrive did not allow access"**, the link is restricted to your company. That is the permission issue; use the section below when ready.

### OneDrive later (company files)

When your IT admin is ready, ask them to:
1. In Microsoft Entra admin center, create an **App registration** (single tenant).
2. Add **Microsoft Graph > Application permissions > Files.Read.All** (or **Sites.Read.All**) and **Grant admin consent**.
3. Create a **client secret**.
4. Send you the Tenant ID, Client ID, and secret value.

Then add them in Vercel as `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, and redeploy. The OneDrive tab will show "Company access is enabled" and restricted links will work. No code changes needed. Tip: ask the admin to limit the app to the specific site or folder if possible (Sites.Selected).

## 8. Paste or upload newsletters

**Newsletter intake:** paste text, or upload .txt, .md, .html, or .eml. Optionally add source name, author, URL, and published date (any you leave blank are marked "Needs verification" unless the text clearly states them). Click **Summarize newsletter**, then:
- **Copy Row for Google Sheet** copies one tab-separated row. Click column A of an empty row in your Sheet and paste.
- **Export Newsletter Summary as CSV** downloads the row.
- **Add to Intelligence Feed** saves it in the dashboard.

## How the AI Health Snapshot works

Each theme looks at entries whose Category matches (for example AI Infrastructure) or whose Tags include a related keyword. It shows the latest entry's Key Signal and Confidence. **Direction** is read from the latest entry's tags: add `positive`, `neutral`, or `watch`. With no direction tag it shows Neutral.

## Good to know

- Data is saved in your browser (localStorage). It is per browser and per device; your Google Sheet remains the master copy.
- Status changes and "Remove" in the feed affect only the dashboard, not your Sheet.
- Anti-hallucination: the AI is told to use only the pasted text and the details you enter, and the server forces "Needs verification" for unclear fields. Verification Status is set by rules (not by the AI): "Verified from source" only when you supply URL, date, and author/source; "Missing source" when you supply none.
- Newsletters over 60,000 characters are truncated. Vercel limits file transfers to about 4.5 MB.
