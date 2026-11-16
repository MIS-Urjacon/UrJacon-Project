# Urjacon Process System: Project Guide

The rules, design standards and conventions for this project. Read this before
changing anything. Keep it updated whenever a rule changes.

## 1. What this project is

A dummy of the Urjacon PM Surya Ghar process system. A customer starts as a
**lead**. Only a confirmed lead with the core document packet becomes a
rooftop-solar **case**, which then moves through a fixed pipeline of **steps**.
Each case step has its own page, popup form, and Pending / History tabs. The full business flow is in
`Urjacon_Process_System_Design_Reference_5.html` (31 steps, 7 stages). We build
it one step at a time, in the order the owner provides.

The signed-in home page is `/dashboard`, an operational command center built
from the same lead and case records. It is read-only and does not duplicate data.

Decisions already made by the owner:
- **Bitrix stage is removed.** It does not exist in this system.
- Replies to the owner are in Hinglish (Hindi in English letters).
- **Do not change existing output when adding something new.** Only touch what
  the request is about.

## 2. Tech stack

- Next.js 16 (App Router), React 19, **JavaScript** (no TypeScript)
- Tailwind CSS 4, `lucide-react` icons
- Storage: Supabase when configured, otherwise a local JSON file + upload folder
  (dev). See section 8.

Next.js 16 differences that already caused errors here:
- Do **not** `export const dynamic = ...` in route files (`cacheComponents` is on).
- Route `params` is a Promise: `const { id } = await params`.
- Do not call `new Date()` during render in a prerendered component. Set it in
  `useEffect`.
- Read `node_modules/next/dist/docs/` before using an API you are unsure about.

## 3. The pipeline

### Lead management (before the case process)

The `/leads` page is Stage A and the application home page. Leads are stored
separately from cases in `data/leads.json` because they may be open or lost
without ever receiving a BP / SC Number or entering operations.

- **New lead:** Customer Name, Mobile Number and Lead Source are required.
  The form also captures village/address, agent or field staff, monthly bill,
  required kW, product, expected Cash/Loan mode, quotation reference, deal
  amount, commission, temperature and the next follow-up.
- **Follow-up:** Each update can append a Call / Visit / WhatsApp entry with
  outcome, remark, user and next follow-up. Lead stage is New, Contacted,
  Quotation Sent or Documents Ready. Temperature is Hot / Warm / Cold.
- **Lost:** A reason is compulsory. Lost leads stay in history and can be
  reopened.
- **Confirmed:** BP / SC Number, Cash/Loan mode and Aadhaar, PAN, Passbook and
  Electricity Bill checkboxes are compulsory. Confirmation links a
  new case through `leadId`; the case starts at Name Check. The expected
  payment mode is carried as a preference and pre-selected at Payment Work
  Start, where it can still be corrected.
- The Leads page has Open / Converted / Lost tabs, search and pagination.
- Direct case creation is disabled. The Name Check page no longer has an
  **Add case** button; every new operational case must come from a confirmed lead.

Defined in `lib/workflow.js` (`FLOW`). A case is in exactly one **stage**.

| # | Step key | Page (route) | Popup fields | Moves on when | Next |
|---|----------|--------------|--------------|---------------|------|
| 1 | `nameCheck` | `/name-check` | Name on Aadhaar, PAN, Passbook, Bijli Bill (+ optional file each) | All 4 names match the customer name | Login PMSG |
| 2 | `login` | `/login-pmsg` | Login Check in PMSG (Login Done / Login Hold), images (up to 5), remark | Login Done | Site Survey |
| 3 | `siteSurvey` | `/site-survey` | Customer Name, Contact Number, Village (address), Survey Date, Surveyor Name | Valid submit | Payment Work Start |
| 4 | `paymentWorkStart` | `/payment-work-start` | Cash or Loan, Status (Done / Not Done), Corridor (Regular / Special) | Status = Done | **Loan** goes to Bank File Ready. **Cash** goes to Ask 90% Payment for Dispatch |

### Loan process (after Payment Work Start = Loan)

Defined in `LOAN_FLOW` in `lib/workflow.js`. Sidebar group "LOAN PROCESS".
The step names come from the owner's Google Sheet. That sheet was private, so
the popup fields below are **placeholders** until the owner gives the real
columns.

| # | Step key | Page (route) | Popup fields (placeholder) |
|---|----------|--------------|----------------------------|
| 1 | `bankFileReady` | `/bank-file-ready` | Status, Remark |
| 2 | `loanIssue` (Loan Issue Cases Resolution) | `/loan-issue-resolution` | Status, Remark |
| 3 | `fileSubmission` (File Submission in Bank) | `/file-submission` | Status, Bank (text), Branch (text), Bank Quotation (amount), Responsible Person (dropdown: Alok, Kishan, Pankaj, Mahesh, Akash), Remark |
| 4 | `firstInstallment` (Receive First Installment) | `/first-installment` | Status, Amount Received, Remark |
| 5 | `receiveDp` (Receive DP) | `/receive-dp` | Status, Amount Received, Remark |
| 6 | `dispatch` | `/dispatch` | Status, Remark |

- Status is Done / Not Done. **Not Done** needs a Remark and keeps the case in
  Pending (hold). **Done** moves it to the next loan step; after Dispatch the
  case goes to Assign Installer (Installation process). Amount Received is required when Status is Done.
- Extra fields per loan step live in `lib/loanFields.js` (`EXTRA_FIELDS`), used by
  both the form and the validator. They are required when Status is Done.
  File Submission in Bank is the only step with extras so far. The Responsible
  Person list is the banking team from the design reference; confirm it with the
  owner.
- All six use one shared form (`components/steps/SimpleStepForm.js`,
  `makeSimpleForm`), one shared page (`components/LoanStepPage.js`) and one
  shared validator (`simpleStep` in `lib/validate.js`). To give a step its own
  fields, write a dedicated form and validator for that step only.
- Routing is in `nextStage(step, row)` and `stepPath(row)` in `lib/workflow.js`.
  Never hard-code "next step" anywhere else.

### Installation process (after Loan Dispatch or Cash Dispatch)

Defined in `INSTALL_FLOW` in `lib/workflow.js`. Sidebar group "INSTALLATION".
From the owner's Installation Google Sheet (tab "FMS"; its Config tab says
working hours 10:00-18:00, Sunday off). Both Loan and Cash cases enter here after
their Dispatch; the last step ends the case (`done`).

| # | Step key | Page (route) | Who | How | When (sheet) | Popup fields |
|---|----------|--------------|-----|-----|--------------|--------------|
| 1 | `assignInstaller` | `/assign-installer` | Manoj | WhatsApp in Daily Group | 24 | Installer Name, Status, Working Remarks |
| 2 | `inspectionFile` (Submit Inspection File) | `/submit-inspection-file` | Soniya | Geotag, DCR, Work Completion, Inspection Report | 14 | Status, Remark |
| 3 | `meterInspection` (Meter Install & Inspection) | `/meter-install-inspection` | Satyakumar | Follow open sites & JEs daily | 96 | Status, Working Remarks |
| 4 | `generationWifi` (Generation & Wifi) | `/generation-wifi` | Arun | Site visit & configuration | 24 | Status, Working Remarks |
| 5 | `tariffCheck` (Tariff Code Check, CG Only) | `/tariff-code-check` | Soniya | CSPDCL portal | 32 | Status, Remark |

- Status Done / Not Done like the loan steps (Not Done needs a Remark and keeps
  the case in Pending). Shared form `makeSimpleForm`, page `components/InstallStepPage.js`.
- "(CG Only)": the sheet shows this step Done for Odisha cases as well (12-digit
  consumer numbers, branches PDM/BGH), so it runs for **all** cases. Ask the
  owner if Odisha cases should skip it; the place to change is `stepPath` /
  `nextStage` in `lib/workflow.js`.
- The sheet's "Responsible Bitrix" and "Stage Bitrix" columns are not built.
  The "Form responses 1" tab (BP SC Number + Product Code) and "Sheet3" were
  not used.
- The "When" numbers are **working hours** (confirmed by the Config tab). TAT
  is still not applied (`TAT_DAYS` all 0).

### Cash process (after Payment Work Start = Cash)

Defined in `CASH_FLOW` in `lib/workflow.js`. Sidebar group "CASH PROCESS". Taken
from the owner's Cash Google Sheet (tab "FMS", readable once shared as "anyone
with the link"). The sheet has Who / How / When per step:

| # | Step key | Page (route) | Who | How | When (sheet) | Popup fields |
|---|----------|--------------|-----|-----|--------------|--------------|
| 1 | `cashAskPayment` (Ask 90% Payment for Dispatch) | `/cash-ask-payment` | Ankita Ahuja | Call | Whenever needed | Status, Remark (placeholder) |
| 2 | `cashPaymentReceived` (90% Payment Received?) | `/cash-payment-received` | Ankita | Message in Finance Group | 40 | 90% Payment Received? (Yes / No), Remark |
| 3 | `cashApproval` (Check for Approval) | `/cash-approval` | Chaitan | Get Director approval, register signed, for dispatch without payment | 16 | SN - Approver (text), Status, Remark |
| 4 | `cashDispatch` (Dispatch) | `/cash-dispatch` | Manoj | Dispatch Form | 24 | Status, Remark (placeholder) |

- **Branching**: step 2 answer **Yes** goes straight to step 4. **No** goes to
  step 3 first, then step 4. Yes/No is an answer, never a hold. Steps 1, 3, 4
  use Status Done / Not Done like the loan steps (Not Done needs a Remark and
  keeps the case in Pending).
- Routing is in `nextStage` / `stepPath` (`lib/workflow.js`). For a "Yes" case
  `cashApproval` is not on its path and is never shown for it.
- The sheet's "Responsible Bitrix" column is **not built** (Bitrix is removed
  from this system). Ask the owner if a responsible-person field is wanted.
- The sheet's "When" numbers (40, 16, 24) look like **working hours**
  (8 hours = 1 working day, Sunday off: sample rows match 40h = 5 working days,
  24h = 3). They are not applied: `TAT_DAYS` is still 0 for every step. Confirm
  the unit with the owner before turning TAT on.
- Cash step 3/4 use the same shared form as the loan steps
  (`makeSimpleForm`); `cashApproval` extra field is in `lib/loanFields.js`.
  Cash step 2 has its own form (`components/steps/PaymentReceivedForm.js`).
  Cash pages use `components/CashStepPage.js`.

- Order follows the design reference (verify documents, then portal login). The
  flowchart also runs Site Survey in parallel with login (BR-06); that is **not
  built**, the survey still waits for login. `nextStage` skips main steps already
  done, and `lib/store.js` moves older cases that were in Login/Name Check to
  the first of the two they have not finished.
- New cases are created only by confirming a lead and start at `nameCheck`.
- **Hold**: a submit can be saved without moving on (Login Hold, name mismatch,
  Status Not Done). The case stays in that step's Pending tab with an "On hold"
  pill.
- Final stage name is `done` (label "Completed"): after Tariff Code Check.
- If a step is added after cases already reached `done`, `lib/store.js`
  moves those cases to the first step they have not finished.

BP SC Number remains unique across all converted cases.

## 4. Dates: Timestamp, Planned Date, Actual Date

Every step page shows these three, per case, for **that step**:

| Field | Meaning |
|-------|---------|
| Timestamp | When the case arrived at this step (the previous step's submit time; for Name Check, when the case was added) |
| Planned Date | Timestamp + that step's TAT in days |
| Actual Date | When this step was submitted as done. Empty while pending or on hold |

- TAT lives in `TAT_DAYS` in `lib/workflow.js`. All are `0` for now, so Planned
  Date equals Timestamp. When a TAT is decided, change the number there. It only
  affects cases that arrive at the step afterwards.
- Stored per case in `schedule[stepKey] = { timestamp, plannedDate, actualDate }`.
- Planned vs Actual difference (delay) is computed from these two fields.
- **Actual Date column is shown in the History tab only**, never in Pending.

## 5. Table rules (every step page)

Built by the shared `components/StepPage.js`. Do not hand-roll a step table.

- **Pending tab** columns: **Action**, **Timestamp**, the page's columns,
  **Planned Date**, **Status**.
- **History tab** columns: **Timestamp**, the page's columns, **this step's own
  submitted data**, **Planned Date**, **Actual Date**, **Status**. History has
  **no Action column** and no popup.
- Action (the **Update** button) exists only in Pending. It is the first column
  and sticky on the left.
- **Data shown in the tables** is defined in `components/stepColumns.js`:
  - `OUT[stepKey]`: what this step submitted. Shown in its own History tab.
  - `CARRY[stepKey]`: important data from earlier steps. Shown on this step's
    page in **both** tabs, so the person doing the step sees what they need
    (e.g. Receive DP shows Bank, Quotation and First Installment).
  - Whatever a step submits should be visible in its History and, if the next
    steps need it, listed in `CARRY` for those steps.
  - `StepPage` takes `columns` (base + `CARRY`) and `historyColumns` (`OUT`).
- Tabs are always **Pending** and **History** with counts.
- Table has search, pagination (10 per page), loading skeleton and an empty
  state.
- Each page passes only its own `columns` (label + `cell(row)`); optional
  `mono: true` for IDs.
- No stat cards: the page is the title, the subtitle and the Pending / History table only.
- Dates use `DateCell` (date on top, time below).
- Keep the table fitting a 1440px screen: use two-line cells for related values
  (e.g. Village / Branch) instead of adding wide columns.

## 6. Design rules

Light theme only (`color-scheme: light`). Clean, professional dashboard look.

- **Brand teal**: `bg-brand` `#2fa89a`, `brand-dark` `#1f8579`, `brand-50`,
  `brand-100`. Defined in `app/globals.css`. Page background `#f5f7f9`.
- Cards: `rounded-2xl border border-slate-200/80 bg-white` with a very light
  shadow. Popups: `rounded-2xl`, backdrop blur, pop-in animation.
- Inputs use the shared `.field` class (40px high, rounded, teal focus ring).
  Do not invent new input styles. (The Google-Forms look for Site Survey was
  rejected: all popups use the same system style.)
- Popup layout: title + `Customer name · BP SC` subtitle, a `CaseSummary`
  strip (BP SC Number, Customer, Village, Product Code), fields in a 2-column
  grid (3 for short forms), grouped sections with small uppercase legends,
  actions at the bottom: Cancel (ghost) + primary button.
- Required fields have a red `*`. Errors show in red next to the buttons.
- Status pills: green = completed, amber = pending, red = on hold, blue = info.
  Always use `Pill`.
- After a save show a `Toast` (bottom right).
- Reusable pieces, use them instead of rewriting:
  `components/ui.js` (StatCard, HighlightCard, Pill, Avatar, Button, Toast,
  DateCell, CustomerCell, RoutePill, CaseSummary),
  `components/Modal.js`, `components/FileUpload.js`,
  `components/steps/shared.js` (FormActions, Label), `components/StepPage.js`.
- Sidebar order = pipeline order, numbered, in groups (LEAD MANAGEMENT, PROCESS
  STEPS, LOAN PROCESS, CASH PROCESS, INSTALLATION). **Settings** is at the bottom of the sidebar
  (admin only). The top bar has **no breadcrumb/path**: only the date, bell, the
  signed-in user and a log out button.
- Dropdowns are used only where the owner asked for fixed choices
  (Login Check, Cash or Loan, Status, Corridor). Route is free text on purpose.

## 6b. Dashboard

- `/dashboard` is the default route after sign-in and appears above the numbered
  workflow in the sidebar. Leads remain workflow item 01.
- KPI cards show Open Leads, Active Cases, Needs Attention and Completed Cases.
- Operational pipeline groups live work into Lead Qualification, Core Process,
  Loan, Cash and Installation using each record's current stage.
- Priority Queue combines due lead follow-ups, cases saved on hold and cases
  past their planned date. A case is considered overdue only when that step has
  a non-zero configured TAT; the current placeholder `TAT_DAYS = 0` does not
  create false overdue alerts.
- Lead Health shows Hot / Warm / Cold open leads. Payment Mode shows cases whose
  Cash/Loan decision is known. Delivery Health shows conversion, completion,
  installation workload, holds and overdue work.
- Recent Activity is derived from lead `updatedAt` and case step `submittedAt`;
  links open the relevant operational page.
- Refresh reloads `/api/leads` and `/api/cases`. No separate dashboard storage
  or manually maintained numbers exist.

## 6c. Login, users and Settings

- **Sign in** is `/login` (no sidebar). Dummy account: username `admin`, password
  `admin123` (seeded into `data/users.json` on first run, stored as a salted
  scrypt hash). Change it for anything real.
- Session = signed HttpOnly cookie `urjacon_session` (7 days), `lib/auth.js`. Set
  `AUTH_SECRET` in the environment; the built-in default is for dummy use only.
- **`proxy.js`** (Next 16 name for middleware) sends every page to `/login` and
  returns 401 for every API call without a valid cookie. Only `/login` and
  `/api/auth/login` are public. `/settings` is admin-only. Route handlers
  re-check the user from the file (`lib/session.js`: `getSession`,
  `requireAdmin`), so a deactivated or deleted user loses access immediately.
- **Roles**: `admin` (steps + Settings) and `user` (steps only). Guards: you cannot
  delete, deactivate or demote yourself, and at least one active admin must
  remain.
- **Settings** (`/settings`, admin only):
  - *User Management*: add, edit (name, role, password, active) and delete users.
  - *System Masters*: lists of values: Branch, Dealer, Liaisoning, Product Code,
    Bank, Responsible Person, Installer (`lib/masterTypes.js`, stored in
    `data/masters.json`). Branch, Dealer, Liaisoning and Product Code feed the
    **Lead** form suggestions.
    **Not wired yet**: the Responsible Person dropdown on File Submission
    (still the fixed list in `lib/loanFields.js`) and other dropdowns.
- Step submits record the signed-in user's name in `submittedBy`.
- The app frame (sidebar + top bar) is `components/Shell.js`; the login page is
  shown without it.

## 7. How to add a new step (checklist)

1. `lib/workflow.js`: add the key to `FLOW` (main) or `LOAN_FLOW` (loan), and
   to `STAGE_LABEL`, `STAGE_COLOR`, `TAT_DAYS`. Branching rules go in
   `nextStage` / `stepPath`.
2. `lib/validate.js`: add a validator under the same key. Return
   `{ error }` or `{ data, hold }`. Never trust the client.
3. `lib/steps.js`: add the sidebar entry (group, slug, label, title, icon).
   The group heading shows above the first step of each group.
4. `components/steps/<Name>Form.js`: the popup form. Props:
   `{ row, readOnly, onSubmit, onCancel }`. `onSubmit(data)` returns an error
   string or `null`. Pre-fill from `row.steps[stepKey]`. Disable inputs when
   `readOnly`. Use `CaseSummary`, `Label`, `FormActions`.
5. `components/stepColumns.js`: add the step's `OUT` (submitted data columns)
   and its `CARRY` (earlier data it needs), and any new column in `C`.
6. `app/<slug>/page.js`: a `"use client"` page rendering `StepPage` with
   `stepKey`, `title`, `subtitle` ("Step N · ..."), `columns` (base + `CARRY`),
   `historyColumns` (`OUT`), `Form`, `modalTitle`. (Loan steps use
   `LoanStepPage`, which reads `OUT` / `CARRY` itself.)
7. Update the pipeline table in this guide and the subtitle step numbers.
8. Run `npm run build`, then test the flow end to end (section 10).

No other file should need to change. If it does, the structure is wrong.

## 8. Data and storage (dummy)

- `data/cases.json`: all cases (array). Read/write only through `lib/store.js`.
- `data/leads.json`: all leads (array). Read/write only through `lib/leads.js`.
- `data/uploads/`: uploaded files (random names). Served by
  `GET /api/files/[name]`. Git-ignored.
- A case looks like:

```json
{
  "id": "C-0001",
  "timestamp": "ISO date (when added)",
  "bpScNumber": "", "customerName": "", "village": "", "productCode": "",
  "branch": "", "dealer": "", "liaisoning": "", "route": "", "dealAmount": 0,
  "stage": "login | nameCheck | siteSurvey | paymentWorkStart | bankFileReady | loanIssue | fileSubmission | firstInstallment | receiveDp | dispatch | cashAskPayment | cashPaymentReceived | cashApproval | cashDispatch | assignInstaller | inspectionFile | meterInspection | generationWifi | tariffCheck | done",
  "steps": { "<stepKey>": { "...step fields": "", "status": "done | hold",
                            "submittedAt": "ISO", "submittedBy": "" } },
  "schedule": { "<stepKey>": { "timestamp": "", "plannedDate": "", "actualDate": null } }
}
```

- In `steps[key]` the field `status` is the pipeline result (`done`/`hold`).
  Do not name a form field `status` (Payment Work Start uses `workStatus`).
- **Storage** has two modes, chosen by env vars (`.env.example`):
  - **Supabase** (`SUPABASE_URL` + a key): real SQL tables with proper columns,
    created by `supabase/schema.sql`. `lib/sql.js` maps rows <-> the same objects the
    app always used, so API output is unchanged. Tables: `urjacon_cases` (case
    columns), `urjacon_case_steps` (one row per submitted step; each step's form
    answers are columns, unused ones NULL; file lists are jsonb), `urjacon_case_schedule`
    (Timestamp / Planned / Actual per step), `urjacon_leads`, `urjacon_lead_followups`,
    `urjacon_users`, `urjacon_masters` (one row per value). Private bucket
    `urjacon-uploads` holds uploads. Each save writes only that case / lead / user.
  - **Local JSON files** in `/data` (no env vars): dev only. On Vercel the disk is
    read-only, so the Supabase vars are **required** there.
- Code entry points: `lib/db.js` (connection, JSON fallback, uploads), `lib/store.js`
  (`readCases/getCase/saveCase/removeCase`), `lib/leads.js`, `lib/users.js`,
  `lib/masters.js`. Routes call `saveCase(row)` etc., never "write the whole list".
  A new step field needs a column in `urjacon_case_steps` + an entry in `STEP_COLS`
  (`lib/sql.js`); an unknown field is still kept in the row's `extra` jsonb.
- Key: `SUPABASE_SERVICE_ROLE_KEY` is preferred (server-only, never `NEXT_PUBLIC_`).
  The client demo runs with `SUPABASE_ANON_KEY`; `schema.sql` therefore opens the
  tables and bucket to the anon role. **Demo only**: anyone with the URL + anon key
  could read the tables, password hashes included. Before real use switch to the
  service role key and run `supabase/revoke_anon_access.sql`.
- Re-running `schema.sql` is safe. If old json-style tables exist they are renamed
  `urjacon_*_json_old` and their data is copied into the new tables; drop the
  `*_json_old` tables once you have checked the data.
- Still no concurrency safety for two people editing the same record at once.

## 9. API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/leads` | All leads |
| POST | `/api/leads` | Add an open lead |
| PUT / DELETE | `/api/leads/[id]` | Update/reopen/lose a lead; admin-only cleanup delete |
| POST | `/api/leads/[id]/convert` | Confirm a qualified lead and create its linked case |
| GET | `/api/cases` | All cases |
| POST | `/api/cases` | Disabled: returns an error directing the user to confirm a lead |
| PUT / DELETE | `/api/cases/[id]` | Edit / delete a case (no UI uses these right now) |
| POST | `/api/cases/[id]/submit` | Submit a step: `{ step, data }`. 409 if the case is not at that step |
| POST | `/api/auth/login`, `/api/auth/logout` | Sign in / out (login is public) |
| GET | `/api/auth/me` | Signed-in user (401 if the session ended) |
| GET / POST / PUT / DELETE | `/api/users`, `/api/users/[id]` | User management (admin only) |
| GET | `/api/masters` | All masters (any signed-in user) |
| POST / DELETE | `/api/masters` | Add / remove a master value (admin only) |
| POST | `/api/upload` | Upload a file (JPG/PNG/WEBP/GIF/PDF, max 5 MB) |
| GET | `/api/files/[name]` | Serve an uploaded file |

Validation always happens on the server (`lib/validate.js`), even if the form
also checks.

## 10. Working rules and testing

- Make the smallest change that does the request. Do not restyle or move other
  things.
- After a change: `npm run build`. For UI work, look at it in a browser
  (screenshot at 1440x900) before saying it is done.
- Test the API flow with a temporary case: create, submit each step, check
  `stage` and `schedule`, then **delete the temporary case** and any uploads.
  Never leave test data in `data/cases.json`. Real test cases the owner added
  (e.g. C-0001 to C-0004) must not be deleted.
- Do not kill the owner's running dev server. If the UI looks broken (dark
  background, missing buttons), the dev server has stale CSS: stop it, delete
  `.next`, run `npm run dev` again.
- The "server caches disabled" warning in dev is harmless (browser DevTools
  "Disable cache" is on).
- Shell scripts on Windows: Python prints `\r\n`, so IDs read in a `while read`
  loop carry a hidden `\r` and DELETE silently does nothing. Strip it, then
  check the data file after cleaning up.
- Google Sheets/Drive links the owner shares may be private and unreadable. If
  so, say it plainly and ask for the column names instead of guessing silently.
- Open items: Edit/Delete of a case from the UI was removed along with the old
  Document Collection page; a "Delay" column (Planned vs Actual) is not built yet.
