// Extra popup fields for loan steps, shared by the form (client) and the
// validator (server). type: "text" | "number" | "select".
// Required when Status is Done; optional when Not Done.
export const EXTRA_FIELDS = {
  // Installation sheet: "Assign Installer" records the installer's name.
  assignInstaller: [{ key: "installerName", label: "Installer Name", type: "text" }],
  // Cash sheet: "Check for Approval" records the approver (SN - Approver).
  cashApproval: [{ key: "approver", label: "SN - Approver", type: "text" }],
  fileSubmission: [
    { key: "bank", label: "Bank", type: "text" },
    { key: "bankBranch", label: "Branch", type: "text" },
    { key: "bankQuotation", label: "Bank Quotation", type: "number", currency: true },
    {
      key: "responsiblePerson",
      label: "Responsible Person",
      type: "select",
      // Banking team from the design reference (area-wise bank file owners).
      options: ["Alok", "Kishan", "Pankaj", "Mahesh", "Akash"],
    },
  ],
};
