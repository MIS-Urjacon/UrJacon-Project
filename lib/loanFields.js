// Extra popup fields for loan steps, shared by the form (client) and the
// validator (server). type: "text" | "number" | "select" | "date" | "files".
// Required: there is no Status field any more, submitting completes the step.
export const EXTRA_FIELDS = {
  // Installation sheet: "Assign Installer" records the installer's name.
  assignInstaller: [
    { key: "installerName", label: "Installer Name", type: "select", master: "installer" }, // dropdown from Settings > System Masters > Installer
    { key: "assignDate", label: "Installation Date", type: "date", today: true }, // filled with today's date, can be changed; Installation Pending reads it
  ],
  // Bank details are filled when the bank file is ready (they used to be on File Submission in Bank).
  bankFileReady: [
    { key: "bank", label: "Bank Name", type: "text" },
    { key: "bankBranch", label: "Branch Name", type: "text" },
    { key: "bankQuotation", label: "Quotation Amount", type: "number", currency: true },
    { key: "bankRoute", label: "Route", type: "select", master: "route" }, // dropdown from System Masters > Route (no pre-fill)
    { key: "bankOffice", label: "Office", type: "text" },
    {
      key: "responsiblePerson",
      label: "Responsible Person",
      type: "select",
      // Names are managed in Settings > System Masters > Responsible Person (not hardcoded).
      master: "responsiblePerson",
    },
  ],
  // Cash sheet: "Check for Approval" records the approver, with an optional image (signed register / approval).
  cashApproval: [
    { key: "approver", label: "Approver", type: "select", staff: true }, // dropdown of employees
    { key: "images", label: "Approval Image (optional)", type: "files" },
  ],
  // File Submission in Bank: only the file that was submitted.
  fileSubmission: [{ key: "submissionFiles", label: "Submit File", type: "files", required: true, max: 1 }],
};
