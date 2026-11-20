"use client";
import { Paperclip, FileText } from "lucide-react";
import { Pill, RoutePill } from "@/components/ui";
import { NAME_DOCS, docData } from "@/lib/workflow";

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
  // Loan steps
  bankInfo: {
    label: "Bank / Branch",
    cell: (r) => (step(r, "fileSubmission") ? <Stack top={step(r, "fileSubmission").bank} bottom={step(r, "fileSubmission").bankBranch} /> : dash),
  },
  quotation: {
    label: "Bank Quotation",
    cell: (r) =>
      step(r, "fileSubmission") ? (
        <Stack top={money(step(r, "fileSubmission").bankQuotation)} bottom={step(r, "fileSubmission").responsiblePerson} />
      ) : (
        dash
      ),
  },
  firstAmount: {
    label: "First Installment",
    cell: (r) => (step(r, "firstInstallment") ? money(step(r, "firstInstallment").amount) : dash),
  },
  dpAmount: {
    label: "DP Received",
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
  login: [C.loginDetail],
  nameCheck: [C.verified],
  siteSurvey: [C.contact, C.surveyDate],
  paymentWorkStart: [C.cashLoan],
  bankFileReady: [remarkCol("bankFileReady")],
  loanIssue: [remarkCol("loanIssue")],
  fileSubmission: [C.bankInfo, C.quotation, remarkCol("fileSubmission")],
  firstInstallment: [C.firstAmount, remarkCol("firstInstallment")],
  receiveDp: [C.dpAmount, remarkCol("receiveDp")],
  dispatch: [remarkCol("dispatch")],
  cashAskPayment: [C.paymentSent, remarkCol("cashAskPayment")],
  cashPaymentReceived: [C.payRecv, remarkCol("cashPaymentReceived")],
  cashApproval: [C.approver, C.approvalImage, remarkCol("cashApproval")],
  cashDispatch: [remarkCol("cashDispatch")],
  assignInstaller: [C.installer, remarkCol("assignInstaller", "Working Remarks")],
  inspectionFile: [remarkCol("inspectionFile")],
  meterInspection: [remarkCol("meterInspection", "Working Remarks")],
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
  fileSubmission: [C.cashLoan, C.routeAmount],
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
