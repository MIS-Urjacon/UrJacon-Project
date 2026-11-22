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

### Current reference-aligned flow (authoritative)

The live workflow is defined only in `lib/workflow.js`; route components must
not hard-code the next step. The current sequence is:

1. **Intake:** Lead -> Call Tracker -> Quotation & Documents.
2. **Verification:** Document Verification & Name Check -> Login PMSG -> Site
   Survey -> Payment Work Start. A correction keeps the case and its data on
   Document Verification; Login is opened only after every required document
   is marked Proper.
3. **Payment branch:**
   - **Loan:** Agreement -> JanSamarth -> Bank File Ready -> Bank Submission ->
     Loan Issue Resolution -> First Installment -> DP -> Accounts Cash Receipt
     -> Dispatch.
   - **Cash:** Ask 90% -> Payment Received check -> conditional Director
     Approval -> Accounts Cash Receipt -> Cash Dispatch.
   - **Subsidy Cheque (Odisha only):** Subsidy Cheque Documents -> Accounts
     Cash Receipt -> Cash Dispatch.
4. **Installation and inspection:** Assign Installer -> Installation Pending
   -> Bill & DCR -> Portal Installation Submission -> Inspection File -> Meter
   Installation -> JE Inspection -> Generation & Wi-Fi -> Portal Inspection
   Approval -> Tariff Check.
5. **Closure:** Loan cases first complete Final Bank File and Final Bank
   Payment. All modes then complete Subsidy Redeem -> Subsidy Disbursal ->
   (Subsidy Cheque Deposit for that mode) -> Balance Clearance -> Warranty &
   Handover -> Completed.

Site Survey is deliberately before Payment Work Start, and its material/report
data is carried forward to Dispatch. The payment, dispatch, installation,
inspection and closure gates follow the design reference business rules. The
complete rule/hold/role/document glossary is visible in the app at
`/process-reference`; live operational summaries are at `/reports`.

### Latest flow decisions (override older text below where they differ)

- **Call Tracker is not linked to Quotation.** Responses: Call back later, Visit required, **Document given**
  (the lead goes straight to Document Receive; no quotation, product code or kW needed), Not interested. No
  quotation pill / button there.
- **Quotation is standalone** (`/quotation`): choose a BP SC Number, fill the 11-page proposal (UrjaCon Proposal
  Studio format: `components/leads/ProposalBuilder.js` + `ProposalFrame.js`, engine in `lib/proposal/engine.js`),
  Submit sends it. It never changes the lead's stage, outcome or follow-ups. BP SC Number is mandatory for a new lead
  (first field of Add Lead, checked in `POST /api/leads`).
- **The case price is set at Document Receive** with plain inputs (`components/steps/DocumentPricing.js`): System
  Size (kW), System Price incl. GST, Central / State subsidy, Product Code, System Type, Panel, Brand. The server
  cleans them (`pricingFromInput` in `lib/proposal/lead.js`, called by the `documentReceive` validator) and writes
  `dealAmount`, subsidy, `kwWanted`, `productCode` on the case in `/api/cases/[id]/submit`. Later steps keep reading
  those case fields. Quotation prices are not used for cases.

- **Login -> corrections -> Agreement -> Survey / Payment (workflow version 3, all new cases).** The Login PMSG
  popup has Submit, Name Correction, Owner Change and Cancel. Submit sends the case to the **Agreement** page
  (`agreementUpload`, now in the main flow for every payment mode). Name Correction / Owner Change (`/name-correction`,
  `/owner-change`, `nameCorrection` / `ownerChange` in `PROCESS_CONFIG`) need a remark on Login, and after them the case
  goes to the Agreement. Only after the Agreement is the case on Site Survey and Payment Work Start (`surveyOpen`).
  Loan cases then start at JanSamarth (no second agreement). Cases made before this keep the old order
  (`agreementFirst(row)` in `lib/workflow.js`); a case that has not logged in yet is upgraded when Login is submitted.

- **Survey List popup** also asks the owner's survey Google Form questions (`lib/surveyFields.js`, used by
  `components/steps/SiteSurveyForm.js` and the `siteSurvey` validator): Electrical system (Phase Type, Connection
  Category, Meter Type), Roof evaluation (type, mounting, structure size, orientation, Cement/Gitti/Balu, condition,
  age, usable area, shading, access), Cable distances (panel-inverter, inverter-DB, ventilation, earthing, Wi-Fi/LAN),
  Site logistics (vehicle access, ladder, storage, obstacles, tentative install date) and the Photo checklist with a
  required survey photo PDF (max 5 MB, the upload limit) and Surveyor Remarks. BP SC number, address, system, panels etc.
  are not asked again: they are in the "Important details" block.

- **No Status dropdown in Loan, Cash, Installation and Closure popups.** Submitting the popup completes the step
  (`simpleStep` in `lib/validate.js` always saves `workStatus: Done`; configured steps get `noStatus` in `lib/processConfig.js`).
  Still there on purpose: Accounts Cash Receipt's **Receipt Status**, the Yes / No answer of 90% Payment Received, the
  **Balance Status** in Warranty, and the Name Correction / Owner Change pages. **Bank File Ready** now holds Bank, Branch,
  Bank Quotation and Responsible Person (`EXTRA_FIELDS.bankFileReady`); **File Submission in Bank** only asks for the
  submitted file (`submissionFiles`). Bank columns read Bank File Ready first, then File Submission for older cases.

- **Loan money and dispatch.** PHS & Loan Decision has only Loan Decision (no home visit date). Bank 70% asks
  "Bank 70% Amount Received" and Down Payment asks "Down Payment Received"; the Down Payment popup shows the bank 70%
  already collected and the balance after it. Dispatch (Loan) has no TPWODL / meter-charge fields; Dispatch (Cash / Subsidy
  Cheque) keeps only the TPWODL Reference for Odisha. The **Material List** with quantities is built by `lib/materials.js`
  from the system (panels, inverter) and the Survey List answers (structure, DC / AC / earthing cable metres), shown as a
  table in the Dispatch popups and used as the editable Material List text.

- **Login PMSG > Upload MIS tab** (`components/steps/LoginMisTab.js`, file reading in `lib/misFile.js`, tab hook `extraTab`
  in `StepPage`): **Export Template** downloads `login-mis-template.csv` (BP SC Number, Login Status, Application No., Login Date,
  Remark); the user uploads that file as .csv or .xlsx (no library: CSV is parsed in the page, .xlsx with the browser's
  DecompressionStream; old .xls is not supported). Each BP SC number is matched with the cases and shown as Logged in /
  Not logged in / Not in the system, with the system's own login status and a Check column, plus the cases pending at Login that
  the file does not mention. It only reads the file; no case is changed.

### Lead management (before the case process)

Stage A is split into three operational pages. Leads are stored separately from
cases in `data/leads.json` because they may be open or lost without ever
receiving a BP / SC Number or entering operations.

- **Lead (`/leads`, Step 1):** Customer Name, Mobile Number and Lead Source are
  required. It captures the source/customer details, browser live location
  (latitude, longitude, accuracy and capture time) and initial requirement.
  Agent / Field Staff is not typed by the user; the API stores the signed-in
  user's name from the authenticated session.
- **Call Tracker (`/call-tracker`, Step 2):** Each Call / Visit / WhatsApp entry
  records customer response, remark, user, temperature and next call time.
  Call-back stays here; an interested customer moves to Quotation. Document
  receipt is not decided here. **Visit required** needs the visit date and **Visit By** (an active
  employee, `GET /api/staff`); the lead stays in Call Tracker Pending and opens next time with
  Contact Type = Visit. Every interaction (call back, visit required with who went, visit
  result, quotation sent) is kept in the lead's interaction history, shown in full in the popup.
  In Supabase the per-interaction Visit By is kept in the lead `extra` (`followUpVisitBy`).
- **Quotation & Documents (`/quotation`, Step 3):** Captures quotation reference,
  entity, system type, DCR/NDCR, On-grid/Hybrid, kW, price and subsidy. The
  system generates a printable quotation preview from these fields; supporting
  images/PDFs are optional Storage attachments. The quotation is saved and sent in one step (Submit). The printed quotation follows the owner's
  format (sample URJ/Q/26-27/0107): `lib/quotationFormat.js` (fields, defaults, payment terms
  per mode, styles) and `components/leads/QuotationSummary.js` (the document). Header with
  Ref / Date / Valid till, Prepared for / by, System (capacity, panels, inverter, included,
  meter), Price (price incl. GST, central and state subsidy, cost after subsidy), payment terms
  and signatures. Empty inverter / meter / panel count / included / terms use the defaults. A sent quotation can be revised only after recording a
  reason; the original and every sent R1/R2 version remain in revision history.
  `POST
/api/leads/[id]/send-quotation` is the delivery integration point: it records
  manual delivery now and will send the WhatsApp message when that integration
  is connected. **The Quotation page is only for making quotations.** Call
  Tracker has no "Send quotation" response. Quotation > Pending has no table: the
  quotation format is always shown (greyed out until a lead is chosen). The user selects
  a **BP SC Number** and that lead's details (customer, contact, source, brand, system)
  fill the quotation (`components/leads/QuotationWorkspace.js`); leads that are open,
  have a BP SC Number and no sent quotation (or a draft / revision) can be chosen. There is
  no Save Draft: **Submit** saves and sends the quotation in one step; after Submit the lead
  returns to Call Tracker (stage `contacted`, quotation sent) and shows the latest
  quotation there. The customer response is taken only in Call Tracker: **Call back
  later**, **Document given** (handover packet, then the case starts at Document
  Verification & Name Check) or **Not interested**. To change a sent quotation, click **Revise** on its
  row in Quotation > History: the Pending tab opens with that lead's quotation filled
  in and a required Revision Reason. On Submit the sent version is archived (R1/R2),
  the corrected one is sent, and Call Tracker and every page show the latest version.
  Cancel leaves the sent quotation unchanged. Every sent version stays in revision history.
- **Lost:** A reason is compulsory. Lost leads stay in history and can be
  reopened.
- **Handover to Document Verification & Name Check:** Quotation reference, BP / SC Number, Cash/Loan mode
  are compulsory. The handover document checkboxes (Aadhaar, PAN, Passbook, Electricity Bill, Terrace Geotag) are optional; Document Receive collects them. Handover links
  a new case through `leadId`; the case starts at Name Check. The expected
  payment mode is carried as a preference and pre-selected at Payment Work
  Start, where it can still be corrected.
- The Leads page has Open / Converted / Lost tabs, search and pagination.
- Direct case creation is disabled. The Name Check page no longer has an
  **Add case** button; every new operational case must come from a confirmed lead.

Defined in `lib/workflow.js` (`FLOW`). A case is in exactly one **stage**.

| #       | Step key                                 | Page (route)          | Popup fields                                                                                                                                                                                                                                                                              | Moves on when                                                                                                                                                                                             | Next                                                                            |
| ------- | ---------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 4–6     | `nameCheck`                              | `/name-check`         | Received Aadhaar, PAN, Passbook and Bijli Bill files; name and Proper/Correction Required check on each; Tata/Non-Tata; correction type and reason                                                                                                                                        | All 4 documents are saved, names match and every document is marked Proper; otherwise correction hold                                                                                                     | Login PMSG                                                                      |
| 7       | `login`                                  | `/login-pmsg`         | Login Check in PMSG (Login Done / Login Hold), hold reason (H02 / H03, full text), retry date, remark (no image upload)                                                                                                                                                                   | Login Done. **Login Hold sends the case back to Document Receive** (an issue is opened with the hold reason; Document Receive's default assignee gets it) and, once re-verified, it returns to Login PMSG | Site Survey                                                                     |
| 8       | `siteSurvey` (page name **Survey List**) | `/site-survey`        | Customer Name, Contact Number, Village (address), Survey Date, Surveyor Name (dropdown of employees, `GET /api/staff`), Smart Meter, Material Needed; the popup also shows the important case details (address, route, system, panels, inverter, payment mode, application no., map link) | Valid submit                                                                                                                                                                                              | Payment Work Start                                                              |
| After 8 | `paymentWorkStart`                       | `/payment-work-start` | Cash or Loan, Status (Done / Not Done), Corridor (Regular / Special)                                                                                                                                                                                                                      | Status = Done                                                                                                                                                                                             | **Loan** goes to Bank File Ready. **Cash** goes to Ask 90% Payment for Dispatch |

The core handoff is **Document Verification → Login PMSG**; once Login is done the case is on
**both Site Survey and Payment Work Start** (parallel: the case stage moves to Payment Work Start and the
survey stays open on its own page, `surveyOpen(row)` in `lib/workflow.js`; the survey owner sees it through
`lib/assign.js`). The survey can be filled any time before Dispatch, but **Loan Dispatch and Cash Dispatch are
blocked until the Site Survey is done** (`lib/validate.js`; the dispatch popup shows a red notice). The Site Survey address, contact number,
surveyor and survey date remain attached to the case and are displayed on both
Loan Dispatch and Cash Dispatch pages.

### Loan process (after Payment Work Start = Loan)

Defined in `LOAN_FLOW` in `lib/workflow.js`. Sidebar group "LOAN PROCESS".
The step names come from the owner's Google Sheet. That sheet was private, so
the popup fields below are **placeholders** until the owner gives the real
columns.

| #   | Step key                                       | Page (route)             | Popup fields (placeholder)                                                                                                              |
| --- | ---------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bankFileReady`                                | `/bank-file-ready`       | Status, Remark                                                                                                                          |
| 2   | `loanIssue` (Loan Issue Cases Resolution)      | `/loan-issue-resolution` | Status, Remark                                                                                                                          |
| 3   | `fileSubmission` (File Submission in Bank)     | `/file-submission`       | Status, Bank (text), Branch (text), Bank Quotation (amount), Responsible Person (dropdown: Alok, Kishan, Pankaj, Mahesh, Akash), Remark |
| 4   | `firstInstallment` (Receive First Installment) | `/first-installment`     | Status, Amount Received, Remark                                                                                                         |
| 5   | `receiveDp` (Receive DP)                       | `/receive-dp`            | Status, Amount Received, Remark                                                                                                         |
| 6   | `dispatch`                                     | `/dispatch`              | Status, Remark                                                                                                                          |

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
their Dispatch; after Tariff Code Check they move to Closure.

| #   | Step key                                       | Page (route)                | Who        | How                                             | When (sheet) | Popup fields                            |
| --- | ---------------------------------------------- | --------------------------- | ---------- | ----------------------------------------------- | ------------ | --------------------------------------- |
| 1   | `assignInstaller`                              | `/assign-installer`         | Manoj      | WhatsApp in Daily Group                         | 24           | Installer Name, Status, Working Remarks |
| 2   | `inspectionFile` (Submit Inspection File)      | `/submit-inspection-file`   | Soniya     | Geotag, DCR, Work Completion, Inspection Report | 14           | Status, Remark                          |
| 3   | `meterInspection` (Meter Install & Inspection) | `/meter-install-inspection` | Satyakumar | Follow open sites & JEs daily                   | 96           | Status, Working Remarks                 |
| 4   | `generationWifi` (Generation & Wifi)           | `/generation-wifi`          | Arun       | Site visit & configuration                      | 24           | Status, Working Remarks                 |
| 5   | `tariffCheck` (Tariff Code Check, CG Only)     | `/tariff-code-check`        | Soniya     | CSPDCL portal                                   | 32           | Status, Remark                          |

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

### Closure (after Tariff Code Check)

Defined in `CLOSURE_FLOW` in `lib/workflow.js`. Sidebar group "CLOSURE".

| #   | Step key                         | Page (route) | Moves on when                                                      | Next      |
| --- | -------------------------------- | ------------ | ------------------------------------------------------------------ | --------- |
| 31  | `warranty` (Warranty & Handover) | `/warranty`  | Balance cleared, warranty complete and customer handover kit given | Completed |

- Balance Status is Cleared / Pending. Pending requires a remark, blocks
  warranty/document handover and keeps the case on hold.
- Balance Clearance shows the case Deal Amount as the total collectible amount.
  The user records the total received amount and the system calculates the
  remaining balance. Any remaining amount automatically saves H22 and keeps the
  case at Balance Clearance; only zero remaining balance opens Warranty.
- Warranty Type is Tata / Non-Tata. Tata requires a Tata Warranty Reference.
  Non-Tata requires Panel Warranty through DCR and Inverter Online Registration
  to both be Done.
- Warranty Date cannot be in the future. Customer Handover Kit Given must be
  Yes; the kit contains warranty documents, invoice and consumer-vendor agreement.
- Existing cases that reached Completed before this step was added move to
  Warranty Pending through the normal `lib/store.js` normalization rule.

### Cash process (after Payment Work Start = Cash)

Defined in `CASH_FLOW` in `lib/workflow.js`. Sidebar group "CASH PROCESS". Taken
from the owner's Cash Google Sheet (tab "FMS", readable once shared as "anyone
with the link"). The sheet has Who / How / When per step:

| #   | Step key                                        | Page (route)             | Who          | How                                                                  | When (sheet)    | Popup fields                             |
| --- | ----------------------------------------------- | ------------------------ | ------------ | -------------------------------------------------------------------- | --------------- | ---------------------------------------- |
| 1   | `cashAskPayment` (Ask 90% Payment for Dispatch) | `/cash-ask-payment`      | Ankita Ahuja | Call                                                                 | Whenever needed | Status, Remark (placeholder)             |
| 2   | `cashPaymentReceived` (90% Payment Received?)   | `/cash-payment-received` | Ankita       | Message in Finance Group                                             | 40              | 90% Payment Received? (Yes / No), Remark |
| 3   | `cashApproval` (Check for Approval)             | `/cash-approval`         | Chaitan      | Get Director approval, register signed, for dispatch without payment | 16              | SN - Approver (text), Status, Remark     |
| 4   | `cashDispatch` (Dispatch)                       | `/cash-dispatch`         | Manoj        | Dispatch Form                                                        | 24              | Status, Remark (placeholder)             |

- **Ask 90% Payment popup**: Status is only "Send For Approval" (no Done / Not Done) and there is a
  **Send payment details to customer** button (`POST /api/cases/[id]/send-payment-details`,
  `components/steps/SendPaymentDetails.js`, message text in `lib/caseDetails.js`). It records each send on the
  case (`paymentDetailsSent`, in `extra`) and opens WhatsApp with the message ready; it is the integration point
  for direct WhatsApp delivery later.
- **Important details** (`components/steps/CaseDetails.js`, content from `importantDetails(row, stepKey)` in
  `lib/caseDetails.js`) are shown at the top of the step popups (simple steps, configured steps, Login,
  90% Received, Balance Clearance, Warranty, plus the Document Receive / Survey List / Payment Work Start popups).
- **Accounts Cash Receipt** (`cashReceipt`) has no Status / Hold Reason Code. A **Receipt Status** dropdown
  (`RECEIPT_STATUS` in `lib/processConfig.js`) decides the result: **90% Cash Received** = proper, moves to
  Dispatch; **Cash Below 90%** = hold (H11), stays in Pending (remark required); **Dispatch Without Cash or
  Down Payment** = moves to Dispatch (H21), remark required (who approved, when the money is expected).
  Fields: receipt no., amount, date, signed by, signed receipt, optional invoice.
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

- Order follows the approved operating sequence: verify documents, complete
  portal login, perform Site Survey, and then select/start the payment process.
  `nextStage` skips main steps already done, and `lib/store.js` moves older
  cases that were in Login/Name Check to the first unfinished step.
- New cases are created only by confirming a lead and start at `nameCheck`.
- **Hold**: a submit can be saved without moving on (Login Hold, name mismatch,
  Status Not Done). The case stays in that step's Pending tab with an "On hold"
  pill.
- Final stage name is `done` (label "Completed"): after Warranty & Handover.
- Workflow version 2 cases follow all newly added steps. Historical completed
  cases remain completed so a deployment does not unexpectedly reopen them.

### Document Receive (before Document Verification)

- A confirmed lead (Call Tracker "Document given") creates a case at `documentReceive`
  (`/document-receive`, before Document Verification). It is not part of `FLOW`;
  `INTAKE_STEP` / `nextStage` in `lib/workflow.js` send it to Name Check.
- **Document Receive does the document work**: receive and upload Aadhaar, PAN, Passbook and
  Bijli Bill, name on each, Proper / Correction Required, Tata or Non-Tata, correction type,
  Received Through and Received Date. It also has **Payment Mode (Cash / Loan / Subsidy Cheque for
  Odisha)**, an optional **Terrace geotag photo** upload, and a read-only "Lead & quotation details"
  panel (pricing, subsidy, system, brand, dealer, route, contact; older cases read it from their lead).
  Payment Work Start keeps its own Payment Mode field and pre-fills it from Document Receive. A correction keeps the case here on hold; only all
  proper documents move on. The data is saved under `steps.documentReceive`; use
  `docData(row)` (older cases saved it under `nameCheck`) to read it.
- **Document Verification (`nameCheck`) only verifies**: the verifier sees the received
  documents (names, files, Proper tag) and ticks Verified on each. All verified = Login PMSG;
  otherwise hold with a remark. A Quote icon in both popups opens the quotation on demand
  (`components/steps/QuoteButton.js`).

### Issue Report (every step after Document Verification)

- Every step page after Document Verification (not Document Receive / Verification) has a
  checkbox in the Pending Action column; ticking rows shows **Report Issue (N)** in the
  table toolbar (next to Assign for admin / management), which opens
  `components/steps/IssueReportForm.js` for all ticked cases. Update stays its own button.
  Fields: Issue Type (`lib/issues.js`), Issue Details, optional files.
- `POST /api/cases/[id]/issue` stores `row.issue` (latest) and `row.issues` (history) in
  the case `extra` jsonb (no new column), moves the case to `documentReceive` and resets its
  schedule. The Document Receive page shows an **Issue Report** column and a banner in the
  popup. `lib/store.js` does not auto-advance a case that has an open issue.
- After the fix the case goes Document Receive -> Document Verification as usual;
  verifying it as Done resolves the issue and returns the case to the step it was
  reported from (`issue.fromStep`), not to Login.

### Assign work (every lead and case page)

- Admin and management see a **checkbox** in the Action column of every Pending table
  (Leads Open tab, Call Tracker, Quotation, every case step page) with a select-all
  checkbox in the header. Tick one or many rows and use **Assign (N)** in the toolbar
  (`components/BulkAssign.js`, `components/AssignDialog.js`) to pick an active employee, or
  "Unassigned". Other roles see no checkboxes. Every table has an **Assigned To** column.
- `POST /api/assign` stores `assignedTo` (user id), `assignedToName`, `assignedBy`,
  `assignedAt` on the lead / case (`extra` jsonb, no new column). `GET /api/assignees`
  lists employees (admin / management only).
- **Automatic assignment**: work with no explicit assignee belongs to every employee who has
  access to the page it is on (role pages / custom Page access), so all of them see it and the
  "Assigned To" column shows them as "Auto · page access".
- **Default assignees** (Settings > Assignees, admin only): each page can have default employees
  (`lib/defaultAssignees.js`, `/api/assignee-defaults`, stored in `urjacon_masters` as type
  `assignee:<page slug>`, no new table). Work with no explicit assignee that is on such a page belongs
  to them however it got there (new, next step, or back from an issue); only they, admin and management
  see it. No default = the automatic rule. Changing the tab applies at once. Inactive users are ignored.
- **Explicit assignment**: admin / management can tick **one or several** employees in the
  Assign dialog (`assignedToIds`). Only those employees, admin and management see the work.
  Ticking nobody returns to automatic. When the work moves to its next step (step submit,
  Report Issue, lead stage change, quotation send / revise) the explicit assignment is cleared
  and the automatic rule applies again. A converted lead's case starts automatic.
- **Visibility** (`lib/assign.js`: `canAssign`, `canSee`, `withAssignees`): admin and management
  see everything. Enforced in `GET /api/cases`, `GET /api/leads` (so Dashboard and Reports
  follow) and in the step submit, issue and lead write routes.

- **Assignment log + message.** Every assign (and every take-back) is logged in table `urjacon_assignments`
  (`supabase/add_assignments.sql`, also in `schema.sql`; dev without Supabase uses `data/assignments.json`): one row per
  assignee with the record, page, assigned by, **assign date** (the day it is assigned), `assigned_at` and `seen_at`. `lib/assignments.js` writes it from `POST /api/assign`; a failed log never blocks
  the assignment. The assignee gets the message in the **bell** (red count = unread; opening it marks read;
  `GET /api/assignments?mine=1`). `logAssignments` is where a WhatsApp / SMS message can be added later.
- **Temporary vs permanent assignment.** The **Assign button on any page** is **temporary** (`kind = temporary`): only
  the chosen people (plus admin / management) get that one piece of work, until it moves to its next step. **Settings >
  Assignees** is **permanent** (`kind = permanent`): those people get all work that arrives on that page, now and in
  future, until the admin changes it. Saving it logs who got the page (and who lost it) with the assign date and sends the
  bell message. The assign date is simply the day it is assigned (set by the server, no date input in the dialogs). The Assign Work page shows the Type of every row.

- **Assign Work page** (`/assign-work`, common page like Reports): Active / History tabs with Assign Date, Assigned At,
  customer, BP SC number, page, assigned to / by, Read status and Active / Closed / Removed. Admin and management see
  all; everyone else sees only the work assigned to them. Active = the record still carries that assignment.

BP SC Number remains unique across all converted cases.

## 4. Dates: Timestamp, Planned Date, Actual Date

Every step page shows these three, per case, for **that step**:

| Field        | Meaning                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Timestamp    | When the case arrived at this step (the previous step's submit time; for Name Check, when the case was added) |
| Planned Date | Timestamp + that step's TAT in days                                                                           |
| Actual Date  | When this step was submitted as done. Empty while pending or on hold                                          |

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
  shadow. Popups: `rounded-2xl`, solid dim backdrop (no blur, so it never lags while scrolling), pop-in animation; the page behind is locked and the popup body uses `overscroll-contain`.
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
  Loan, Cash, Installation and Closure using each record's current stage.
- Priority Queue combines due lead follow-ups, cases saved on hold and cases
  past their planned date. A case is considered overdue only when that step has
  a non-zero configured TAT; the current placeholder `TAT_DAYS = 0` does not
  create false overdue alerts.
- Lead Health shows Interested / Follow up Required / Not Interested open leads (the Lead Temperature dropdown values). Payment Mode shows cases whose
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
- **Roles and page access** (`lib/access.js`): `admin` (all pages + Settings), `user`
  (all process pages, no Settings: the old behaviour) and one role per team from the
  Process Reference "Who handles what" list: `management` (all pages), `marketing`, `crm`,
  `processing`, `login`, `documentation`, `banking`, `accounts`, `dispatch`, `service`,
  `discom` (own pages only; Dashboard, Reports and Process Reference are common).
  **Custom page access**: Settings > Users > Page access shows every page as a checkbox,
  pre-ticked from the role; the admin can tick/untick to give one user more or less than
  the role. Stored in `urjacon_users.pages` (jsonb, NULL = follow the role; run
  `supabase/add_user_pages.sql` once on an existing database). `canAccessPage(user, slug)`
  takes `{ role, pages }`. `/api/auth/me` re-issues the cookie so changes reach `proxy.js`.
  Enforced in `proxy.js` (pages), the Sidebar (menu), `/api/cases/[id]/submit` (step) and
  the lead write APIs (`requireLeadWriter`). To change who sees what, edit `TEAMS` there.
  Team logins are created by `node --env-file=.env scripts/seed-team-users.mjs`
  (re-runnable; username = first name, password = `Name@2026`; change them for real use).
- **Roles (older note)**: `admin` (steps + Settings) and `user` (steps only). Guards: you cannot
  delete, deactivate or demote yourself, and at least one active admin must
  remain.
- **Settings** (`/settings`, admin only):
  - _User Management_: add, edit (name, role, password, active) and delete users.
  - _System Masters_: lists of values: Branch, Dealer, Liaisoning, Product Code,
    Bank, Responsible Person, Installer (`lib/masterTypes.js`, stored in
    `data/masters.json`). Branch, Dealer, Liaisoning and Product Code feed the
    **Lead** form suggestions.
    The Responsible Person dropdown on File Submission now reads this master
    (`master: "responsiblePerson"` in `lib/loanFields.js`). **Not wired yet**: other dropdowns.
    The Assign dialog lists real users from the database (`/api/assignees`), never a fixed list.
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
  "bpScNumber": "",
  "customerName": "",
  "village": "",
  "productCode": "",
  "branch": "",
  "dealer": "",
  "liaisoning": "",
  "route": "",
  "dealAmount": 0,
  "stage": "login | nameCheck | siteSurvey | paymentWorkStart | bankFileReady | loanIssue | fileSubmission | firstInstallment | receiveDp | dispatch | cashAskPayment | cashPaymentReceived | cashApproval | cashDispatch | assignInstaller | inspectionFile | meterInspection | generationWifi | tariffCheck | warranty | done",
  "steps": {
    "<stepKey>": {
      "...step fields": "",
      "status": "done | hold",
      "submittedAt": "ISO",
      "submittedBy": ""
    }
  },
  "schedule": {
    "<stepKey>": { "timestamp": "", "plannedDate": "", "actualDate": null }
  }
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

| Method                    | Route                                 | Purpose                                                              |
| ------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| GET                       | `/api/leads`                          | All leads                                                            |
| POST                      | `/api/leads`                          | Add an open lead                                                     |
| PUT / DELETE              | `/api/leads/[id]`                     | Update/reopen/lose a lead; admin-only cleanup delete                 |
| POST                      | `/api/leads/[id]/send-quotation`      | Mark quotation sent; future WhatsApp delivery integration point      |
| POST                      | `/api/leads/[id]/convert`             | Confirm a qualified lead and create its linked case                  |
| GET                       | `/api/cases`                          | All cases                                                            |
| POST                      | `/api/cases`                          | Disabled: returns an error directing the user to confirm a lead      |
| PUT / DELETE              | `/api/cases/[id]`                     | Edit / delete a case (no UI uses these right now)                    |
| POST                      | `/api/cases/[id]/submit`              | Submit a step: `{ step, data }`. 409 if the case is not at that step |
| POST                      | `/api/auth/login`, `/api/auth/logout` | Sign in / out (login is public)                                      |
| GET                       | `/api/auth/me`                        | Signed-in user (401 if the session ended)                            |
| GET / POST / PUT / DELETE | `/api/users`, `/api/users/[id]`       | User management (admin only)                                         |
| GET                       | `/api/masters`                        | All masters (any signed-in user)                                     |
| POST / DELETE             | `/api/masters`                        | Add / remove a master value (admin only)                             |
| POST                      | `/api/upload`                         | Upload a file (JPG/PNG/WEBP/GIF/PDF, max 5 MB)                       |
| GET                       | `/api/files/[name]`                   | Serve an uploaded file                                               |

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
- **Demo data**: `node scripts/seed-demo-data.mjs <app url>` adds one record to every page
  (5 leads for the lead pages and one case per workflow stage) through the real API, so
  every validator runs. Ids it created are in `scripts/.demo-seed-ids.json`; delete those
  records to remove the demo data. Customers are dummy; BP/SC numbers start with 10 / 30.
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
