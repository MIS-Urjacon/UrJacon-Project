import {
  LogIn,
  UserCheck,
  MapPinned,
  Wallet,
  Landmark,
  TriangleAlert,
  FileUp,
  HandCoins,
  PiggyBank,
  Truck,
  PhoneCall,
  BadgeIndianRupee,
  ShieldCheck,
  PackageCheck,
  HardHat,
  FileCheck2,
  Gauge,
  Wifi,
  FileSearch,
  UserPlus,
} from "lucide-react";

// Sidebar steps, in process order. Add new steps here as the flow grows.
// `group` is the small heading shown above the first step of each group.
const LEAD = "LEAD MANAGEMENT";
const MAIN = "PROCESS STEPS";
const LOAN = "LOAN PROCESS";
const CASH = "CASH PROCESS";
const INSTALL = "INSTALLATION";
export const STEPS = [
  { group: LEAD, slug: "leads", label: "Leads", title: "Lead Management", icon: UserPlus },
  { group: MAIN, slug: "name-check", label: "Name Check", title: "Name Check", icon: UserCheck },
  { group: MAIN, slug: "login-pmsg", label: "Login PMSG", title: "Login PMSG", icon: LogIn },
  { group: MAIN, slug: "site-survey", label: "Site Survey", title: "Site Survey", icon: MapPinned },
  { group: MAIN, slug: "payment-work-start", label: "Payment Work Start", title: "Payment Work Start", icon: Wallet },
  { group: LOAN, slug: "bank-file-ready", label: "Bank File Ready", title: "Bank File Ready", icon: Landmark },
  { group: LOAN, slug: "loan-issue-resolution", label: "Loan Issue Resolution", title: "Loan Issue Cases Resolution", icon: TriangleAlert },
  { group: LOAN, slug: "file-submission", label: "File Submission in Bank", title: "File Submission in Bank", icon: FileUp },
  { group: LOAN, slug: "first-installment", label: "First Installment", title: "Receive First Installment", icon: HandCoins },
  { group: LOAN, slug: "receive-dp", label: "Receive DP", title: "Receive DP", icon: PiggyBank },
  { group: LOAN, slug: "dispatch", label: "Dispatch", title: "Dispatch", icon: Truck },
  { group: CASH, slug: "cash-ask-payment", label: "Ask 90% Payment", title: "Ask 90% Payment for Dispatch", icon: PhoneCall },
  { group: CASH, slug: "cash-payment-received", label: "90% Payment Received?", title: "90% Payment Received?", icon: BadgeIndianRupee },
  { group: CASH, slug: "cash-approval", label: "Check for Approval", title: "Check for Approval", icon: ShieldCheck },
  { group: CASH, slug: "cash-dispatch", label: "Dispatch", title: "Dispatch (Cash)", icon: PackageCheck },
  { group: INSTALL, slug: "assign-installer", label: "Assign Installer", title: "Assign Installer", icon: HardHat },
  { group: INSTALL, slug: "submit-inspection-file", label: "Submit Inspection File", title: "Submit Inspection File", icon: FileCheck2 },
  { group: INSTALL, slug: "meter-install-inspection", label: "Meter Install & Inspection", title: "Meter Install & Inspection", icon: Gauge },
  { group: INSTALL, slug: "generation-wifi", label: "Generation & Wifi", title: "Generation & Wifi", icon: Wifi },
  { group: INSTALL, slug: "tariff-code-check", label: "Tariff Code Check", title: "Tariff Code Check (CG Only)", icon: FileSearch },
];
