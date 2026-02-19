/**
 * DDS Policy Engine — v2 (9-Phase Deliverables Model)
 *
 * Based on:
 *   1. DDS (2).xlsx — Master deliverables template (54 items, 9 phases)
 *   2. Policy 130 v12 — "3 Yr 10 M Project Completion Guideline"
 *   3. Bhandup Neptune MEP DDS — VFC/DD drawing list structure
 *
 * Auto-generates Design Delivery Schedule items based on:
 * - Project start date (MP Start Date = Day 0)
 * - Building height (determines timeline tier from Policy 130 §2)
 * - Number of towers + stagger offset
 * - Floor configuration (basements, podiums, typical, refuge, penthouse, terrace)
 * - New land vs existing development (Annexure A dual timelines)
 * - Conditional features (pool, fitout, etc.)
 *
 * 9 PHASES (from DDS (2).xlsx):
 *   A - Concept           (Design Brief, DBR, Space Planning)
 *   B - Liaison            (Utility Approval, MoEF)
 *   C - SLDs               (PHE, Electrical, ELV, FF, FAVA Schematics)
 *   D - SD                 (SD Package — coordination closure)
 *   E - DD                 (DD Package + Plinth Level)
 *   F - Detailed Calcs     (7 engineering calculations)
 *   G - Builder's Work     (Per floor level, Basement→Terrace)
 *   H - Tender             (17 tender packages)
 *   I - VFCs               (Per floor level, Plinth→Terrace, incl. coordinated dwgs)
 */

// ============================================================
// POLICY 130 — Height-based timeline tiers (§2)
// ============================================================
const HEIGHT_TIERS = [
  { maxHeight: 90,  designMonths: 7,  constructionMonths: 30, totalMonths: 37,  label: '≤90m' },
  { maxHeight: 120, designMonths: 10, constructionMonths: 36, totalMonths: 46,  label: '90-120m' },
  { maxHeight: 150, designMonths: 11, constructionMonths: 40, totalMonths: 51,  label: '120-150m' },
  { maxHeight: 200, designMonths: 12, constructionMonths: 42, totalMonths: 54,  label: '150-200m' },
];

function getHeightTier(heightMeters) {
  for (const tier of HEIGHT_TIERS) {
    if (heightMeters <= tier.maxHeight) return tier;
  }
  return HEIGHT_TIERS[HEIGHT_TIERS.length - 1];
}

// ============================================================
// POLICY 130 — Annexure A milestone days from MP Start
// ============================================================
const ANNEXURE_A_MILESTONES = [
  { key: 'mp_start', name: 'MP Start Date', daysNew: 0, daysExisting: 0, responsibility: 'SLO & Design' },
  { key: 'consultant_appointment', name: 'Appointment of 5 Key Consultants', daysNew: 15, daysExisting: 15, responsibility: 'Design & CPT' },
  { key: 'concept_closure', name: 'Concept Design Closure (Architectural)', daysNew: 90, daysExisting: 75, responsibility: 'Design' },
  { key: 'timeline_signoff', name: 'Detailed Timeline Sign-off (including DDS)', daysNew: 105, daysExisting: 90, responsibility: 'RCEO & RCOO' },
  { key: 'concept_all_packages', name: 'Concept Closure for All Packages/Trades', daysNew: 180, daysExisting: 150, responsibility: 'Design' },
  { key: 'dd_closure', name: 'DD Closure (All Packages) + Budget Handover', daysNew: 290, daysExisting: 260, responsibility: 'Design' },
  { key: 'excavation_package', name: 'Excavation + Shoring Package Issuance', daysNew: 335, daysExisting: 305, responsibility: 'Design' },
  { key: 'excavation_start', name: 'Initiate Excavation (Construction Day 0)', daysNew: 335, daysExisting: 305, responsibility: 'CM' },
  { key: 'formwork_drawings', name: 'Formwork Drawings to Central Team', daysNew: 335, daysExisting: 305, responsibility: 'Design' },
  { key: 'vfc_civil_ground', name: 'VFC for Civil Works up to Ground', daysNew: 350, daysExisting: 320, responsibility: 'Design' },
  { key: 'civil_contractor', name: 'Civil Contractor Appointment', daysNew: 350, daysExisting: 320, responsibility: 'CPT' },
  { key: 'shell_coordination', name: 'Shell Drawings Coordination Closure', daysNew: 365, daysExisting: 335, responsibility: 'Design' },
  { key: 'first_concrete', name: 'First Concrete Pour (Foundation)', daysNew: 380, daysExisting: 350, responsibility: 'CM' },
  { key: 'typical_floor_vfc', name: 'First/Typical Floor VFC Issuance', daysNew: 425, daysExisting: 395, responsibility: 'Design' },
  { key: 'substructure_complete', name: 'Substructure Complete (Plinth Ready)', daysNew: 455, daysExisting: 425, responsibility: 'CM' },
  { key: 'first_habitable_pour', name: 'First Concrete Pour of Habitable Floor', daysNew: 500, daysExisting: 470, responsibility: 'CM' },
];

// ============================================================
// 9-PHASE DDS STRUCTURE (from DDS (2).xlsx)
// ============================================================
const DDS_PHASES = {
  CONCEPT:     'A - Concept',
  LIAISON:     'B - Liaison',
  SLDS:        'C - SLDs',
  SD:          'D - SD (Schematic Design)',
  DD:          'E - DD (Design Development)',
  CALCS:       'F - Detailed Calculations',
  BW:          'G - Builder\'s Work',
  TENDER:      'H - Tender',
  VFC:         'I - VFCs',
};

// ============================================================
// PHASE A: CONCEPT DELIVERABLES (3 items)
// ============================================================
const CONCEPT_ITEMS = [
  {
    srNo: 1, name: 'Design Brief',
    remarks: 'By our team; include all references to key policies',
    scope: 'Project', dependency: 'Area Matrix, Project design brief',
    stakeholders: 'Architect', dayOffsetNew: 15, durationDays: 75,
  },
  {
    srNo: 2, name: 'DBR',
    remarks: 'Include all basic calculations, concept sketches',
    scope: 'Project', dependency: 'Society bifurcation',
    stakeholders: 'Strategy', dayOffsetNew: 30, durationDays: 60,
  },
  {
    srNo: 3, name: 'Space Planning Package',
    remarks: 'Including typical floor and Infra services',
    scope: 'Project', dependency: 'Architecture plan, road section drawing',
    stakeholders: 'Architect', dayOffsetNew: 45, durationDays: 135,
  },
];

// ============================================================
// PHASE B: LIAISON DELIVERABLES (2 items)
// ============================================================
const LIAISON_ITEMS = [
  {
    srNo: 5, name: 'Utility Approval Package',
    remarks: 'FF drawings, Water Calculation + Nos. of Meters, Electrical Load, Sewage drawing, Storm water network',
    scope: 'Project',
    dependency: 'Site Survey layout with identification of tie in points',
    stakeholders: '', dayOffsetNew: 100, durationDays: 55,
  },
  {
    srNo: 4, name: 'MoEF Package',
    remarks: 'As per MoEF checklist and calculation formats',
    scope: 'Project',
    dependency: 'Space Matrix, NOCs, (CFO, SWD, Water Supply, Electrical, Sewer), Liaison Plan',
    stakeholders: 'Liaison', dayOffsetNew: 90, durationDays: 10,
  },
];

// ============================================================
// PHASE C: SLDs (5 items)
// ============================================================
const SLD_ITEMS = [
  { srNo: 6, name: 'PHE Schematics', remarks: '', scope: 'Plant', dependency: 'Section and Elevation plan', stakeholders: 'Architect', dayOffsetNew: 120, durationDays: 30 },
  { srNo: 7, name: 'Electrical Schematics', remarks: '', scope: 'Plant', dependency: 'Section and Elevation plan', stakeholders: 'Architect', dayOffsetNew: 120, durationDays: 30 },
  { srNo: 8, name: 'ELV Schematics', remarks: 'CCTV, Access control, Network Schematic, Boom Barrier, BMS', scope: 'Plant', dependency: 'Section and Elevation plan', stakeholders: 'Architect', dayOffsetNew: 130, durationDays: 30 },
  { srNo: 9, name: 'Fire Fighting Schematics', remarks: '', scope: 'Plant', dependency: 'Section and Elevation plan', stakeholders: 'Architect', dayOffsetNew: 120, durationDays: 30 },
  { srNo: 10, name: 'FAVA Schematics', remarks: '', scope: 'Plant', dependency: 'Section and Elevation plan', stakeholders: 'Architect', dayOffsetNew: 130, durationDays: 30 },
];

// ============================================================
// PHASE D: SD PACKAGE (1 item)
// ============================================================
const SD_ITEMS = [
  {
    srNo: 11, name: 'SD Package',
    remarks: 'Incl. coordination for AC, sprinklers, structural interfaces, space planning closure for non-typical levels. Fit for shell drawing production.',
    scope: 'Plant', dependency: 'Section and Elevation plan',
    stakeholders: 'All stakeholders', dayOffsetNew: 165, durationDays: 45,
  },
];

// ============================================================
// PHASE E: DD PACKAGE (2 items — per building)
// ============================================================
const DD_ITEMS = [
  {
    srNo: 12, name: 'DD Package',
    remarks: 'Including equipment selection',
    scope: 'Plant',
    dependency: '1. Architectural + Structural coordinated R0 1 week after SD closure.\n2. ID package R0 3 weeks after SD closure.\n3. DD Package will be given 6 weeks after SD package',
    stakeholders: 'All stakeholders', dayOffsetNew: 210, durationDays: 80,
  },
  {
    srNo: 13, name: 'DD - Plinth Level',
    remarks: 'Incl Builder\'s Work', scope: 'Plant',
    dependency: 'Structure plinth layout, and arch ground level',
    stakeholders: 'All stakeholders', dayOffsetNew: 250, durationDays: 40,
  },
];

// ============================================================
// PHASE F: DETAILED CALCULATIONS (7 items — per building)
// ============================================================
const CALC_ITEMS = [
  { srNo: 14, name: 'Calc - Pumps and Plant Room', remarks: 'Detailed calcs, incl. pumps of all categories', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 210, durationDays: 60, trade: 'PHE' },
  { srNo: 15, name: 'Calc - Pipe Sizing', remarks: 'Include both pressurised and gravity systems', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 210, durationDays: 60, trade: 'PHE' },
  { srNo: 16, name: 'Calc - Heat Load', remarks: '', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 210, durationDays: 60, trade: 'HVAC' },
  { srNo: 17, name: 'Calc - Mechanical Ventilation', remarks: 'Include all cases, STP ventilation can be added later', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 215, durationDays: 55, trade: 'HVAC' },
  { srNo: 18, name: 'Calc - Voltage Drop, SC, Cable Schedule', remarks: '', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 210, durationDays: 60, trade: 'Electrical' },
  { srNo: 19, name: 'Calc - Earthing', remarks: '', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 220, durationDays: 50, trade: 'Electrical' },
  { srNo: 20, name: 'Calc - Lightning Protection System', remarks: 'Include risk analysis, solution definition and strip sizing', scope: 'Plant', dependency: '', stakeholders: '', dayOffsetNew: 220, durationDays: 50, trade: 'Electrical' },
];

// ============================================================
// PHASE G: BUILDER'S WORK (8 level types — per building)
// ============================================================
const BW_LEVELS = [
  { srNo: 21, level: 'Basement Levels', remarks: 'Incl DD drawings', dependency: 'Changes from other stakeholders (Structure + Architecture)', stakeholders: 'Arch + Structure', dayOffsetNew: 300, durationDays: 45, conditional: 'has_basement' },
  { srNo: 22, level: 'Podium Levels', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 310, durationDays: 40, conditional: 'has_podium' },
  { srNo: 23, level: 'P0 or Ground', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 320, durationDays: 35 },
  { srNo: 24, level: 'Typical Levels', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 330, durationDays: 40 },
  { srNo: 25, level: 'Refuge Levels', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 340, durationDays: 35 },
  { srNo: 26, level: 'Service Level(s)', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 345, durationDays: 30 },
  { srNo: 27, level: 'Penthouse Floors', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 350, durationDays: 35, conditional: 'has_penthouse' },
  { srNo: 28, level: 'Terrace', remarks: 'Incl DD drawings', dependency: 'VFC layout from Structure and architect', stakeholders: '', dayOffsetNew: 360, durationDays: 30 },
];

// ============================================================
// PHASE H: TENDERS (17 items — project-level)
// ============================================================
const TENDER_ITEMS = [
  { srNo: 29, name: 'Lift Tender', scope: 'Project', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 250, durationDays: 60, trade: 'Lifts' },
  { srNo: 30, name: 'Electrical Tender', scope: 'Plant', remarks: 'Conduiting and lightning protection package not to be given', dependency: '', stakeholders: '', dayOffsetNew: 245, durationDays: 45, trade: 'Electrical' },
  { srNo: 31, name: 'PHE Tender', scope: 'Plant', remarks: 'Including solar hot water', dependency: '', stakeholders: '', dayOffsetNew: 252, durationDays: 48, trade: 'PHE' },
  { srNo: 32, name: 'Fire Fighting Tender', scope: 'Plant', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 245, durationDays: 42, trade: 'Fire Fighting' },
  { srNo: 33, name: 'HVAC Tender', scope: 'Plant', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 260, durationDays: 50, trade: 'HVAC' },
  { srNo: 34, name: 'FAVA Tender', scope: 'Plant', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 270, durationDays: 60, trade: 'FAVA' },
  { srNo: 35, name: 'Pumps Tender', scope: 'Plant', remarks: 'RC/PAT route', dependency: '', stakeholders: '', dayOffsetNew: 260, durationDays: 45, trade: 'PHE' },
  { srNo: 36, name: 'Security Tender', scope: 'Plant', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 280, durationDays: 60, trade: 'Security' },
  { srNo: 37, name: 'OWC Tender', scope: 'Project', remarks: 'Standardise and rate contract?', dependency: '', stakeholders: '', dayOffsetNew: 280, durationDays: 30, trade: 'PHE' },
  { srNo: 38, name: 'STP Tender', scope: 'Project', remarks: 'Space design by Safetreat type vendors shall be pro bono', dependency: '', stakeholders: '', dayOffsetNew: 270, durationDays: 45, trade: 'PHE' },
  { srNo: 39, name: 'WTP Tender', scope: 'Project', remarks: 'Standardise and rate contract?', dependency: '', stakeholders: '', dayOffsetNew: 280, durationDays: 30, trade: 'PHE' },
  { srNo: 40, name: 'Odour Control Tender', scope: 'Project', remarks: 'Standardise and rate contract?', dependency: '', stakeholders: '', dayOffsetNew: 285, durationDays: 25, trade: 'PHE' },
  { srNo: 41, name: 'Pools Tender', scope: 'Project', remarks: '', dependency: 'Arch plan section and pool type', stakeholders: '', dayOffsetNew: 260, durationDays: 40, trade: 'PHE', conditional: 'has_swimming_pool' },
  { srNo: 42, name: 'RWH Tender', scope: 'Project', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 290, durationDays: 30, trade: 'PHE' },
  { srNo: 43, name: 'DG Tender', scope: 'Project', remarks: 'RC/PAT route', dependency: '', stakeholders: '', dayOffsetNew: 285, durationDays: 45, trade: 'Electrical' },
  { srNo: 44, name: 'PNG Tender', scope: 'Project', remarks: '', dependency: '3rd party tender', stakeholders: '', dayOffsetNew: 295, durationDays: 30, trade: 'PHE' },
  { srNo: 45, name: 'Substation', scope: 'Project', remarks: '', dependency: '', stakeholders: '', dayOffsetNew: 280, durationDays: 50, trade: 'Electrical' },
];

// ============================================================
// PHASE I: VFCs (9 level types — per building)
// ============================================================
const VFC_LEVELS = [
  { srNo: 46, level: 'Plinth Level', dayOffsetNew: 320, durationDays: 30 },
  { srNo: 47, level: 'Basement Levels', dayOffsetNew: 310, durationDays: 40, conditional: 'has_basement' },
  { srNo: 48, level: 'Podium Levels', dayOffsetNew: 330, durationDays: 30, conditional: 'has_podium' },
  { srNo: 49, level: 'P0 or Ground', dayOffsetNew: 340, durationDays: 25 },
  { srNo: 50, level: 'Typical Levels', dayOffsetNew: 380, durationDays: 45 },
  { srNo: 51, level: 'Refuge Levels', dayOffsetNew: 400, durationDays: 25 },
  { srNo: 52, level: 'Service Level(s)', dayOffsetNew: 410, durationDays: 20 },
  { srNo: 53, level: 'Penthouse Floors', dayOffsetNew: 420, durationDays: 25, conditional: 'has_penthouse' },
  { srNo: 54, level: 'Terrace', dayOffsetNew: 430, durationDays: 20 },
];

// ============================================================
// HELPERS
// ============================================================
function addWeeks(startDate, weeks) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

function addDays(startDate, days) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ============================================================
// MAIN: Generate all DDS items for a project — 9-phase model
// ============================================================
function generateDDSPolicy(config) {
  const {
    projectStartDate,
    buildings = [],
    towerStaggerWeeks = 4,
    isNewLand = true,
    basementCount = 0,
    hasSwimmingPool = false,
    hasFitout = false,
    hasParking = true,
    consultantOffsetDays = -7,
    ddsType = 'internal',
  } = config;

  const items = [];
  let sortOrder = 0;
  const dateOffset = ddsType === 'consultant' ? consultantOffsetDays : 0;

  // Get highest building height for overall project tier
  const maxHeight = Math.max(...buildings.map(b => b.height || 30), 30);
  const tier = getHeightTier(maxHeight);

  // Policy 130 modifiers (Annexure A footnotes)
  const heightModifierDays = maxHeight > 120 ? 30 : 0;
  const basementModifierDays = basementCount > 0 ? (30 * basementCount) : 0;
  const landModifierDays = !isNewLand ? -30 : 0;

  // Helper: get day offset based on new/existing land
  const getDayOffset = (newDays) => {
    const base = isNewLand ? newDays : Math.max(0, newDays - 30);
    return base + heightModifierDays + landModifierDays;
  };

  // Helper: build item object
  const makeItem = (phase, template, buildingOverrides = {}) => {
    sortOrder++;
    const dayStart = getDayOffset(template.dayOffsetNew) + (buildingOverrides.staggerDays || 0);
    const dayEnd = dayStart + template.durationDays;

    return {
      sortOrder,
      buildingId: buildingOverrides.buildingId || null,
      buildingName: buildingOverrides.buildingName || null,
      phase,
      section: phase,
      itemName: buildingOverrides.buildingName
        ? buildingOverrides.buildingName + ' - ' + (template.name || template.level)
        : (template.name || template.level),
      discipline: template.trade || 'MEP',
      trade: template.trade || 'MEP',
      docType: template.docType || 'Deliverable',
      levelType: template.level || null,
      scope: template.scope || 'Plant',
      remarks: template.remarks || '',
      dependencyText: template.dependency || '',
      dependentStakeholders: template.stakeholders || '',
      policyDayOffset: template.dayOffsetNew,
      policyWeekOffset: Math.round(template.dayOffsetNew / 7),
      expectedStartDate: addDays(projectStartDate, dayStart + dateOffset),
      expectedCompletionDate: addDays(projectStartDate, dayEnd + dateOffset),
      architectInputDate: null,
      structureInputDate: null,
    };
  };

  // Helper: check building conditionals
  const checkConditional = (cond, building = {}) => {
    if (!cond) return true;
    if (cond === 'has_swimming_pool') return hasSwimmingPool;
    if (cond === 'has_fitout') return hasFitout;
    if (cond === 'has_basement') return basementCount > 0 || (building.basementCount || 0) > 0;
    if (cond === 'has_podium') return (building.hasPodium) || (building.podiumCount || 0) > 0;
    if (cond === 'has_penthouse') return (building.height || 30) > 60 || (building.totalFloors || 0) > 15;
    return true;
  };

  // ---- PHASE A: Concept (project-level, 3 items) ----
  for (const tmpl of CONCEPT_ITEMS) {
    items.push(makeItem(DDS_PHASES.CONCEPT, tmpl));
  }

  // ---- PHASE B: Liaison (project-level, 2 items) ----
  for (const tmpl of LIAISON_ITEMS) {
    items.push(makeItem(DDS_PHASES.LIAISON, tmpl));
  }

  // ---- PHASE C: SLDs (project-level, 5 items) ----
  for (const tmpl of SLD_ITEMS) {
    items.push(makeItem(DDS_PHASES.SLDS, tmpl));
  }

  // ---- PHASE D: SD Package (project-level, 1 item) ----
  for (const tmpl of SD_ITEMS) {
    items.push(makeItem(DDS_PHASES.SD, tmpl));
  }

  // ---- PHASE E: DD Package (per building) ----
  for (const building of buildings) {
    const staggerDays = (building.towerIndex || 0) * towerStaggerWeeks * 7;
    for (const tmpl of DD_ITEMS) {
      items.push(makeItem(DDS_PHASES.DD, tmpl, {
        buildingId: building.id,
        buildingName: building.name,
        staggerDays,
      }));
    }
  }

  // ---- PHASE F: Detailed Calculations (per building) ----
  for (const building of buildings) {
    const staggerDays = (building.towerIndex || 0) * towerStaggerWeeks * 7;
    for (const tmpl of CALC_ITEMS) {
      items.push(makeItem(DDS_PHASES.CALCS, tmpl, {
        buildingId: building.id,
        buildingName: building.name,
        staggerDays,
      }));
    }
  }

  // ---- PHASE G: Builder's Work (per building x applicable levels) ----
  for (const building of buildings) {
    const staggerDays = (building.towerIndex || 0) * towerStaggerWeeks * 7;
    for (const tmpl of BW_LEVELS) {
      if (!checkConditional(tmpl.conditional, building)) continue;
      items.push(makeItem(DDS_PHASES.BW, {
        ...tmpl,
        name: 'BW - ' + tmpl.level,
        trade: 'Builders Work',
        docType: 'Drawing',
      }, {
        buildingId: building.id,
        buildingName: building.name,
        staggerDays,
      }));
    }
  }

  // ---- PHASE H: Tenders (project-level, conditionally included) ----
  for (const tmpl of TENDER_ITEMS) {
    if (!checkConditional(tmpl.conditional)) continue;
    items.push(makeItem(DDS_PHASES.TENDER, tmpl));
  }

  // ---- PHASE I: VFCs (per building x applicable levels) ----
  for (const building of buildings) {
    const staggerDays = (building.towerIndex || 0) * towerStaggerWeeks * 7;
    for (const tmpl of VFC_LEVELS) {
      if (!checkConditional(tmpl.conditional, building)) continue;

      const archInputDate = addDays(projectStartDate,
        getDayOffset(tmpl.dayOffsetNew) + staggerDays - 14 + dateOffset);
      const structInputDate = addDays(projectStartDate,
        getDayOffset(tmpl.dayOffsetNew) + staggerDays - 7 + dateOffset);

      const item = makeItem(DDS_PHASES.VFC, {
        ...tmpl,
        name: 'VFC - ' + tmpl.level,
        remarks: 'Incl Coordinated Drawing',
        dependency: "2 weeks after release of Architecture VFC's",
        stakeholders: 'Architect',
        trade: 'MEP',
        docType: 'Drawing',
      }, {
        buildingId: building.id,
        buildingName: building.name,
        staggerDays,
      });
      item.architectInputDate = archInputDate;
      item.structureInputDate = structInputDate;
      items.push(item);
    }
  }

  // Build phase counts
  const phaseCounts = {};
  for (const key of Object.values(DDS_PHASES)) {
    phaseCounts[key] = items.filter(i => i.phase === key).length;
  }

  return {
    items,
    metadata: {
      tier,
      maxHeight,
      heightModifierDays,
      basementModifierDays,
      landModifierDays,
      towerCount: buildings.length,
      towerStaggerWeeks,
      totalItems: items.length,
      phases: phaseCounts,
      policyVersion: 12,
      templateSource: 'DDS (2).xlsx + Policy 130 v12',
    },
  };
}

// ============================================================
// DEFAULT POLICY
// ============================================================
function getDefaultPolicy() {
  return {
    name: 'Policy 130 - 3 Yr 10 Month Completion (9-Phase)',
    description: 'Standard DDS policy based on Policy 130 v12 guidelines with 9-phase deliverables model from master template',
    version: 12,
    policyNumber: '130',
    heightTiers: HEIGHT_TIERS,
    phases: DDS_PHASES,
    conceptItems: CONCEPT_ITEMS,
    liaisonItems: LIAISON_ITEMS,
    sldItems: SLD_ITEMS,
    sdItems: SD_ITEMS,
    ddItems: DD_ITEMS,
    calcItems: CALC_ITEMS,
    bwLevels: BW_LEVELS,
    tenderItems: TENDER_ITEMS,
    vfcLevels: VFC_LEVELS,
    annexureA: ANNEXURE_A_MILESTONES,
    defaultTowerStaggerWeeks: 4,
    consultantOffsetDays: -7,
  };
}

// ============================================================
// HELPERS: Floor type defaults (for drawing list generation)
// ============================================================
function getDefaultFloorTypes(building) {
  const types = ['Typical Floor'];
  if (building.hasPodium || building.podiumCount > 0) types.unshift('Podium');
  types.push('Refuge Floor');
  if (building.height > 60 || building.totalFloors > 15) types.push('Penthouse Level');
  types.push('Terrace');
  types.push('OHT Top');
  return types;
}

function getDefaultDDFloorTypes(building) {
  const types = ['Stilt/Ground Floor', 'Typical Floor'];
  if (building.hasPodium || building.podiumCount > 0) types.unshift('Plinth Level');
  types.push('Refuge Floor');
  types.push('Terrace Floor');
  if (building.height > 30) types.push('Above Terrace Floor');
  return types;
}

// ============================================================
// DRAWING LIST — Trade-level applicability rules
// ============================================================
const VFC_TRADES = [
  'Fire Fighting', 'PHE', 'HVAC', 'Lighting', 'Small Power',
  'Lightning Protection', 'Containment', 'FA & PA', 'ELV',
];

const DD_LAYOUT_CATS = [
  { category: 'CO Layouts', trade: 'Co-ordinate' },
  { category: 'BW Layouts', trade: 'Builders Work' },
  { category: 'HVAC Layouts', trade: 'HVAC' },
  { category: 'FF Layouts', trade: 'Fire Fighting' },
  { category: 'PHE Layouts', trade: 'PHE' },
  { category: 'Containment Layouts', trade: 'Containment' },
  { category: 'Lighting Layouts', trade: 'Lighting' },
  { category: 'Small Power Layouts', trade: 'Small Power' },
  { category: 'FAVA Layouts', trade: 'FAVA' },
  { category: 'ELV Layouts', trade: 'ELV' },
  { category: 'LPS Layouts', trade: 'Lightning Protection' },
];

const ALL_ABOVE_GROUND = [
  'STILT FLOOR', 'GROUND FLOOR', 'PODIUM LEVEL', 'MEZZANINE FLOOR',
  'GARDEN LEVEL', 'TYPICAL FLOOR', 'REFUGE FLOOR', 'PENTHOUSE LEVEL',
  'TERRACE FLOOR',
];
const ABOVE_TERRACE = ['ROOF LEVEL', 'LIFT MACHINE ROOM', 'OHT LEVEL'];
const BELOW_GROUND = ['BASEMENT', 'PLINTH LEVEL', 'PARKING LEVEL'];

const TRADE_LEVEL_RULES = {
  'Fire Fighting': { vfc: [...ALL_ABOVE_GROUND], dd: [...ALL_ABOVE_GROUND, ...ABOVE_TERRACE] },
  'PHE':           { vfc: ['PLINTH LEVEL', ...ALL_ABOVE_GROUND], dd: ['PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE] },
  'HVAC':          { vfc: [...ALL_ABOVE_GROUND], dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
  'Lighting':      { vfc: [...ALL_ABOVE_GROUND], dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
  'Small Power':   { vfc: [...ALL_ABOVE_GROUND], dd: [...ALL_ABOVE_GROUND] },
  'Lightning Protection': { vfc: ['TERRACE FLOOR', 'ROOF LEVEL'], dd: ['TERRACE FLOOR', 'ROOF LEVEL'] },
  'Containment':   { vfc: [...ALL_ABOVE_GROUND], dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
  'FA & PA':       { vfc: [...ALL_ABOVE_GROUND], dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
  'ELV':           { vfc: [...ALL_ABOVE_GROUND], dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
  'Co-ordinate':   { dd: ['BASEMENT', 'PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE] },
  'Builders Work': { dd: ['BASEMENT', 'PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE] },
  'FAVA':          { dd: ['BASEMENT', ...ALL_ABOVE_GROUND] },
};

function isLevelApplicable(trade, level, listType) {
  const rule = TRADE_LEVEL_RULES[trade];
  if (!rule) return true;
  const levels = rule[listType];
  if (!levels) return true;
  return levels.includes(level);
}

function classifyFloor(floorName) {
  if (!floorName) return null;
  const n = floorName.toLowerCase().trim();
  if (n.includes('basement') || n.startsWith('b')) return 'BASEMENT';
  if (n.includes('plinth')) return 'PLINTH LEVEL';
  if (n.includes('podium')) return 'PODIUM LEVEL';
  if (n.includes('stilt')) return 'STILT FLOOR';
  if (n === 'gnd' || n === 'ground' || n === 'gf' || n.includes('ground floor')) return 'GROUND FLOOR';
  if (n.includes('refuge')) return 'REFUGE FLOOR';
  if (n.includes('terrace') || n === 'terr') return 'TERRACE FLOOR';
  if (n.includes('roof')) return 'ROOF LEVEL';
  if (n.includes('lmr') || n.includes('machine room')) return 'LIFT MACHINE ROOM';
  if (n.includes('oht') || n.includes('overhead')) return 'OHT LEVEL';
  if (n.includes('penthouse') || n.includes('pent house')) return 'PENTHOUSE LEVEL';
  if (n.includes('garden')) return 'GARDEN LEVEL';
  if (n.includes('mezzanine') || n === 'mezz') return 'MEZZANINE FLOOR';
  if (n.includes('parking')) return 'PARKING LEVEL';
  return 'TYPICAL FLOOR';
}

function deriveFloorLevels(floors, building) {
  if (!floors || floors.length === 0) {
    return [
      { level: 'GROUND FLOOR', label: 'Ground Floor' },
      { level: 'TYPICAL FLOOR', label: 'Typical Floor' },
      { level: 'TERRACE FLOOR', label: 'Terrace Floor' },
    ];
  }

  const sorted = [...floors].sort((a, b) => (a.number || a.floor_number || 0) - (b.number || b.floor_number || 0));
  const levelOrder = [];
  const seenLevels = new Set();
  const typicalFloors = [];

  for (const floor of sorted) {
    const fname = floor.name || floor.floor_name || '';
    const classified = classifyFloor(fname);
    if (!classified) continue;

    if (classified === 'TYPICAL FLOOR') {
      typicalFloors.push(fname);
      if (!seenLevels.has('TYPICAL FLOOR')) {
        seenLevels.add('TYPICAL FLOOR');
        levelOrder.push({ level: 'TYPICAL FLOOR', label: 'Typical Floor' });
      }
    } else if (!seenLevels.has(classified)) {
      seenLevels.add(classified);
      levelOrder.push({ level: classified, label: classified.replace(/\b\w/g, c => c.toUpperCase()).replace(/ Level| Floor/gi, m => m.toLowerCase()) });
    }
  }

  if (!seenLevels.has('TERRACE FLOOR') && !seenLevels.has('ROOF LEVEL')) {
    levelOrder.push({ level: 'TERRACE FLOOR', label: 'Terrace Floor' });
  }

  if (levelOrder.length > 0) {
    const typEntry = levelOrder.find(l => l.level === 'TYPICAL FLOOR');
    if (typEntry && typicalFloors.length > 1) {
      typEntry.label = 'Typical Floors (' + typicalFloors.length + ' nos - ' + typicalFloors[0] + ' to ' + typicalFloors[typicalFloors.length - 1] + ')';
    } else if (typEntry && typicalFloors.length === 1) {
      typEntry.label = 'Typical Floor (' + typicalFloors[0] + ')';
    }
  }

  return levelOrder.length > 0 ? levelOrder : [
    { level: 'GROUND FLOOR', label: 'Ground Floor' },
    { level: 'TYPICAL FLOOR', label: 'Typical Floor' },
    { level: 'TERRACE FLOOR', label: 'Terrace Floor' },
  ];
}

function getLevelWeekOffset(level, staggerWeeks) {
  const base = {
    'BASEMENT': 12, 'PLINTH LEVEL': 18, 'PODIUM LEVEL': 20,
    'STILT FLOOR': 22, 'GROUND FLOOR': 24, 'MEZZANINE FLOOR': 26,
    'GARDEN LEVEL': 26, 'PARKING LEVEL': 16,
    'TYPICAL FLOOR': 28, 'REFUGE FLOOR': 30,
    'PENTHOUSE LEVEL': 34, 'TERRACE FLOOR': 36,
    'ROOF LEVEL': 38, 'OHT LEVEL': 38, 'LIFT MACHINE ROOM': 38,
  };
  return (base[level] || 28) + staggerWeeks;
}

// ============================================================
// DD Drawing list templates
// ============================================================
const DD_DRAWING_CALC_TEMPLATE = [
  { trade: 'Fire Fighting', docType: 'Calculation', level: '', description: 'UGT & OHT Tank Capacity' },
  { trade: 'Fire Fighting', docType: 'Calculation', level: '', description: 'Pump Sizing (Flow Rate & Header)' },
  { trade: 'Fire Fighting', docType: 'Calculation', level: '', description: 'Pump Header Sizing' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'UGT & OHT Tank Capacity' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'Suction Header Sizing' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'Pump Capacity (Transfer, Booster, Sump)' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'Transfer Pipe Sizing' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'Terrace Rain Water Pipe Sizing' },
  { trade: 'PHE', docType: 'Calculation', level: '', description: 'Rain Water Calculation (Pipe Count & Diameter)' },
  { trade: 'HVAC', docType: 'Calculation', level: '', description: 'Heat Load Calculation (HAP & Summary)' },
  { trade: 'HVAC', docType: 'Calculation', level: '', description: 'Basement & Pump Room Ventilation (Normal & Smoke Exhaust)', conditional: 'has_basement' },
  { trade: 'HVAC', docType: 'Calculation', level: '', description: 'Lift Well Pressurization' },
  { trade: 'HVAC', docType: 'Calculation', level: '', description: 'Car Parking Ventilation Calculation', conditional: 'has_parking' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Load Calculation (Normal & Emergency Power)' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Cable Schedule & Voltage Drop' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Earthing Strip Sizing' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Lightning Protection Calculation' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Short Circuit Calculation' },
  { trade: 'Electrical', docType: 'Calculation', level: '', description: 'Risk Analysis Calculation' },
];

const DD_DRAWING_SCHEMATIC_TEMPLATE = [
  { trade: 'PHE', docType: 'Schematic', description: 'Water Supply Schematic' },
  { trade: 'PHE', docType: 'Schematic', description: 'Drainage Schematic' },
  { trade: 'PHE', docType: 'Schematic', description: 'Rain Water Schematic' },
  { trade: 'Fire Fighting', docType: 'Schematic', description: 'Fire Fighting Schematic' },
  { trade: 'HVAC', docType: 'Schematic', description: 'HVAC Schematic (Staircase, Lift Lobby & Pressurization)' },
  { trade: 'HVAC', docType: 'Schematic', description: 'Condensate Drain Schematic' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Electrical SLD' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Earthing Schematic' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Lightning Protection Schematic' },
  { trade: 'ELV', docType: 'Schematic', description: 'ELV Schematic' },
  { trade: 'FAVA', docType: 'Schematic', description: 'FAVA Schematic' },
];

// ============================================================
// GENERATE DRAWING LISTS — VFC + DD
// ============================================================
function generateDrawingLists(config) {
  const {
    buildings = [],
    projectStartDate,
    towerStaggerWeeks = 4,
    hasBasement = false,
    hasParking = true,
    ddsType = 'internal',
  } = config;

  const vfcDrawings = [];
  const ddDrawings = [];
  const dateOffset = ddsType === 'consultant' ? -7 : 0;

  // ---- VFC Drawing List ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const towerLabel = building.name || ('Tower-' + ((building.towerIndex || 0) + 1));
    const floorLevels = deriveFloorLevels(building.floors || [], building);
    let srNo = 0;

    for (const trade of VFC_TRADES) {
      for (const fl of floorLevels) {
        if (!isLevelApplicable(trade, fl.level, 'vfc')) continue;
        srNo++;
        const weekOffset = getLevelWeekOffset(fl.level, staggerWeeks);
        vfcDrawings.push({
          buildingId: building.id,
          listType: 'VFC',
          srNo,
          trade,
          docType: 'Drawing',
          tower: towerLabel,
          level: fl.level,
          description: trade + ' Layout - ' + fl.label + ' - ' + towerLabel,
          category: 'VFC Layouts',
          ddsDate: addDays(addWeeks(projectStartDate, weekOffset + 2), dateOffset),
          sortOrder: srNo,
        });
      }
    }
  }

  // ---- DD Drawing List ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const towerLabel = building.name || ('Tower-' + ((building.towerIndex || 0) + 1));
    const floorLevels = deriveFloorLevels(building.floors || [], building);
    const bHasBasement = hasBasement || (building.basementCount || 0) > 0 || floorLevels.some(l => l.level === 'BASEMENT');
    let srNo = 0;

    // Section A — Calculations
    const calcBaseWeek = 22 + staggerWeeks;
    for (const calc of DD_DRAWING_CALC_TEMPLATE) {
      if (calc.conditional === 'has_basement' && !bHasBasement) continue;
      if (calc.conditional === 'has_parking' && !hasParking) continue;
      srNo++;
      ddDrawings.push({
        buildingId: building.id, listType: 'DD', srNo,
        trade: calc.trade, docType: calc.docType, tower: towerLabel,
        level: calc.level || '', description: calc.description + ' - ' + towerLabel,
        category: 'A. Calculations',
        ddsDate: addDays(addWeeks(projectStartDate, calcBaseWeek + 6), dateOffset),
        sortOrder: srNo,
      });
    }

    // Section B — Schematics
    const schBaseWeek = 28 + staggerWeeks;
    for (const sch of DD_DRAWING_SCHEMATIC_TEMPLATE) {
      srNo++;
      ddDrawings.push({
        buildingId: building.id, listType: 'DD', srNo,
        trade: sch.trade, docType: sch.docType, tower: towerLabel,
        level: '', description: sch.description + ' - ' + towerLabel,
        category: 'B. Schematics',
        ddsDate: addDays(addWeeks(projectStartDate, schBaseWeek + 4), dateOffset),
        sortOrder: srNo,
      });
    }

    // Sections C-onwards — Layouts per category per floor level
    const layoutBaseWeek = 30 + staggerWeeks;
    for (const cat of DD_LAYOUT_CATS) {
      for (let i = 0; i < floorLevels.length; i++) {
        const fl = floorLevels[i];
        if (!isLevelApplicable(cat.trade, fl.level, 'dd')) continue;
        srNo++;
        ddDrawings.push({
          buildingId: building.id, listType: 'DD', srNo,
          trade: cat.trade, docType: 'Drawing', tower: towerLabel,
          level: fl.level, description: cat.trade + ' Layout - ' + fl.label + ' - ' + towerLabel,
          category: cat.category,
          ddsDate: addDays(addWeeks(projectStartDate, layoutBaseWeek + i + 3), dateOffset),
          sortOrder: srNo,
        });
      }
    }
  }

  return { vfcDrawings, ddDrawings };
}

// ============================================================
// EXPORTS
// ============================================================
export {
  generateDDSPolicy,
  generateDrawingLists,
  getDefaultPolicy,
  getHeightTier,
  HEIGHT_TIERS,
  DDS_PHASES,
  ANNEXURE_A_MILESTONES,
  addWeeks,
  addDays,
};
