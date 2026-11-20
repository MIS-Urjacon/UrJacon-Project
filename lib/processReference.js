export const BUSINESS_RULES = [
  ["BR-01", "Open leads require a next follow-up and Hot/Warm/Cold priority until documents or a final no."],
  ["BR-02", "Office handover needs PAN, bill, Aadhaar, passbook, terrace geotag, phone, email, product, payment mode, kW and agent commission where applicable."],
  ["BR-03", "Owner above 65/customer request needs owner change; spelling mismatch and missing PAN must be corrected."],
  ["BR-04", "Corrections finish before portal login and loan processing."],
  ["BR-05", "Tell the consumer about OTP; failed contact or missing OTP is retried next day."],
  ["BR-06", "Site survey follows portal login and its report travels to dispatch."],
  ["BR-07", "Agreement precedes loan: ₹50 CG stamp, ₹10 OD stamp."],
  ["BR-08", "Bank owner by area: Sarangarh–Alok, Padampur–Kishan, Bargarh/Sohela–Pankaj, Jharband–Mahesh, Saraipali–Akash."],
  ["BR-09", "Bank file needs income proof above 3 kW and ghar ka patta in Odisha."],
  ["BR-10", "Curable rejection is fixed and retried; final rejection becomes cash, retry or drop by Reshmi/Ankita."],
  ["BR-11", "Loan dispatch requires signed accounts receipt confirming bank 70% and no pending down payment."],
  ["BR-12", "Cash dispatch normally needs 90%; short payment needs named MD approval. DCR waits for 90%."],
  ["BR-13", "Odisha cheque dispatch needs price-minus-subsidy balance, both cheques and signed agreement."],
  ["BR-14", "Dispatch material must match the site-survey report."],
  ["BR-15", "Odisha dispatch records TPWODL reference and meter-charge payment."],
  ["BR-16", "Portal installation needs panel/inverter serial photos, plant geotag, invoice and DCR."],
  ["BR-17", "CG survey flags missing smart meter for Genus; existing smart-meter sites get generation meter."],
  ["BR-18", "Plant switches on before portal approval only with a bidirectional meter."],
  ["BR-19", "Portal inspection approval needs plant configuration and shared inverter login."],
  ["BR-20", "Subsidy is redeemed only after portal inspection approval; state subsidy follows central."],
  ["BR-21", "Final bank 30% file after commissioning contains invoice, work completion and plant geotag."],
  ["BR-22", "Cash last 10% is collected before warranty."],
  ["BR-23", "Agent commission: loan 70% tranche then balance; cheque case full after subsidy; cash has no agent."],
  ["BR-24", "Close only after consumer balance, bank/cheques, subsidy and warranty tracks are complete."],
  ["BR-25", "Khusboo Panda routes any process issue or complaint."],
  ["BR-26", "Every dispatch requires an accountant-signed cash receipt."],
  ["BR-27", "Dispatch without cash/down payment requires named MD approval."],
  ["BR-28", "Pending balance blocks warranty, handover and—where possible—plant switch-on."],
  ["BR-29", "Verification marks Tata/non-Tata; Tata uses Tata warranty, non-Tata uses panel DCR + online inverter registration."],
];

export const ROLE_ACTIONS = [
  ["Field marketing / Calling", "Lead, follow-up, quotation and document collection"],
  ["CRM Head · Ankita Ahuja", "Receive packet, down payment follow-up, final rejection decisions"],
  ["Processing · Reshmi", "Verification, JanSamarth, loan corrections and decisions"],
  ["Login · Tripti / Rashmi", "PMSG login with consumer OTP"],
  ["Documentation · Soniya", "Corrections, agreement, portal submissions, inspection documents and subsidy"],
  ["Banking · Alok + area team", "Bank submission, PHS follow-up, 70% and final 30% files"],
  ["Accounts · Chetan / Sahil", "Receipts, bill/DCR, balances, cheques and commission"],
  ["Dispatch · Sameer / Jitendra", "Dispatch per survey report"],
  ["Service · Arun team / Khusboo", "Survey, installation, configuration, warranty and complaint routing"],
  ["DISCOM · Satya / Khemdas", "CG corrections, inspection filing, meters and JE visits"],
  ["Management / MD", "Short-payment dispatch approvals and full visibility"],
];

export const DOCUMENT_SETS = [
  ["Lead handover", "PAN; electricity bill; Aadhaar; passbook; terrace geotag; phone; email; product; payment mode; kW; agent commission"],
  ["Bank loan file", "KYC; vendor quotation; e-token; feasibility; acknowledgement; passbook; income proof above 3 kW; Odisha ghar ka patta"],
  ["Installer evidence", "Every panel serial photo; inverter serial photo; plant geotag"],
  ["Inspection file", "KYC; work completion; PPA; DCR; geotagged plant photos"],
  ["Final 30% file", "Invoice; work completion; plant geotag"],
  ["Dispatch cash receipt", "Case; mode; amount; accountant signature; invoice"],
  ["Customer handover", "Warranty; invoice; agreement; inverter app ID/password; only after zero balance"],
];

export const EXTERNAL_SYSTEMS = [
  ["PM Surya Ghar portal", "Application No.", "Login, agreement, installation, inspection and subsidy"],
  ["JanSamarth", "JanSamarth reference", "Loan application and digital approval"],
  ["Banks", "Loan account", "PHS and 70%/30% disbursal"],
  ["CSEB / CSPDCL", "BP consumer no.", "CG corrections, inspection, meter and JE"],
  ["Genus", "Consumer no.", "CG smart-meter fitting"],
  ["TPWODL", "TPWODL reference", "OD status, charges, work completion, DCR and corrections"],
  ["Price Finder / Proposal Studio", "Quotation reference", "Quotation preparation"],
];

export const GLOSSARY = [
  ["PMSG", "PM Surya Ghar residential rooftop-solar scheme"], ["PHS", "Bank home visit during loan checks"],
  ["DCR", "Domestic-content panel certificate needed for installation submission"], ["PPA", "Power-purchase agreement in the CG inspection file"],
  ["BP / SC No.", "Electricity consumer number: BP in CG, SC in Odisha"], ["Application No.", "National-portal ID used from login through warranty"],
  ["Geotag", "Location-stamped terrace or installed-plant photo"], ["Subsidy redeem", "Portal claim after inspection approval"],
  ["Cash receipt", "Accountant-signed dispatch gate (signed receipt and invoice)"],
];
