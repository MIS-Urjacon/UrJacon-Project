// System masters: lists of values the business reuses (shared by UI and API).
// `group` is the small heading shown in Settings > System Masters. Only masters that a form
// actually reads are kept.
export const MASTER_TYPES = [
  { key: "branch", label: "Branch" },
  { key: "dealer", label: "Dealer" },
  { key: "liaisoning", label: "Liaisoning" },
  { key: "productCode", label: "Product Code" },
  { key: "bank", label: "Bank" },
  { key: "responsiblePerson", label: "Responsible Person" },
  { key: "installer", label: "Installer" },
  { key: "route", label: "Route" },

  // Lead form
  { key: "brand", label: "Brand", group: "LEAD & QUOTATION" },
];
