// Adds one demo record to every page, using the app's own API so every rule is validated.
//   1. npm run build && npx next start -p 3101      (or any running copy of the app)
//   2. node scripts/seed-demo-data.mjs http://localhost:3101
// Needs the team logins from scripts/seed-team-users.mjs. Existing records are never touched.
// Created ids are written to scripts/.demo-seed-ids.json so they can be removed again.
import fs from "fs/promises";

const BASE = process.argv[2] ?? "http://localhost:3101";
const PASS = { admin: "admin123" };
const pw = (u) => PASS[u] ?? `${u[0].toUpperCase()}${u.slice(1)}@2026`;

// ---- sessions (one cookie per user) ----
const jars = {};
async function as(username) {
  if (!jars[username]) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: pw(username) }),
    });
    if (!res.ok) throw new Error(`login ${username}: ${res.status}`);
    jars[username] = res.headers.get("set-cookie").split(";")[0];
  }
  return jars[username];
}
async function api(user, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: await as(user) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} (${user}) ${res.status}: ${json.error ?? ""}`);
  return json;
}

// ---- two tiny real files, uploaded once and reused as attachments ----
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
async function upload(buf, type, name) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type }), name);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", headers: { Cookie: await as("admin") }, body: form });
  if (!res.ok) throw new Error(`upload ${name}: ${res.status}`);
  return res.json();
}

// ---- dates ----
const today = new Date();
const day = (ago) => new Date(today.getTime() - ago * 86400000).toISOString().slice(0, 10);

// ---- people (realistic names, villages by branch) ----
const BRANCHES = {
  Sarangarh: { state: "Chhattisgarh", owner: "Alok" },
  Saraipali: { state: "Chhattisgarh", owner: "Akash" },
  Padampur: { state: "Odisha", owner: "Kishan" },
  Bargarh: { state: "Odisha", owner: "Pankaj" },
  Sohela: { state: "Odisha", owner: "Pankaj" },
  Jharband: { state: "Odisha", owner: "Mahesh" },
};
const VILLAGES = {
  Sarangarh: ["Kotrabhata", "Bhaisma"], Saraipali: ["Basna Road", "Pithora"], Padampur: ["Ghess", "Barpali"],
  Bargarh: ["Attabira", "Bhatli"], Sohela: ["Sohela Bazar", "Rajpur"], Jharband: ["Jharbandh Chowk", "Gaisilet"],
};
const NAMES = [
  "Ramesh Kumar Sahu", "Sunita Devi Patel", "Mahendra Singh Thakur", "Kavita Bai Yadav", "Dilip Kumar Naik", "Geeta Rani Sahu",
  "Bhupendra Chandra", "Anita Bai Netam", "Santosh Kumar Bag", "Pushpa Devi Sidar", "Rakesh Kumar Meher", "Laxmi Bai Dewangan",
  "Prakash Chandra Panda", "Meena Kumari Sahu", "Omprakash Agrawal", "Sarita Bai Kurre", "Hemant Kumar Pradhan", "Radha Bai Sahu",
  "Vijay Kumar Verma", "Nirmala Devi Joshi", "Surendra Kumar Behera", "Parvati Bai Tandon", "Ashok Kumar Rathore", "Usha Rani Mishra",
  "Tikaram Chauhan", "Bimla Devi Sahu", "Jagdish Prasad Gupta", "Kamla Bai Patel", "Narendra Kumar Nag", "Sushila Devi Kaushik",
  "Dhaneshwar Sahu", "Rukmani Bai Thakur", "Gopal Krishna Das", "Shanti Devi Chandrakar", "Manoj Kumar Sinha",
];

// ---- one case per page: [target stage, payment mode, cash payment received?, branch] ----
const PLAN = [
  ["nameCheck", "Loan", 0, "Sarangarh"], ["login", "Loan", 0, "Saraipali"], ["siteSurvey", "Cash", 0, "Sarangarh"],
  ["paymentWorkStart", "Loan", 0, "Padampur"],
  ["agreementUpload", "Loan", 0, "Sarangarh"], ["janSamarth", "Loan", 0, "Saraipali"], ["bankFileReady", "Loan", 0, "Bargarh"],
  ["fileSubmission", "Loan", 0, "Sarangarh"], ["loanIssue", "Loan", 0, "Jharband"], ["firstInstallment", "Loan", 0, "Saraipali"],
  ["receiveDp", "Loan", 0, "Sohela"], ["dispatch", "Loan", 0, "Sarangarh"],
  ["cashAskPayment", "Cash", 0, "Saraipali"], ["cashPaymentReceived", "Cash", 0, "Sarangarh"], ["cashApproval", "Cash", "No", "Saraipali"],
  ["subsidyChequeReady", "Subsidy Cheque", 0, "Padampur"], ["cashReceipt", "Cash", "Yes", "Sarangarh"], ["cashDispatch", "Cash", "Yes", "Saraipali"],
  ["assignInstaller", "Loan", 0, "Sarangarh"], ["installationComplete", "Cash", "Yes", "Saraipali"], ["billDcr", "Loan", 0, "Bargarh"],
  ["portalInstallation", "Cash", "Yes", "Sarangarh"], ["inspectionFile", "Loan", 0, "Sarangarh"], ["meterInspection", "Cash", "Yes", "Saraipali"],
  ["jeInspection", "Loan", 0, "Saraipali"], ["generationWifi", "Cash", "Yes", "Sarangarh"], ["portalInspectionApproval", "Loan", 0, "Jharband"],
  ["tariffCheck", "Cash", "Yes", "Saraipali"],
  ["finalBankFile", "Loan", 0, "Sarangarh"], ["finalBankPayment", "Loan", 0, "Saraipali"], ["subsidyRedeem", "Loan", 0, "Sohela"],
  ["subsidyDisbursal", "Cash", "Yes", "Sarangarh"], ["chequeDeposit", "Subsidy Cheque", 0, "Padampur"], ["balanceClearance", "Loan", 0, "Saraipali"],
  ["warranty", "Cash", "Yes", "Sarangarh"],
];

// who submits each step (a user whose role has that page)
const WHO = {
  nameCheck: "reshmi", login: "tripti", siteSurvey: "arun", paymentWorkStart: "ankita", agreementUpload: "soniya",
  janSamarth: "reshmi", bankFileReady: "reshmi", fileSubmission: "alok", loanIssue: "reshmi", firstInstallment: "alok",
  receiveDp: "chetan", cashReceipt: "chetan", dispatch: "sameer", cashDispatch: "jitendra", cashAskPayment: "ankita",
  cashPaymentReceived: "ankita", cashApproval: "ankita", subsidyChequeReady: "chetan", assignInstaller: "arun",
  installationComplete: "arun", billDcr: "chetan", portalInstallation: "soniya", inspectionFile: "satya",
  meterInspection: "satya", jeInspection: "khemdas", generationWifi: "arun", portalInspectionApproval: "soniya",
  tariffCheck: "soniya", finalBankFile: "alok", finalBankPayment: "chetan", subsidyRedeem: "soniya",
  subsidyDisbursal: "soniya", chequeDeposit: "chetan", balanceClearance: "chetan",
};

let files; // { png, pdf } uploaded attachments

function payload(step, c) {
  const done = { workStatus: "Done", remark: "" };
  const f = (u) => [{ url: u.url, name: u.name }];
  const odisha = c.state === "Odisha";
  switch (step) {
    case "nameCheck": {
      const doc = () => ({ name: c.name, files: f(files.png), reviewStatus: "Proper" });
      return { aadhaar: doc(), pan: doc(), passbook: doc(), bill: doc(), systemType: c.index % 2 ? "Tata" : "Non-Tata" };
    }
    case "login": return { loginCheck: "Login Done", applicationNo: c.appNo, remark: "OTP shared by consumer", images: f(files.png) };
    case "siteSurvey":
      return { customerName: c.name, contactNumber: c.mobile, village: c.village, surveyDate: day(14), surveyorName: "Arun",
        smartMeterPresent: odisha ? "No" : "Yes", materialNeeded: `${c.kw} kW: ${c.kw === 3 ? "6" : "10"} x 545 Wp panels, ${c.kw} kW inverter, structure, cables, ACDB/DCDB` };
    case "paymentWorkStart": return { cashOrLoan: c.mode, workStatus: "Done", corridor: "Regular" };
    case "agreementUpload": return { ...done, agreementDate: day(12), stampAmount: odisha ? 10 : 50, agreementFiles: f(files.pdf) };
    case "janSamarth": return { ...done, janSamarthReference: `JS-${c.bp.slice(-6)}`, approvalDate: day(11), bankFileFiles: f(files.pdf) };
    case "bankFileReady": return { ...done, remark: "KYC, quotation, e-token and feasibility checked" };
    case "fileSubmission": return { ...done, bank: c.bank, bankBranch: c.branch, bankQuotation: c.price, responsiblePerson: c.owner };
    case "loanIssue": return { ...done, phsDate: day(9), loanDecision: "Sanctioned" };
    case "firstInstallment": return { ...done, amount: Math.round(c.price * 0.7), remark: "Bank 70% received" };
    case "receiveDp": return { ...done, amount: Math.round(c.price * 0.05), remark: "Down payment received" };
    case "cashAskPayment": return { ...done, remark: "Customer asked to pay 90%" };
    case "cashPaymentReceived": return { paymentReceived: c.cashPaid, remark: c.cashPaid === "Yes" ? "90% received" : "Customer will pay after dispatch" };
    case "cashApproval": return { ...done, approver: "MD", remark: "Director approval taken, signed register" };
    case "subsidyChequeReady":
      return { ...done, balanceAmount: c.price - 78000, balanceReceived: c.price - 78000, centralChequeNo: `CH-${c.bp.slice(-5)}1`, stateChequeNo: `CH-${c.bp.slice(-5)}2`, agreementConfirmed: "Yes" };
    case "cashReceipt":
      return { ...done, receiptNo: `RCT-${c.bp.slice(-5)}`, amountReceived: c.mode === "Loan" ? Math.round(c.price * 0.75) : Math.round(c.price * 0.9), receiptDate: day(8), signedBy: "Chetan", approver: c.cashPaid === "No" ? "MD" : "", receiptFiles: f(files.pdf) };
    case "dispatch": case "cashDispatch":
      return { ...done, dispatchDate: day(7), materialList: `${c.kw} kW rooftop kit as per survey report`, dispatchedBy: "Sameer", deliveredBy: "Jitendra",
        ...(odisha ? { tpwodlReference: `TPW-${c.bp.slice(-6)}`, meterChargePaidDate: day(8) } : {}) };
    case "assignInstaller": return { ...done, installerName: "Ravi Installer Team", remark: "Assigned in Daily Group" };
    case "installationComplete":
      return { ...done, installationDate: day(5), installerName: "Ravi Installer Team", panelSerialFiles: f(files.png), inverterSerialFiles: f(files.png), plantGeotagFiles: f(files.png) };
    case "billDcr":
      return { ...done, billNo: `INV-${c.bp.slice(-5)}`, dcrNo: `DCR-${c.bp.slice(-5)}`, documentDate: day(4), invoiceFiles: f(files.pdf), dcrFiles: f(files.pdf), workCompletionFiles: f(files.pdf) };
    case "portalInstallation": return { ...done, applicationNo: c.appNo, submissionDate: day(4) };
    case "inspectionFile":
      return { ...done, inspectionRoute: odisha ? "TPWODL Portal" : "CSEB / CSPDCL", filedDate: day(3), filedBy: odisha ? "Soniya" : "Satya", inspectionFiles: f(files.pdf) };
    case "meterInspection": return { ...done, meterType: "Bidirectional Meter", meterSource: odisha ? "TPWODL" : "Genus", meterFittedDate: day(3), bidirectional: "Yes" };
    case "jeInspection": return { ...done, jeVisitDate: day(2), jeName: "JE Mr. Sahu", jeApproval: "Approved" };
    case "generationWifi": return { ...done, configurationDate: day(2), inverterId: `INV${c.bp.slice(-6)}`, loginShared: "Yes", plantSwitchedOn: "Yes" };
    case "portalInspectionApproval": return { ...done, portalApprovalDate: day(1), reverification: "No", duplicateSerial: "No" };
    case "tariffCheck": return { ...done, remark: "Tariff code verified on portal" };
    case "finalBankFile": return { ...done, submittedDate: day(1), finalBankFiles: f(files.pdf) };
    case "finalBankPayment": return { ...done, amount: Math.round(c.price * 0.25), receivedDate: day(1) };
    case "subsidyRedeem": return { ...done, redeemDate: day(1), subsidyReference: `SUB-${c.bp.slice(-6)}` };
    case "subsidyDisbursal": return { ...done, centralDisbursalDate: day(1), stateDisbursalDate: odisha ? day(1) : "" };
    case "chequeDeposit": return { ...done, centralDepositDate: day(1), stateDepositDate: day(1), chequeStatus: "Cleared" };
    case "balanceClearance": return { totalAmount: c.price, amountReceived: c.price, clearanceDate: day(0), remark: "Full balance received" };
    default: throw new Error(`no payload for ${step}`);
  }
}

// ---- leads ----
const leadBody = (n, extra = {}) => ({
  customerName: n.name, mobile: n.mobile, village: n.village, address: `${n.village}, ${n.branch}`, state: BRANCHES[n.branch].state,
  email: `${n.name.split(" ")[0].toLowerCase()}${n.i}@gmail.com`, source: "Field Visit", monthlyBill: 2400, kwWanted: n.kw,
  productCode: `PMSG-${n.kw}KW`, temperature: "Warm", branch: n.branch, dealer: "Bantu Sahu", liaisoning: "Satya Kumar Sahu",
  latitude: 21.59 + n.i / 1000, longitude: 83.08 + n.i / 1000, locationAccuracy: 12, locationCapturedAt: new Date().toISOString(), ...extra,
});
const person = (i, branch) => {
  const kw = i % 3 === 0 ? 5 : 3;
  return {
    i, name: NAMES[i % NAMES.length], branch, kw, price: kw === 3 ? 195000 : 310000,
    village: VILLAGES[branch][i % 2], mobile: `98${String(27000000 + i * 7919).slice(0, 8)}`,
    bp: `${BRANCHES[branch].state === "Odisha" ? "30" : "10"}${String(54000000 + i * 31337)}`.slice(0, 10),
  };
};
const QUOTE = (n, ref) => ({
  quotationReference: ref, quotationEntity: n.i % 2 ? "Urjacon" : "Tuskin", quotationSystemType: "Residential Rooftop Solar",
  quotationDcrType: "DCR", quotationGridType: "On-grid", quotationSubsidy: 78000, dealAmount: n.price, kwWanted: n.kw,
  quotationStatus: "draft", quotationCreatedAt: new Date().toISOString(), quotationValidityDays: 15,
  quotationNotes: "Price includes installation, net-metering file and 5 year service.",
});

async function newLead(n, extra) { return api("ankita", "POST", "/api/leads", leadBody(n, extra)); }

async function toCase(n, mode) {
  let lead = await newLead(n, { temperature: "Hot", outcome: "Interested", nextFollowUp: "" });
  lead = await api("ankita", "PUT", `/api/leads/${lead.id}`, {
    ...lead, ...QUOTE(n, `QT-2026-${String(1100 + n.i)}`), leadStage: "quotation",
    followUp: { type: "Call", outcome: "Send quotation", remark: "Customer interested, asked for price" },
  });
  const sent = (await api("ankita", "POST", `/api/leads/${lead.id}/send-quotation`)).lead;
  lead = await api("ankita", "PUT", `/api/leads/${lead.id}`, {
    ...sent, leadStage: "documentsReady", bpScNumber: n.bp, paymentMode: mode, route: "Route 1",
    documents: { aadhaar: true, pan: true, passbook: true, bill: true, terracePhoto: true },
    followUp: { type: "Visit", outcome: "Document Given", remark: "Documents collected from customer" },
  });
  return (await api("ankita", "POST", `/api/leads/${lead.id}/convert`)).case;
}

async function main() {
  const created = { leads: [], cases: [], uploads: [] };
  files = { png: await upload(PNG, "image/png", "geotag-photo.png"), pdf: await upload(PDF, "application/pdf", "signed-document.pdf") };
  created.uploads.push(files.png.url, files.pdf.url);

  const ONLY = process.env.ONLY?.split(","); // re-run only some pages
  // 1. open leads for the three lead pages (+ one lost lead)
  if (!ONLY) {
  const L = (i) => person(200 + i, ["Sarangarh", "Saraipali", "Sarangarh", "Padampur", "Bargarh"][i]);
  const l1 = await newLead(L(0), { temperature: "Hot", nextFollowUp: new Date(Date.now() + 86400000).toISOString().slice(0, 16), outcome: "New enquiry" });
  const l2 = await newLead(L(1), { temperature: "Warm", source: "Agent", agent: "", commission: 5000, nextFollowUp: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16) });
  await api("ankita", "PUT", `/api/leads/${l2.id}`, { ...l2, leadStage: "contacted", followUp: { type: "Call", outcome: "Call back later", remark: "Asked to call after Sunday" }, nextFollowUp: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16) });
  const l3 = await newLead(L(2), { temperature: "Hot" });
  await api("ankita", "PUT", `/api/leads/${l3.id}`, { ...l3, ...QUOTE(L(2), "QT-2026-1301"), leadStage: "quotation", followUp: { type: "Call", outcome: "Send quotation", remark: "Wants 3 kW system" } });
  const l4 = await newLead(L(3), { temperature: "Warm" });
  const l4q = await api("ankita", "PUT", `/api/leads/${l4.id}`, { ...l4, ...QUOTE(L(3), "QT-2026-1302"), leadStage: "quotation", followUp: { type: "Call", outcome: "Send quotation", remark: "Odisha customer, subsidy cheque interest" } });
  await api("ankita", "POST", `/api/leads/${l4.id}/send-quotation`);
  const l5 = await newLead(L(4), { temperature: "Cold" });
  await api("ankita", "PUT", `/api/leads/${l5.id}`, { ...l5, action: "lost", lostReason: "Customer already registered with another vendor (H02)" });
  created.leads.push(l1.id, l2.id, l3.id, l4.id, l5.id);
  console.log("leads:", created.leads.join(" "));
  }

  // 2. one converted case per page, created one by one (case ids are allocated on convert)
  const cases = [];
  for (let k = 0; k < PLAN.length; k++) {
    if (ONLY && !ONLY.includes(PLAN[k][0])) continue;
    const [target, mode, cashPaid, branch] = PLAN[k];
    const n = person(k + 1, branch);
    const row = await toCase(n, mode);
    created.cases.push(row.id);
    cases.push({ id: row.id, row, target, ctx: { ...n, index: k, mode, state: BRANCHES[branch].state, owner: BRANCHES[branch].owner,
      bank: ["State Bank of India", "Bank of India", "Union Bank of India", "Punjab National Bank"][k % 4],
      cashPaid: cashPaid || "Yes", appNo: `PMSG${String(2026110000 + n.i * 73)}` } });
    console.log("case", row.id, "->", target);
  }
  await fs.writeFile(new URL("./.demo-seed-ids.json", import.meta.url), JSON.stringify(created, null, 2));

  // 3. move each case to its page (several at a time; each case's own steps stay in order)
  async function advance({ id, row, target, ctx }) {
    for (let guard = 0; guard < 45; guard++) {
      if (row.stage === target) return `${id} at ${target}`;
      const step = row.stage;
      row = await api(WHO[step] ?? "admin", "POST", `/api/cases/${id}/submit`, { step, data: payload(step, ctx) });
    }
    throw new Error(`${id}: did not reach ${target}`);
  }
  const queue = [...cases];
  const failures = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try { console.log(await advance(job)); } catch (e) { failures.push(e.message); console.log("FAIL", e.message); }
    }
  }));
  console.log(failures.length ? `\n${failures.length} failed:\n${failures.join("\n")}` : "\nAll demo records created.");
}
main().catch((e) => { console.error(e); process.exit(1); });
