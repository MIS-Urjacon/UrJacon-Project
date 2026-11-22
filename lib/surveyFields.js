// Site Survey (Survey List) questions that come from the owner's survey Google Form, shared by the
// popup (components/steps/SiteSurveyForm.js) and the server validator (lib/validate.js).
// Customer name, contact, village, survey date, surveyor, smart meter and material needed are the
// older fields; BP SC number, address, system, panels etc. are already shown as "Important details".

// One-choice questions: key, label, options, required.
export const SURVEY_CHOICES = [
  { section: "Electrical system", key: "phaseType", label: "Phase Type", options: ["Single Phase", "Three Phase"], required: true },
  { section: "Electrical system", key: "connectionCategory", label: "Connection Category", options: ["Commercial", "Domestic"], required: true },
  { section: "Electrical system", key: "meterType", label: "Meter Type", options: ["Analog", "Digital", "Smart"], required: true },
  { section: "Roof technical evaluation", key: "roofType", label: "Roof Type", options: ["Concrete", "Sheet Roof", "Tiles", "Other"], required: true },
  { section: "Roof technical evaluation", key: "mountingType", label: "Mounting Type", options: ["Sheet Roof", "RCC Structure", "Other"], required: true },
  { section: "Roof technical evaluation", key: "structureSize", label: "Structure Size", options: ["3x5", "4x6", "5x7", "Other (write in surveyor remark)"], required: false },
  { section: "Roof technical evaluation", key: "roofOrientation", label: "Roof Orientation", options: ["North", "South", "East", "West", "Flat"], required: true },
  { section: "Roof technical evaluation", key: "roofCondition", label: "Roof Condition", options: ["Good", "Fair", "Poor"], required: true },
  { section: "Roof technical evaluation", key: "shading", label: "Shading Assessment", options: ["No Shade", "Partial Shade", "Full Shade"], required: true },
  { section: "Roof technical evaluation", key: "accessDetails", label: "Access Details", options: ["Easy", "Moderate", "Difficult"], required: true },
  { section: "Cable distances", key: "ventilation", label: "Inverter Ventilation", options: ["Good", "Limited", "None"], required: true },
  { section: "Cable distances", key: "wifiLan", label: "Wi-Fi / LAN Available at Inverter Location?", options: ["Yes", "No"], required: true },
  { section: "Site logistics & access", key: "vehicleAccess", label: "Vehicle Access to Site", options: ["Easy", "Limited", "Complex"], required: true },
  { section: "Site logistics & access", key: "ladderNeeded", label: "Ladder / Scaffolding Needed?", options: ["Yes", "No"], required: true },
  { section: "Site logistics & access", key: "storageAvailable", label: "Material Storage Available on Site?", options: ["Yes", "No"], required: true },
];

export const SURVEY_MATERIALS = ["Cement", "Gitti", "Balu"];

// Tick-box list: the surveyor confirms each photo was taken.
export const SURVEY_PHOTOS = [
  "Roof top view (showing available panel area)",
  "Roof edges (indicating structural edges)",
  "Shaded areas (showing sources and impact)",
  "Main DB (inside and outside)",
  "Proposed inverter location",
  "Cable route from panel to inverter/DB",
  "Earthing pit location",
];

// Number questions: key, label, required, hint.
export const SURVEY_NUMBERS = [
  { section: "Roof technical evaluation", key: "roofAge", label: "Estimated Roof Age (Years)", required: false },
  { section: "Roof technical evaluation", key: "usableArea", label: "Usable Roof Area (Sqft)", required: true, min: 1 },
  { section: "Cable distances", key: "panelInverterDistance", label: "Panel to Inverter distance (mtr)", required: true, hint: "Single line measurement only for DC cable" },
  { section: "Cable distances", key: "inverterDbDistance", label: "Inverter to DB / Main Board (mtr)", required: true, hint: "Single line measurement only for AC cable" },
  { section: "Cable distances", key: "earthingDistance", label: "Earthing Cable Distance (mtr)", required: true, hint: "Structure to DCDB to Earth + Inverter to Earth + LA to Earth: add all, try to keep it minimum" },
];
