const value = (input) => (input ?? "").toString().trim();

export function quotationVersion(lead) {
  return Math.max(0, Number(lead?.quotationRevision) || 0);
}

export function quotationNumber(lead) {
  const base = value(lead?.quotationReference);
  const revision = quotationVersion(lead);
  return revision > 0 ? `${base}/R${revision}` : base;
}

export function quotationSnapshot(lead, overrides = {}) {
  const revision = quotationVersion(lead);
  return {
    revision,
    number: quotationNumber(lead),
    reference: value(lead.quotationReference),
    revisionReason: value(lead.quotationRevisionReason),
    status: overrides.status ?? lead.quotationStatus ?? "draft",
    createdAt: lead.quotationCreatedAt ?? "",
    sentAt: overrides.sentAt ?? lead.quotationSentAt ?? "",
    sentBy: overrides.sentBy ?? lead.quotationSentBy ?? "",
    customerName: value(lead.customerName),
    mobile: value(lead.mobile),
    email: value(lead.email),
    address: value(lead.address),
    village: value(lead.village),
    state: value(lead.state),
    entity: value(lead.quotationEntity),
    systemType: value(lead.quotationSystemType),
    dcrType: value(lead.quotationDcrType),
    gridType: value(lead.quotationGridType),
    kwWanted: Number(lead.kwWanted) || 0,
    price: Number(lead.dealAmount) || 0,
    subsidy: Number(lead.quotationSubsidy) || 0,
    productCode: value(lead.productCode),
    paymentMode: value(lead.paymentMode),
    validityDays: Math.max(1, Number(lead.quotationValidityDays) || 15),
    notes: value(lead.quotationNotes),
    terms: value(lead.quotationTerms),
    files: Array.isArray(lead.quotationFiles) ? lead.quotationFiles.slice(0, 3) : [],
  };
}

export function withQuotationSnapshot(lead, overrides = {}) {
  const snapshot = quotationSnapshot(lead, overrides);
  const revisions = Array.isArray(lead.quotationRevisions) ? lead.quotationRevisions : [];
  return [
    ...revisions.filter((item) => Number(item?.revision) !== snapshot.revision),
    snapshot,
  ].sort((a, b) => Number(a.revision) - Number(b.revision));
}
