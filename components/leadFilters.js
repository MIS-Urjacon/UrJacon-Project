// Filters for the lead pages. Only the data a page actually shows in its table gets a filter. See components/TableFilters.js.
const BP = { key: "bp", label: "BP SC Number", get: (r) => r.bpScNumber };
const CUSTOMER = { key: "customer", label: "Customer Name", get: (r) => r.customerName };
const SOURCE = { key: "source", label: "Source", get: (r) => r.source };
const BRAND = { key: "brand", label: "Brand", get: (r) => r.brand };

// Leads page: Lead (customer), Source and Brand columns (no BP SC Number column).
export const LEAD_FILTERS = [CUSTOMER, SOURCE, BRAND];

// Lead pipeline pages (Call Tracker, Quotation): customer and source are always shown; BP SC Number and Brand only
// when the page has such a column.
export function pipelineFilters(columns) {
  const has = (word) => columns.some((c) => `${c.key} ${c.label}`.toLowerCase().includes(word));
  return [...(has("bp sc") ? [BP] : []), CUSTOMER, SOURCE, ...(has("brand") ? [BRAND] : [])];
}
