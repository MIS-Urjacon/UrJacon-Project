"use client";
import { Paperclip, FileText } from "lucide-react";
import { Pill, RoutePill } from "@/components/ui";
import { NAME_DOCS, docData } from "@/lib/workflow";
import { PROCESS_CONFIG } from "@/lib/processConfig";

// Reusable table columns for the step pages.
//  - A step's own submitted data is shown in its History tab (OUT below).
//  - Important data from earlier steps is carried into the next pages (both tabs)
//    so the person submitting the next step can see it without opening anything.

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const day = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
const step = (r, key) => r.steps?.[key];
const dash = <span className="text-slate-300">-</span>;

// Two related values in one column: main value on top, muted value below.
export function Stack({ top, bottom }) {
  return (
    <div className="leading-tight">
      <div className="text-slate-700">{top || "-"}</div>
      <div className="text-xs text-slate-400">{bottom || "-"}</div>
    </div>
  );
}

function RemarkImages({ remark, images = [] }) {
  if (!remark && images.length === 0) return dash;
  return (
    <div className="max-w-[200px] leading-tight">
      {remark && (
        <div className="truncate text-slate-700" title={remark}>
          {remark}
        </div>
      )}
      {images.length > 0 && (
        <div className="mt-1 flex gap-1">
          {images.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              title={f.name}
              className="flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
            >
              {f.url.endsWith(".pdf") ? (
                <FileText size={12} className="text-slate-400" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const SHORT = { aadhaar: "Aadhaar", pan: "PAN", passbook: "Passbook", bill: "Bill" };

function Names({ row }) {
  const n = docData(row);
  if (!n) return dash;
  return (
    <div className="space-y-0.5 text-xs leading-tight">
      {NAME_DOCS.map(([k]) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="w-[52px] shrink-0 text-slate-400">{SHORT[k]}</span>
          <span className={n[k]?.matched ? "text-slate-700" : "font-semibold text-rose-600"}>
            {n[k]?.name}
          </span>
          {n[k]?.files?.[0] && (
            <a href={n[k].files[0].url} target="_blank" rel="noreferrer" title={n[k].files[0].name}>
              <Paperclip size={11} className="text-slate-400 hover:text-brand-dark" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// Bank details live on Bank File Ready; cases from before the change kept them on File Submission in Bank.
const bankStep = (r) => (r.steps?.bankFileReady?.bank ? r.steps.bankFileReady : r.steps?.fileSubmission);

const remarkCol = (key, label = "Remark") => ({
  label,
  cell: (r) => {
    const t = step(r, key)?.remark;
    return t ? (
      <div className="max-w-[200px] truncate" title={t}>
        {t}
      </div>
    ) : (
      dash
    );
  },
});

export const C = {
  // From the case itself (entered when the case was added)
  routeAmount: { label: "Route / Amount", cell: (r) => <Stack top={r.route} bottom={money(r.dealAmount)} /> },
  dealerLiaison: { label: "Dealer / Liaisoning", cell: (r) => <Stack top={r.dealer} bottom={r.liaisoning} /> },
  // Login PMSG
  loginResult: {
    label: "Login Check",
    cell: (r) => (step(r, "login") ? <Pill color="green">{step(r, "login").loginCheck}</Pill> : dash),
  },
  loginRemark: {
    label: "Login Remark / Images",
    cell: (r) => (step(r, "login") ? <RemarkImages remark={step(r, "login").remark} images={step(r, "login").images} /> : dash),
  },
  // PMSG Application No. entered at Login (Login History)
  pmsgNumber: {
    label: "PMSG Application No.",
    cell: (r) => {
      const n = step(r, "login")?.applicationNo;
      return n ? <span className="font-mono text-[13px] font-medium text-slate-700">{n}</span> : dash;
    },
  },
  // Login Check result + remark + images in one column (used in Login History)
  loginDetail: {
    label: "Login Check / Remark",
    cell: (r) => {
      const l = step(r, "login");
      if (!l) return dash;
      return (
        <div className="leading-tight">
          <Pill color="green">{l.loginCheck}</Pill>
          {(l.remark || l.images?.length > 0) && (
            <div className="mt-1.5">
              <RemarkImages remark={l.remark} images={l.images} />
            </div>
          )}
        </div>
      );
    },
  },
  // Document Receive
  received: {
    label: "Received",
    cell: (r) => {
      const d = step(r, "documentReceive");
      if (!d?.receivedDate) return dash;
      return <Stack top={day(d.receivedDate)} bottom={d.receivedThrough} />;
    },
  },
  verified: {
    label: "Verified",
    cell: (r) => {
      const v = step(r, "nameCheck");
      if (!v) return dash;
      return (
        <div className="leading-tight">
          <Pill color={v.verificationStatus === "Pending" || v.verificationResult === "Pending" ? "amber" : "green"}>
            {v.verificationStatus ?? v.verificationResult ?? "Verified"}
          </Pill>
          {v.remark && <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500" title={v.remark}>{v.remark}</div>}
        </div>
      );
    },
  },
  // Name Check
  names: { label: "Names on Documents", cell: (r) => <Names row={r} /> },
  verification: {
    label: "Verification",
    cell: (r) => {
      const verification = docData(r);
      if (!verification) return dash;
      return (
        <div className="leading-tight">
          <Pill color={verification.verificationResult === "Verified" ? "green" : "amber"}>
            {verification.verificationResult}
          </Pill>
          <div className="mt-1 text-xs text-slate-500">{verification.systemType || "-"}</div>
          {verification.correctionType && (
            <div className="mt-1 max-w-[180px] text-xs text-amber-700" title={verification.correctionReason}>
              {verification.correctionDocuments?.length > 0 && (
                <span className="block font-semibold">{verification.correctionDocuments.join(", ")}</span>
              )}
              {verification.correctionType}: {verification.correctionReason}
            </div>
          )}
        </div>
      );
    },
  },
  // Site Survey
  contact: {
    label: "Contact / Surveyor",
    cell: (r) => (step(r, "siteSurvey") ? <Stack top={step(r, "siteSurvey").contactNumber} bottom={step(r, "siteSurvey").surveyorName} /> : dash),
  },
  surveyDate: {
    label: "Survey Date",
    cell: (r) => (step(r, "siteSurvey") ? day(step(r, "siteSurvey").surveyDate) : dash),
  },
  surveyDispatch: {
    label: "Survey Site / Contact",
    cell: (r) => {
      const survey = step(r, "siteSurvey");
      if (!survey) return dash;
      return (
        <div className="max-w-[220px] leading-tight">
          <div className="font-medium text-slate-700">{survey.village || r.village || "-"}</div>
          <div className="mt-1 text-xs text-slate-500">{survey.contactNumber || "-"}</div>
          <div className="mt-0.5 text-xs text-slate-400">
            {survey.surveyorName || "-"} · {survey.surveyDate ? day(survey.surveyDate) : "-"}
          </div>
        </div>
      );
    },
  },
  // Payment Work Start
  cashLoan: {
    label: "Cash / Loan · Corridor",
    cell: (r) => {
      const p = step(r, "paymentWorkStart");
      if (!p) return dash;
      return (
        <div className="leading-tight">
          <RoutePill route={p.cashOrLoan} />
          <div className="mt-1 text-xs text-slate-400">{p.corridor}</div>
        </div>
      );
    },
  },
  // Loan steps (the bank details are filled at Bank File Ready; older cases kept them on File Submission)
  bankInfo: {
    label: "Bank / Branch",
    cell: (r) => (bankStep(r)?.bank ? <Stack top={bankStep(r).bank} bottom={bankStep(r).bankBranch} /> : dash),
  },
  bankNameBranch: {
    label: "Bank Name / Branch Name",
    cell: (r) => (bankStep(r)?.bank ? <Stack top={bankStep(r).bank} bottom={bankStep(r).bankBranch} /> : dash),
  },
  quotationAmount: {
    label: "Quotation Amount",
    cell: (r) => (bankStep(r)?.bank ? <Stack top={money(bankStep(r).bankQuotation)} bottom={bankStep(r).responsiblePerson} /> : dash),
  },
  bankRouteOffice: {
    label: "Route / Office",
    cell: (r) => {
      const b = step(r, "bankFileReady");
      return b?.bankRoute || b?.bankOffice ? <Stack top={b.bankRoute} bottom={b.bankOffice} /> : dash;
    },
  },
  submittedFile: {
    label: "Submitted File",
    cell: (r) => {
      const files = step(r, "fileSubmission")?.submissionFiles ?? [];
      if (!files.length) return dash;
      return <a href={files[0].url} target="_blank" rel="noreferrer" title={files[0].name} className="font-semibold text-brand-dark hover:underline">{files[0].url.endsWith(".pdf") ? "View PDF" : "View file"}</a>;
    },
  },
  quotation: {
    label: "Bank Quotation",
    cell: (r) =>
      bankStep(r)?.bank ? (
        <Stack top={money(bankStep(r).bankQuotation)} bottom={bankStep(r).responsiblePerson} />
      ) : (
        dash
      ),
  },
  firstAmount: {
    label: "Bank 70% Received",
    cell: (r) => (step(r, "firstInstallment") ? money(step(r, "firstInstallment").amount) : dash),
  },
  dpAmount: {
    label: "Down Payment Received",
    cell: (r) => (step(r, "receiveDp") ? money(step(r, "receiveDp").amount) : dash),
  },
  remark: remarkCol,
  // Cash flow
  dealNinety: {
    label: "Deal / 90%",
    cell: (r) => <Stack top={money(r.dealAmount)} bottom={`90%: ${money(Math.round((Number(r.dealAmount) || 0) * 0.9))}`} />,
  },
  payRecv: {
    label: "90% Received",
    cell: (r) => {
      const p = step(r, "cashPaymentReceived");
      return p ? <Pill color={p.paymentReceived === "Yes" ? "green" : "red"}>{p.paymentReceived}</Pill> : dash;
    },
  },
  approver: {
    label: "Approver",
    cell: (r) => step(r, "cashApproval")?.approver || dash,
  },
  paymentSent: {
    label: "Payment Details Sent",
    cell: (r) => {
      const sent = r.paymentDetailsSent ?? [];
      if (!sent.length) return dash;
      const last = sent.at(-1);
      return <Stack top={day(last.at)} bottom={`${last.by}${sent.length > 1 ? ` · ${sent.length}x` : ""}`} />;
    },
  },
  meterImage: {
    label: "Meter Image",
    cell: (r) => {
      const files = step(r, "meterInspection")?.meterImages ?? [];
      if (!files.length) return dash;
      return (
        <div className="flex gap-1.5">
          {files.map((file) => (
            <a key={file.url} href={file.url} target="_blank" rel="noreferrer" title={file.name} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
              {file.url.endsWith(".pdf") ? "PDF" : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      );
    },
  },
  approvalImage: {
    label: "Approval Image",
    cell: (r) => {
      const files = step(r, "cashApproval")?.images ?? [];
      if (!files.length) return dash;
      return (
        <div className="flex gap-1.5">
          {files.map((file) => (
            <a key={file.url} href={file.url} target="_blank" rel="noreferrer" title={file.name} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
              {file.url.endsWith(".pdf") ? "PDF" : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.name || "Approval"} className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      );
    },
  },
  // Installation flow
  installer: {
    label: "Installer Name",
    cell: (r) => step(r, "assignInstaller")?.installerName || dash,
  },
  warrantyBalance: {
    label: "Balance Recovery",
    cell: (r) => {
      const w = step(r, "warranty");
      if (!w) return dash;
      return (
        <div className="leading-tight">
          <Pill color={w.balanceStatus === "Cleared" ? "green" : "red"}>{w.balanceStatus}</Pill>
          <div className="mt-1 text-xs text-slate-400">
            Due {money(w.balanceDue)} · Recovered {money(w.balanceRecovered)}
          </div>
        </div>
      );
    },
  },
  warrantyDetail: {
    label: "Warranty",
    cell: (r) => {
      const w = step(r, "warranty");
      if (!w?.warrantyType) return dash;
      const detail = w.warrantyType === "Tata"
        ? w.tataWarrantyReference
        : `Panel DCR: ${w.panelWarrantyDcr} · Inverter: ${w.inverterRegistration}`;
      return <Stack top={w.warrantyType} bottom={detail} />;
    },
  },
  warrantyHandover: {
    label: "Warranty Date / Handover",
    cell: (r) => {
      const w = step(r, "warranty");
      return w?.warrantyDate
        ? <Stack top={day(w.warrantyDate)} bottom={`Handover kit: ${w.handoverKitGiven}`} />
        : dash;
    },
  },
};

// Each step's own submitted data (History tab).
export const OUT = {
  documentReceive: [C.received, C.verification, C.names],
  login: [C.pmsgNumber, C.loginDetail],
  nameCheck: [C.verified],
  siteSurvey: [C.contact, C.surveyDate],
  paymentWorkStart: [C.cashLoan],
  bankFileReady: [C.bankNameBranch, C.quotationAmount, C.bankRouteOffice, remarkCol("bankFileReady")],
  loanIssue: [remarkCol("loanIssue")],
  fileSubmission: [C.submittedFile],
  firstInstallment: [C.firstAmount, remarkCol("firstInstallment")],
  receiveDp: [C.dpAmount, remarkCol("receiveDp")],
  dispatch: [remarkCol("dispatch")],
  cashAskPayment: [C.paymentSent, remarkCol("cashAskPayment")],
  cashPaymentReceived: [C.payRecv, remarkCol("cashPaymentReceived")],
  cashApproval: [C.approver, C.approvalImage, remarkCol("cashApproval")],
  cashDispatch: [remarkCol("cashDispatch")],
  assignInstaller: [C.installer, remarkCol("assignInstaller", "Working Remarks")],
  inspectionFile: [remarkCol("inspectionFile")],
  meterInspection: [C.meterImage, remarkCol("meterInspection")],
  generationWifi: [remarkCol("generationWifi", "Working Remarks")],
  tariffCheck: [remarkCol("tariffCheck")],
  warranty: [C.warrantyBalance, C.warrantyDetail, C.warrantyHandover, remarkCol("warranty")],
};

// Important data from earlier steps, shown on the page of the step that needs it.
export const CARRY = {
  login: [C.verification, C.names],
  nameCheck: [C.received, C.verification, C.names],
  siteSurvey: [C.dealerLiaison],
  paymentWorkStart: [C.routeAmount, C.contact, C.surveyDate],
  bankFileReady: [C.cashLoan, C.routeAmount, C.contact],
  loanIssue: [C.cashLoan, C.routeAmount],
  fileSubmission: [C.cashLoan, C.routeAmount, C.bankNameBranch, C.quotation],
  firstInstallment: [C.bankInfo, C.quotation, C.routeAmount],
  receiveDp: [C.bankInfo, C.quotation, C.firstAmount],
  dispatch: [C.surveyDispatch, C.quotation, C.firstAmount, C.dpAmount],
  cashAskPayment: [C.contact, C.dealNinety],
  cashPaymentReceived: [C.dealNinety, remarkCol("cashAskPayment", "Ask Payment Remark")],
  cashApproval: [C.dealNinety, C.payRecv],
  cashDispatch: [C.surveyDispatch, C.dealNinety, C.payRecv, C.approver],
  assignInstaller: [C.contact, C.cashLoan],
  inspectionFile: [C.installer],
  meterInspection: [C.installer],
  generationWifi: [C.installer, C.contact],
  tariffCheck: [],
  warranty: [C.cashLoan, C.installer],
};

// ---------------------------------------------------------------------------
// Added columns: every submitted field is visible in History, and the data the next steps need is carried.
// Existing columns above are unchanged; the blocks below only add to OUT / CARRY.
// ---------------------------------------------------------------------------
const fmtDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? day(v.slice(0, 10)) : v);
const yn = (v) => (v === true ? "Yes" : v === false ? "No" : v);
const has = (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

// File list as small thumbnails / PDF icons that open the file.
function FileLinks({ files }) {
  if (!Array.isArray(files) || files.length === 0) return dash;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {files
        .filter((f) => f?.url)
        .map((f) => (
          <a
            key={f.url}
            href={f.url}
            target="_blank"
            rel="noreferrer"
            title={f.name}
            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
          >
            {f.url.endsWith(".pdf") ? (
              <FileText size={12} className="text-slate-400" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.name || "File"} className="h-full w-full object-cover" />
            )}
          </a>
        ))}
    </span>
  );
}

// Several related values in one cell: small muted label, then the value. rows = [[label, node-or-text], ...]
function Lines({ rows }) {
  return (
    <div className="max-w-[230px] space-y-0.5 text-xs leading-tight">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-slate-400">{label}</span>
          <span className="min-w-0 truncate text-slate-700" title={typeof value === "string" ? value : undefined}>
            {has(value) ? value : "-"}
          </span>
        </div>
      ))}
    </div>
  );
}

// A column showing several keys of one step.  items = [[label, key, kind?]] kind: money | date | yn | files | list
function stepLines(label, stepKey, items) {
  return {
    label,
    cell: (r) => {
      const d = step(r, stepKey);
      if (!d) return dash;
      return (
        <Lines
          rows={items.map(([l, k, kind]) => {
            const v = d[k];
            if (kind === "files") return [l, has(v) ? <FileLinks files={v} /> : null];
            if (!has(v)) return [l, null];
            if (kind === "money") return [l, money(v)];
            if (kind === "date") return [l, fmtDate(v)];
            if (kind === "yn") return [l, yn(v)];
            if (kind === "list") return [l, Array.isArray(v) ? v.join(", ") : v];
            return [l, String(v)];
          })}
        />
      );
    },
  };
}

// Auto columns for a configured step (lib/processConfig.js): one "Details" column for the plain fields,
// one "Files" column for the uploads, then the remark. Labels with the rupee sign show as money.
function configColumns(stepKey) {
  const cfg = PROCESS_CONFIG[stepKey];
  const short = (l) => l.replace(/\s*\(.*?\)\s*/g, "").trim();
  const plain = cfg.fields
    .filter((f) => f.type !== "files")
    .map((f) => [short(f.label), f.key, f.label.includes("₹") ? "money" : f.type === "date" ? "date" : undefined]);
  const files = cfg.fields.filter((f) => f.type === "files").map((f) => [short(f.label), f.key, "files"]);
  const cols = [];
  if (cfg.receiptStatus) plain.unshift(["Receipt Status", "receiptStatus"]);
  if (plain.length) cols.push(stepLines("Details", stepKey, plain));
  if (files.length) cols.push(stepLines(files.length === 1 ? files[0][0] : "Files", stepKey, files));
  cols.push(remarkCol(stepKey));
  return cols;
}

const C2 = {
  // Login PMSG hold / retry (Login History)
  loginHold: {
    label: "Hold Reason / Retry",
    cell: (r) => {
      const l = step(r, "login");
      if (!l || (!l.holdReason && !l.retryDate)) return dash;
      return <Stack top={l.holdReason} bottom={l.retryDate ? `Retry ${fmtDate(l.retryDate)}` : ""} />;
    },
  },
  // Document Receive
  docReview: {
    label: "Document Review",
    cell: (r) => {
      const n = docData(r);
      if (!n) return dash;
      return (
        <div className="space-y-0.5 text-xs leading-tight">
          {NAME_DOCS.map(([k]) => {
            const v = n.documentReviews?.[k] ?? n[k]?.reviewStatus;
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-[52px] shrink-0 text-slate-400">{SHORT[k]}</span>
                <span className={v === "Proper" ? "text-slate-700" : "font-semibold text-rose-600"}>{v || "-"}</span>
              </div>
            );
          })}
        </div>
      );
    },
  },
  paymentMode: {
    label: "Payment Mode",
    cell: (r) => {
      const m = step(r, "documentReceive")?.paymentMode;
      return m ? <RoutePill route={m} /> : dash;
    },
  },
  docPricing: {
    label: "System / Price",
    cell: (r) => {
      const d = step(r, "documentReceive");
      if (!d) return dash;
      const p = d.pricing;
      const kw = p?.kw ?? r.kwWanted;
      const price = p?.price ?? r.dealAmount;
      return (
        <Lines
          rows={[
            ["Size", has(kw) ? `${kw} kW` : null],
            ["Price", has(price) ? money(price) : null],
            ["Subsidy", p ? `${money(p.centralSubsidy)} + ${money(p.stateSubsidy)}` : null],
            ["Type", p ? [p.gridType, p.dcrType, d.systemType].filter(Boolean).join(" · ") : d.systemType],
            ["Panel", p?.panelBrand],
          ]}
        />
      );
    },
  },
  terrace: {
    label: "Terrace Geotag",
    cell: (r) => <FileLinks files={step(r, "documentReceive")?.terracePhotoFiles} />,
  },
  // Document Verification: which documents were ticked
  verifiedDocs: {
    label: "Documents Verified",
    cell: (r) => {
      const v = step(r, "nameCheck");
      if (!v?.verified) return dash;
      return (
        <div className="space-y-0.5 text-xs leading-tight">
          {NAME_DOCS.map(([k]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-[52px] shrink-0 text-slate-400">{SHORT[k]}</span>
              <span className={v.verified[k] ? "text-slate-700" : "font-semibold text-rose-600"}>
                {v.verified[k] ? "Verified" : "Not verified"}
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  // Survey List
  surveyMeter: stepLines("Meter / Material", "siteSurvey", [
    ["Smart meter", "smartMeterPresent"],
    ["Material", "materialNeeded"],
    ["Cement/Gitti/Balu", "materialsAvailable", "list"],
  ]),
  surveyElectrical: stepLines("Electrical", "siteSurvey", [
    ["Phase", "phaseType"],
    ["Category", "connectionCategory"],
    ["Meter", "meterType"],
  ]),
  surveyRoof: stepLines("Roof", "siteSurvey", [
    ["Type", "roofType"],
    ["Mounting", "mountingType"],
    ["Structure", "structureSize"],
    ["Facing", "roofOrientation"],
    ["Condition", "roofCondition"],
    ["Age (yrs)", "roofAge"],
    ["Area (sqft)", "usableArea"],
    ["Shading", "shading"],
    ["Access", "accessDetails"],
  ]),
  surveyCables: stepLines("Cable Distances (m)", "siteSurvey", [
    ["Panel-Inv", "panelInverterDistance"],
    ["Inv-DB", "inverterDbDistance"],
    ["Earthing", "earthingDistance"],
    ["Ventilation", "ventilation"],
    ["Wi-Fi/LAN", "wifiLan"],
  ]),
  surveyLogistics: stepLines("Site Logistics", "siteSurvey", [
    ["Vehicle", "vehicleAccess"],
    ["Ladder", "ladderNeeded"],
    ["Storage", "storageAvailable"],
    ["Obstacles", "obstacles"],
    ["Install date", "installationDate", "date"],
  ]),
  surveyPhotos: {
    label: "Survey Photos / Remarks",
    cell: (r) => {
      const s = step(r, "siteSurvey");
      if (!s) return dash;
      return (
        <div className="max-w-[200px] leading-tight">
          <FileLinks files={s.photoPdf} />
          <div className="mt-1 text-xs text-slate-400">
            {Array.isArray(s.photosTaken) ? `${s.photosTaken.length} photo points ticked` : "-"}
          </div>
          {s.surveyorRemarks && (
            <div className="truncate text-xs text-slate-700" title={s.surveyorRemarks}>
              {s.surveyorRemarks}
            </div>
          )}
        </div>
      );
    },
  },
  surveyMaterialCarry: {
    label: "Survey Material",
    cell: (r) => {
      const t = step(r, "siteSurvey")?.materialNeeded;
      return t ? (
        <div className="max-w-[180px] truncate" title={t}>
          {t}
        </div>
      ) : (
        dash
      );
    },
  },
  // Installation: Assign Installer date
  assignDate: {
    label: "Installation Date",
    cell: (r) => {
      const v = step(r, "assignInstaller")?.assignDate;
      return v ? fmtDate(v) : dash;
    },
  },
  meterGeotag: {
    label: "Geotag Image",
    cell: (r) => {
      const files = step(r, "meterInspection")?.meterGeotagFiles ?? [];
      if (!files.length) return dash;
      return (
        <div className="flex gap-1.5">
          {files.map((file) => (
            <a key={file.url} href={file.url} target="_blank" rel="noreferrer" title={file.name} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
              {file.url.endsWith(".pdf") ? "PDF" : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.name || "Geotag"} className="h-full w-full object-cover" />
              )}
            </a>
          ))}
        </div>
      );
    },
  },
  // Accounts Cash Receipt summary (carried into Dispatch)
  receiptCarry: {
    label: "Cash Receipt",
    cell: (r) => {
      const c = step(r, "cashReceipt");
      if (!c) return dash;
      return <Stack top={has(c.amountReceived) ? money(c.amountReceived) : ""} bottom={c.receiptStatus || c.receiptNo} />;
    },
  },
  // Balance Clearance (what the form saves)
  balanceClear: stepLines("Balance", "balanceClearance", [
    ["Total", "totalAmount", "money"],
    ["Discount", "discount", "money"],
    ["Received", "amountReceived", "money"],
    ["Remaining", "remainingBalance", "money"],
    ["Cleared on", "clearanceDate", "date"],
  ]),
  // Small carry columns
  dispatchCarry: stepLines("Loan Dispatch", "dispatch", [
    ["Date", "dispatchDate", "date"],
    ["By", "dispatchedBy"],
  ]),
  cashDispatchCarry: stepLines("Cash Dispatch", "cashDispatch", [
    ["Date", "dispatchDate", "date"],
    ["By", "dispatchedBy"],
  ]),
  installDone: stepLines("Installation", "installationComplete", [
    ["Date", "installationDate", "date"],
    ["Installer", "installerName"],
  ]),
  billCarry: stepLines("Bill / DCR", "billDcr", [
    ["Bill", "billNo"],
    ["DCR", "dcrNo"],
  ]),
  portalSubCarry: stepLines("Portal Submission", "portalInstallation", [
    ["Application", "applicationNo"],
    ["Date", "submissionDate", "date"],
  ]),
  inspectionCarry: stepLines("Inspection Filing", "inspectionFile", [
    ["Route", "inspectionRoute"],
    ["Filed", "filedDate", "date"],
  ]),
  jeCarry: stepLines("JE Visit", "jeInspection", [
    ["Date", "jeVisitDate", "date"],
    ["Approval", "jeApproval"],
  ]),
  leadSourceDate: {
    label: "Lead Source / Date",
    cell: (r) => (r.leadSource || r.leadDate || r.timestamp ? <Stack top={r.leadSource} bottom={fmtDate(r.leadDate || r.timestamp)} /> : dash),
  },
  commissionCarry: stepLines("Commissioning", "generationWifi", [
    ["Inverter ID", "inverterId"],
    ["Switched on", "plantSwitchedOn"],
  ]),
  portalApprovalCarry: stepLines("Portal Approval", "portalInspectionApproval", [["Date", "portalApprovalDate", "date"]]),
  finalBankCarry: stepLines("Final 30% File", "finalBankFile", [["Submitted", "submittedDate", "date"]]),
  finalBankPaid: stepLines("Final 30% Received", "finalBankPayment", [
    ["Amount", "amount", "money"],
    ["Date", "receivedDate", "date"],
  ]),
  redeemCarry: stepLines("Subsidy Redeem", "subsidyRedeem", [
    ["Reference", "subsidyReference"],
    ["Date", "redeemDate", "date"],
  ]),
  disbursalCarry: stepLines("Subsidy Disbursal", "subsidyDisbursal", [
    ["Central", "centralDisbursalDate", "date"],
    ["State", "stateDisbursalDate", "date"],
  ]),
  chequeCarry: stepLines("Subsidy Cheques", "subsidyChequeReady", [
    ["Central", "centralChequeNo"],
    ["State", "stateChequeNo"],
    ["Balance rec.", "balanceReceived", "money"],
  ]),
  agreementCarry: stepLines("Agreement", "agreementUpload", [
    ["Date", "agreementDate", "date"],
    ["Stamp", "stampAmount", "money"],
  ]),
  janCarry: stepLines("JanSamarth", "janSamarth", [["Approved", "approvalDate", "date"]]),
};

// ---- History (OUT): add what each step submitted but did not show yet. ----
const addOut = (key, ...cols) => {
  OUT[key] = [...(OUT[key] ?? []), ...cols];
};
addOut("documentReceive", C2.docReview, C2.paymentMode, C2.docPricing, C2.terrace);
addOut("login", C2.loginHold);
addOut("nameCheck", C2.verifiedDocs);
addOut("siteSurvey", C2.surveyMeter, C2.surveyElectrical, C2.surveyRoof, C2.surveyCables, C2.surveyLogistics, C2.surveyPhotos);
addOut("assignInstaller", C2.assignDate);

// Steps built from lib/processConfig.js: every configured field + remark (shown by ReferenceStepPage in History).
for (const key of Object.keys(PROCESS_CONFIG)) {
  if (key === "balanceClearance") OUT[key] = [C2.balanceClear, remarkCol(key)];
  else if (key === "meterInspection") OUT[key] = [C.meterImage, C2.meterGeotag, remarkCol(key)];
  else OUT[key] = configColumns(key);
}

// ---- Carry (CARRY): earlier data the next step needs. ----
const addCarry = (key, ...cols) => {
  CARRY[key] = [...(CARRY[key] ?? []), ...cols];
};
addCarry("siteSurvey", C2.paymentMode, C2.docPricing);
addCarry("agreementUpload", C.pmsgNumber, C.routeAmount);
addCarry("nameCorrection", C.pmsgNumber);
addCarry("ownerChange", C.pmsgNumber);
addCarry("janSamarth", C.cashLoan, C.routeAmount, C2.agreementCarry);
addCarry("bankFileReady", C2.janCarry);
addCarry("loanIssue", C.bankInfo, C.quotation);
addCarry("dispatch", C.cashLoan, C2.receiptCarry, C2.surveyMaterialCarry);
addCarry("cashDispatch", C2.receiptCarry, C2.surveyMaterialCarry);
addCarry("subsidyChequeReady", C.cashLoan, C.routeAmount, C2.agreementCarry);
addCarry("cashReceipt", C.cashLoan, C.routeAmount, C.payRecv, C2.chequeCarry);
addCarry("assignInstaller", C2.dispatchCarry, C2.cashDispatchCarry);
addCarry("installationComplete", C.installer, C2.assignDate, C.contact, C2.dispatchCarry, C2.cashDispatchCarry);
addCarry("billDcr", C2.installDone, C.cashLoan, C.payRecv);
addCarry("portalInstallation", C.pmsgNumber, C2.billCarry);
addCarry("inspectionFile", C2.portalSubCarry);
addCarry("meterInspection", C2.inspectionCarry, C2.leadSourceDate);
addCarry("jeInspection", C.meterImage);
addCarry("generationWifi", C2.jeCarry);
addCarry("portalInspectionApproval", C.pmsgNumber, C2.commissionCarry);
addCarry("tariffCheck", C.pmsgNumber, C2.portalApprovalCarry);
addCarry("finalBankFile", C.bankInfo, C.quotation, C2.portalApprovalCarry);
addCarry("finalBankPayment", C.bankInfo, C.quotation, C.firstAmount, C2.finalBankCarry);
addCarry("subsidyRedeem", C2.portalApprovalCarry);
addCarry("subsidyDisbursal", C2.redeemCarry);
addCarry("chequeDeposit", C2.disbursalCarry, C2.chequeCarry);
addCarry("balanceClearance", C.cashLoan, C.routeAmount, C.firstAmount, C.dpAmount, C2.finalBankPaid, C2.receiptCarry);
addCarry("warranty", C2.balanceClear, C2.commissionCarry);
