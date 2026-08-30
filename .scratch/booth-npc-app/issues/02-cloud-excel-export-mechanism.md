# Cloud Excel export mechanism

Type: research
Status: resolved

## Question

How can a server-side process keep a **cloud Excel workbook** continuously in sync with the contacts table, and which cloud is the right target?

Find the facts for both candidates:

- **Microsoft OneDrive / SharePoint via Microsoft Graph** — can a non-interactive service principal (app-only auth) create and append rows to a workbook table? What licensing or tenant admin consent does that need? What are the rate limits on the workbook API? What happens if a human has the file open in Excel at the same time?
- **Google Sheets API** — service-account auth, appending via `values.append` or the Sheets batch API, quota limits, and whether a service account can own or be granted a file inside a Workspace domain.

For each, report: the auth model and what a developer must set up, write throughput and rate limits, failure modes under concurrent writes, and whether **incremental append** or **periodic full rewrite** is the safer pattern.

Conclude with a recommendation for a standalone app that must be running in under 4 weeks.

## Answer

### Headline: the Microsoft Graph route is ruled out, and not for a reason we can engineer around

**The Graph Excel workbook API does not support app-only (application) permissions.** This is an auth-layer wall, not a rate limit or a quota:

- The Graph "Working with Excel" reference lists only `Files.Read` and `Files.ReadWrite` as the scopes for the Excel resource — both **delegated**. `Files.ReadWrite.All` (the application permission) is not among them.
- Microsoft's own Q&A confirms the failure mode: calling workbook operations such as `createSession` with application permissions means the service "cannot obtain edit rights on the workbook", returning **`EditModeAccessDenied`**. Application permissions are documented as *not supported* for table operations.
- Separately: **"Support for workbooks stored in OneDrive Consumer platform is still not available. At this time, only the files stored in business platform are supported by Excel REST APIs."** So even the delegated route requires OneDrive for Business or SharePoint — an M365 tenant.

The only way to drive a OneDrive/SharePoint workbook from a server is a **delegated flow with a stored refresh token belonging to a real person**. That is a bad fit here on three counts: it needs the corporate tenant and an app registration with admin consent (reintroducing exactly the approval path this project was scoped to avoid); refresh tokens expire and conditional-access or MFA policy changes silently break them, potentially mid-event; and the sync would run *as a named employee*, which is an awkward audit story for a file full of prospect PII.

Two further facts, recorded in case the route is ever revisited: workbook sessions are the performance mechanism (`workbook-session-id` header; persistent sessions expire after ~5 minutes of inactivity, non-persistent after ~7), and Graph recommends splitting large range reads/writes into smaller calls rather than one big one.

### Google Sheets: viable, and the quotas are a non-issue at this scale

- **Auth:** a Google Cloud service account with a JSON key; share the target spreadsheet with the service account's email as an editor. No tenant admin consent, no user in the loop, no refresh-token fragility.
- **Quotas:** 300 read and 300 write requests per minute per project; 60 per minute per user per project. All calls from one service account count as a single user.
- **Overage:** returns `429 Too many requests`; the documented remedy is exponential backoff. Note: **Google plans to start charging a Cloud billing account for exceeding the quota later in 2026** — relevant now rather than theoretical, so the sync must stay well inside the limit rather than relying on retries.
- **Other limits:** ~2 MB recommended maximum payload per request, 180-second request timeout.

At our load this is comfortable. 2,000 Leads across the whole event, synced on a schedule, is a handful of requests per hour — two orders of magnitude below the cap. Quotas do not constrain the design.

### Recommended: neither — generate the `.xlsx` ourselves

The spine already settled that **Postgres is the source of truth and Excel is a derived Export, never the store**. Once nobody is editing the workbook, a live-collaborative cloud spreadsheet is solving a problem we do not have — and both candidates above are ways of paying for that unneeded property.

**Generate a real `.xlsx` server-side and write it to object storage.**

- A Node-runtime API route on Vercel (already the stack, per [Stack, hosting and the NFC URL](01-stack-hosting-and-the-nfc-url.md)) queries Postgres, builds the workbook with SheetJS or ExcelJS, and writes it to Supabase Storage at a stable path.
- Triggered two ways: a **Vercel Cron** job on a schedule during the event, and an **on-demand regenerate** button on the organiser dashboard.
- The stable URL means the organiser's bookmark never breaks, and each regeneration is a full rewrite — so there is no append contention, no partial-write state, and no reconciliation to reason about.

Why this wins on every axis that matters here:

| | Graph / OneDrive | Google Sheets | Server-generated `.xlsx` |
| --- | --- | --- | --- |
| Non-interactive auth | **No** — app-only unsupported | Yes, service account | Yes, no third party at all |
| New approval surface | M365 tenant + admin consent | Google Cloud project | **None** |
| Fails mid-event if… | token expires, CA policy changes | quota/429 | nothing external |
| Gives a genuine `.xlsx` | Yes | Export step needed | **Yes** |
| Build time | Highest | Medium | **Lowest** |

**Append vs full rewrite:** full rewrite, decisively. It is the safer pattern for every candidate, and for the recommended one it is the only pattern — which removes a whole class of failure.

**If a live browsable spreadsheet is genuinely wanted** — someone wanting to open a URL and filter without downloading — the fallback is Google Sheets with a service account, full-rewrite on the same schedule, plus Sheets' native "download as .xlsx". That is a real option, just a heavier one, and it is *not* Excel.

### Open point for the user

This resolves the research question but leaves one small choice: **server-generated `.xlsx` in Supabase Storage (recommended) versus a live Google Sheet.** Everything else about the Export is unaffected either way. The Export's columns are owned by [Data model and the contact record](06-data-model-and-the-contact-record.md).

### Consequences elsewhere

- [Data model and the contact record](06-data-model-and-the-contact-record.md) — the Export is a full-rewrite projection of Postgres, so its columns can be shaped purely for readability with no append-compatibility constraint.
- [Event-day operations and deploy freeze](15-event-day-operations-and-deploy-freeze.md) — one fewer third-party dependency that can fail mid-event; the Export can also be regenerated after the fact from Postgres, so a failed sync during the event loses nothing.
- The original brief's "store contacts in an Excel file in the cloud" is honoured: there is a real `.xlsx` at a stable cloud URL. It is derived rather than authoritative, which is what makes the realtime Staff View and the concurrency story work.

## Sources

- [Working with Excel in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/excel?view=graph-rest-1.0)
- [Graph API - required permissions for createSession (Microsoft Q&A)](https://learn.microsoft.com/en-us/answers/questions/5790771/graph-api-required-permissions-for-createsession)
- [MS Graph WorkbookApplication/Calculate API with application permissions (Microsoft Q&A)](https://learn.microsoft.com/en-us/answers/questions/2143028/ms-graph-workbookapplication-calculate-api-with-ap)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Google Sheets API usage limits](https://developers.google.com/workspace/sheets/api/limits)
