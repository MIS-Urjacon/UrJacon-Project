"use client";
import { Paperclip, FileText } from "lucide-react";
import { Pill, RoutePill } from "@/components/ui";
import { NAME_DOCS } from "@/lib/workflow";

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
  const n = step(row, "nameCheck");
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
  // Name Check
  names: { label: "Names on Documents", cell: (r) => <Names row={r} /> },
  // Site Survey
  contact: {
    label: "Contact / Surveyor",
    cell: (r) => (step(r, "siteSurvey") ? <Stack top={step(r, "siteSurvey").contactNumber} bottom={step(r, "siteSurvey").surveyorName} /> : dash),
  },
  surveyDate: {
    label: "Survey Date",
    cell: (r) => (step(r, "siteSurvey") ? day(step(r, "siteSurvey").surveyDate) : dash),
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
    label: "SN - Approver",
    cell: (r) => step(r, "cashApproval")?.approver || dash,
  },
  // Installation flow
  installer: {
    label: "Installer Name",
    cell: (r) => step(r, "assignInstaller")?.installerName || dash,
  },
};

// Each step's own submitted data (History tab).
export const OUT = {
  login: [C.loginDetail],
  nameCheck: [C.names],
  siteSurvey: [C.contact, C.surveyDate],
  paymentWorkStart: [C.cashLoan],
  bankFileReady: [remarkCol("bankFileReady")],
  loanIssue: [remarkCol("loanIssue")],
  fileSubmission: [C.bankInfo, C.quotation, remarkCol("fileSubmission")],
  firstInstallment: [C.firstAmount, remarkCol("firstInstallment")],
  receiveDp: [C.dpAmount, remarkCol("receiveDp")],
  dispatch: [remarkCol("dispatch")],
  cashAskPayment: [remarkCol("cashAskPayment")],
  cashPaymentReceived: [C.payRecv, remarkCol("cashPaymentReceived")],
  cashApproval: [C.approver, remarkCol("cashApproval")],
  cashDispatch: [remarkCol("cashDispatch")],
  assignInstaller: [C.installer, remarkCol("assignInstaller", "Working Remarks")],
  inspectionFile: [remarkCol("inspectionFile")],
  meterInspection: [remarkCol("meterInspection", "Working Remarks")],
  generationWifi: [remarkCol("generationWifi", "Working Remarks")],
  tariffCheck: [remarkCol("tariffCheck")],
};

// Important data from earlier steps, shown on the page of the step that needs it.
export const CARRY = {
  login: [C.names],
  nameCheck: [],
  siteSurvey: [C.dealerLiaison],
  paymentWorkStart: [C.routeAmount, C.contact, C.surveyDate],
  bankFileReady: [C.cashLoan, C.routeAmount, C.contact],
  loanIssue: [C.cashLoan, C.routeAmount],
  fileSubmission: [C.cashLoan, C.routeAmount],
  firstInstallment: [C.bankInfo, C.quotation, C.routeAmount],
  receiveDp: [C.bankInfo, C.quotation, C.firstAmount],
  dispatch: [C.quotation, C.firstAmount, C.dpAmount],
  cashAskPayment: [C.contact, C.dealNinety],
  cashPaymentReceived: [C.dealNinety, remarkCol("cashAskPayment", "Ask Payment Remark")],
  cashApproval: [C.dealNinety, C.payRecv],
  cashDispatch: [C.dealNinety, C.payRecv, C.approver],
  assignInstaller: [C.contact, C.cashLoan],
  inspectionFile: [C.installer],
  meterInspection: [C.installer],
  generationWifi: [C.installer, C.contact],
  tariffCheck: [],
};
