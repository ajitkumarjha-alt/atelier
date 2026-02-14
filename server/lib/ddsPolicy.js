/**
 * DDS Policy Engine
 * Based on Policy 130 (3 Yr 10 M Project Completion Guideline) and
 * Bhandup Neptune MEP DDS reference structure.
 *
 * Auto-generates Design Delivery Schedule items based on:
 * - Project start date
 * - Building height (determines timeline tier)
 * - Number of towers + stagger offset
 * - Floor configuration (podiums, typical, refuge, penthouse, terrace)
 * - New land vs existing development
 * - Basement count
 * - Applicable MEP trades
 */

// ============================================================
// POLICY 130 — Height-based timeline tiers
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
// DDS PHASES — Based on Bhandup Neptune structure
// ============================================================
const DDS_PHASES = {
  DESIGN: 'A - Design Stage',
  TENDER: 'B - Tender',
  VFC: 'C - VFC (Vendor Final Confirmation)',
  DD: 'D - DD (Design Development)',
  SCHEMATIC: 'E - Schematic',
};

// ============================================================
// DESIGN STAGE items — Concept → Schematic → DD
// Each has Architecture → Structure → MEP → Workshop sub-phases
// Week offsets from project start (based on Bhandup Neptune reference)
// ============================================================
const DESIGN_STAGES = [
  {
    name: 'Concept',
    subPhases: [
      { trade: 'Architecture', weekOffset: 5, durationWeeks: 7 },
      { trade: 'Structure', weekOffset: 7, durationWeeks: 2 },
      { trade: 'MEP', weekOffset: 9, durationWeeks: 4 },
      { trade: 'Workshop', weekOffset: 12, durationWeeks: 5 },
    ]
  },
  {
    name: 'Schematic',
    subPhases: [
      { trade: 'Architecture', weekOffset: 14, durationWeeks: 3 },
      { trade: 'Structure', weekOffset: 16, durationWeeks: 2 },
      { trade: 'MEP', weekOffset: 17, durationWeeks: 3 },
      { trade: 'Workshop', weekOffset: 19, durationWeeks: 4 },
    ]
  },
  {
    name: 'Design Development (DD)',
    subPhases: [
      { trade: 'Architecture', weekOffset: 22, durationWeeks: 4 },
      { trade: 'Structure', weekOffset: 25, durationWeeks: 2 },
      { trade: 'MEP', weekOffset: 28, durationWeeks: 6 },
      { trade: 'Workshop', weekOffset: 30, durationWeeks: 7 },
    ]
  },
];

// ============================================================
// MEP TENDER ITEMS — Based on Bhandup Neptune Details-MEP
// weekOffset = policy weeks from project start for T1
// ============================================================
const MEP_TENDER_ITEMS = [
  { name: 'Earthing Tender (Micro Pile)', trade: 'Electrical', weekOffset: 21, durationWeeks: 4 },
  { name: 'Electrical Concealed Tender', trade: 'Electrical', weekOffset: 28, durationWeeks: 6 },
  { name: 'PHE Tender', trade: 'PHE', weekOffset: 36, durationWeeks: 7 },
  { name: 'Fire Fighting Tender', trade: 'Fire Fighting', weekOffset: 35, durationWeeks: 6 },
  { name: 'FAVA Tender', trade: 'FAVA', weekOffset: 39, durationWeeks: 9 },
  { name: 'HVAC Tender', trade: 'HVAC', weekOffset: 42, durationWeeks: 12 },
  { name: 'Security (CCTV, Access Control, Intercom) Tender', trade: 'Security', weekOffset: 43, durationWeeks: 13 },
  { name: 'Electrical Tender', trade: 'Electrical', weekOffset: 35, durationWeeks: 6 },
  { name: 'VDP Tender', trade: 'ELV', weekOffset: 42, durationWeeks: 12 },
  { name: 'IBS & FTTH RFP', trade: 'ELV', weekOffset: 42, durationWeeks: 12 },
  { name: 'Lifts Tender', trade: 'Lifts', weekOffset: 44, durationWeeks: 14 },
  { name: 'Rooftop Solar / Hot Water Tender', trade: 'PHE', weekOffset: 45, durationWeeks: 15 },
  { name: 'Centralized Ventilation Tender', trade: 'HVAC', weekOffset: 40, durationWeeks: 10 },
  { name: 'OWC Tender', trade: 'PHE', weekOffset: 44, durationWeeks: 14 },
  { name: 'STP Tender', trade: 'PHE', weekOffset: 44, durationWeeks: 14 },
  { name: 'WTP Tender', trade: 'PHE', weekOffset: 44, durationWeeks: 14 },
  { name: 'STP & OWC De-Odorization Tender', trade: 'PHE', weekOffset: 45, durationWeeks: 15 },
  { name: 'DG Tender', trade: 'Electrical', weekOffset: 46, durationWeeks: 16 },
  { name: 'PNG Tender', trade: 'PHE', weekOffset: 47, durationWeeks: 17 },
  { name: 'RWH Tender', trade: 'PHE', weekOffset: 48, durationWeeks: 18 },
  { name: 'Swimming Pool Tender', trade: 'PHE', weekOffset: 35, durationWeeks: 5, conditional: 'has_swimming_pool' },
  { name: 'Fitout Tender', trade: 'Interior Design', weekOffset: 50, durationWeeks: 10, conditional: 'has_fitout' },
];

// ============================================================
// VFC FLOOR TYPES — What VFC drawings are needed per level type
// ============================================================
const VFC_LEVEL_TYPES = [
  'Podium',
  'Garden Unit',
  'Typical Floor',
  'Refuge Floor',
  'Penthouse Level',
  'Terrace',
  'OHT Top',
];

// ============================================================
// VFC DRAWING TRADES — Trades that need VFC drawings per level
// Based on VFC Drawing List sheet
// ============================================================
const VFC_DRAWING_TRADES = [
  'Fire Fighting',
  'PHE',
  'HVAC',
  'Lighting',
  'Small Power',
  'Lightning Protection',
  'Containment',
  'FA & PA',
  'ELV',
];

// ============================================================
// DD CALCULATIONS — Per tower, trade-specific calculations
// Based on DD Drawing List sheet Section A
// ============================================================
const DD_CALCULATIONS = [
  { name: 'UGT and OHT Tank Capacity', trade: 'Fire Fighting', docType: 'Calculation' },
  { name: 'Pump Sizing (Flow Rate and Header)', trade: 'Fire Fighting', docType: 'Calculation' },
  { name: 'Pump Header', trade: 'Fire Fighting', docType: 'Calculation' },
  { name: 'UGT and OHT Tank Capacity', trade: 'PHE', docType: 'Calculation' },
  { name: 'Suction Header Sizing', trade: 'PHE', docType: 'Calculation' },
  { name: 'Pump Capacity (Transfer, Booster, Sump)', trade: 'PHE', docType: 'Calculation' },
  { name: 'Transfer Pipe Sizing', trade: 'PHE', docType: 'Calculation' },
  { name: 'Terrace Rain Water Pipe Size', trade: 'PHE', docType: 'Calculation' },
  { name: 'Rain Water Calculation (Pipe Count & Diameter)', trade: 'PHE', docType: 'Calculation' },
  { name: 'Heat Load (HAP & Excel Summary)', trade: 'HVAC', docType: 'Calculation' },
  { name: 'Basement & Pump Room Ventilation (Normal & Smoke Exhaust)', trade: 'HVAC', docType: 'Calculation', conditional: 'has_basement' },
  { name: 'Lift Well Pressurization', trade: 'HVAC', docType: 'Calculation' },
  { name: 'Car Parking Ventilation', trade: 'HVAC', docType: 'Calculation', conditional: 'has_parking' },
  { name: 'Load Calculation (Normal & Emergency Power)', trade: 'Electrical', docType: 'Calculation' },
  { name: 'Cable Schedule & Voltage Drop', trade: 'Electrical', docType: 'Calculation' },
  { name: 'Earthing Strip Sizing', trade: 'Electrical', docType: 'Calculation' },
  { name: 'Lightning Protection Calculation', trade: 'Electrical', docType: 'Calculation' },
  { name: 'Short Circuit Calculation', trade: 'Electrical', docType: 'Calculation' },
  { name: 'Risk Analysis Calculation', trade: 'Electrical', docType: 'Calculation' },
];

// ============================================================
// DD SCHEMATICS — Per tower
// ============================================================
const DD_SCHEMATICS = [
  { name: 'Water Supply Schematic', trade: 'PHE', docType: 'Schematic' },
  { name: 'Drainage Schematic', trade: 'PHE', docType: 'Schematic' },
  { name: 'Rain Water Schematic', trade: 'PHE', docType: 'Schematic' },
  { name: 'Fire Fighting Schematic', trade: 'Fire Fighting', docType: 'Schematic' },
  { name: 'Condensate Drain Schematic', trade: 'HVAC', docType: 'Schematic' },
  { name: 'HVAC Schematic (Staircase, Lift Lobby & Pressurization)', trade: 'HVAC', docType: 'Schematic' },
  { name: 'Electrical SLD', trade: 'Electrical', docType: 'Schematic' },
  { name: 'Earthing Schematic', trade: 'Electrical', docType: 'Schematic' },
  { name: 'Lightning Protection Schematic', trade: 'Electrical', docType: 'Schematic' },
  { name: 'ELV Schematic', trade: 'ELV', docType: 'Schematic' },
  { name: 'FAVA Schematic', trade: 'FAVA', docType: 'Schematic' },
];

// ============================================================
// DD DRAWING TRADES — Coordinate, Builders Work, and trade layouts
// ============================================================
const DD_LAYOUT_CATEGORIES = [
  { category: 'CO Layouts', trade: 'Co-ordinate', trades: ['Co-ordinate'] },
  { category: 'BW Layouts', trade: 'Builders Work', trades: ['Builders Work'] },
  { category: 'HVAC Layouts', trade: 'HVAC', trades: ['HVAC'] },
  { category: 'FF Layouts', trade: 'Fire Fighting', trades: ['Fire Fighting'] },
  { category: 'PHE Layouts', trade: 'PHE', trades: ['PHE'] },
  { category: 'Containment Layouts', trade: 'Containment', trades: ['Containment'] },
  { category: 'Lighting Layouts', trade: 'Lighting', trades: ['Lighting'] },
  { category: 'Small Power Layouts', trade: 'Small Power', trades: ['Small Power'] },
  { category: 'FAVA Layouts', trade: 'FAVA', trades: ['FAVA'] },
  { category: 'ELV Layouts', trade: 'ELV', trades: ['ELV'] },
  { category: 'LPS Layouts', trade: 'Lightning Protection', trades: ['Lightning Protection'] },
];

// ============================================================
// DD FLOOR TYPES for layouts
// ============================================================
const DD_LEVEL_TYPES = [
  'Plinth Level',
  'Stilt/Ground Floor',
  'Typical Floor',
  'Refuge Floor',
  'Terrace Floor',
  'Above Terrace Floor',
];

// ============================================================
// HELPER: Calculate date from project start + week offset
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
// MAIN: Generate all DDS items for a project
// ============================================================
function generateDDSPolicy(config) {
  const {
    projectStartDate,
    buildings = [],            // Array of { id, name, height, floorTypes, towerIndex }
    towerStaggerWeeks = 4,     // Weeks between consecutive towers
    isNewLand = true,
    basementCount = 0,
    hasSwimmingPool = false,
    hasFitout = false,
    hasParking = true,
    consultantOffsetDays = -7, // Consultant DDS dates offset
    ddsType = 'internal',
  } = config;

  const items = [];
  let sortOrder = 0;
  const dateOffset = ddsType === 'consultant' ? consultantOffsetDays : 0;

  // Get highest building height for overall project tier
  const maxHeight = Math.max(...buildings.map(b => b.height || 30), 30);
  const tier = getHeightTier(maxHeight);

  // Policy 130 modifiers
  const heightModifierDays = maxHeight > 120 ? 30 : 0;
  const basementModifierDays = basementCount > 0 ? (75 + (basementCount - 1) * 30) : 0;

  // ---- PHASE A: Design Stage (per building/tower) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const bHeight = building.height || 30;
    const bTier = getHeightTier(bHeight);
    const bHeightMod = bHeight > 120 ? 30 : 0; // extra days for tall buildings

    for (const stage of DESIGN_STAGES) {
      for (const sub of stage.subPhases) {
        sortOrder++;
        const startWeek = sub.weekOffset + staggerWeeks;
        const startDate = addWeeks(projectStartDate, startWeek);
        const endDate = addWeeks(projectStartDate, startWeek + sub.durationWeeks);

        items.push({
          sortOrder,
          buildingId: building.id,
          buildingName: building.name,
          phase: DDS_PHASES.DESIGN,
          section: stage.name,
          itemName: `${building.name} - ${stage.name} - ${sub.trade}`,
          discipline: sub.trade === 'Workshop' ? 'MEP' : sub.trade,
          trade: sub.trade,
          docType: 'Design',
          levelType: null,
          expectedStartDate: addDays(startDate, dateOffset),
          expectedCompletionDate: addDays(endDate, dateOffset + bHeightMod),
          policyWeekOffset: startWeek,
          architectInputDate: sub.trade === 'MEP' || sub.trade === 'Workshop'
            ? addWeeks(projectStartDate, sub.weekOffset + staggerWeeks - 2) : null,
          structureInputDate: sub.trade === 'MEP' || sub.trade === 'Workshop'
            ? addWeeks(projectStartDate, sub.weekOffset + staggerWeeks - 1) : null,
        });
      }
    }
  }

  // ---- PHASE B: MEP Tenders (per building/tower) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;

    for (const tender of MEP_TENDER_ITEMS) {
      // Check conditionals
      if (tender.conditional === 'has_swimming_pool' && !hasSwimmingPool) continue;
      if (tender.conditional === 'has_fitout' && !hasFitout) continue;

      sortOrder++;
      const startWeek = tender.weekOffset + staggerWeeks;
      const startDate = addWeeks(projectStartDate, startWeek);
      const endDate = addWeeks(projectStartDate, startWeek + tender.durationWeeks);

      items.push({
        sortOrder,
        buildingId: building.id,
        buildingName: building.name,
        phase: DDS_PHASES.TENDER,
        section: 'MEP Tenders',
        itemName: `${building.name} - ${tender.name}`,
        discipline: tender.trade,
        trade: tender.trade,
        docType: 'Tender',
        levelType: null,
        expectedStartDate: addDays(startDate, dateOffset),
        expectedCompletionDate: addDays(endDate, dateOffset + heightModifierDays),
        policyWeekOffset: startWeek,
        architectInputDate: null,
        structureInputDate: null,
      });
    }
  }

  // ---- PHASE C: VFC Drawings (per building × level type × trade) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const floorTypes = building.floorTypes || getDefaultFloorTypes(building);

    // VFC base week offset per level type (from Bhandup reference)
    const vfcBaseWeeks = {
      'Podium': 20,
      'Garden Unit': 28,
      'Typical Floor': 28,
      'Refuge Floor': 28,
      'Penthouse Level': 32,
      'Terrace': 36,
      'OHT Top': 40,
    };

    for (const levelType of floorTypes) {
      const baseWeek = (vfcBaseWeeks[levelType] || 28) + staggerWeeks;

      for (const trade of VFC_DRAWING_TRADES) {
        sortOrder++;
        const startDate = addWeeks(projectStartDate, baseWeek);
        // Architecture VFC comes 2 weeks before MEP, Structure 1 week before MEP
        const archInputDate = addWeeks(projectStartDate, baseWeek - 3);
        const structInputDate = addWeeks(projectStartDate, baseWeek - 1);

        items.push({
          sortOrder,
          buildingId: building.id,
          buildingName: building.name,
          phase: DDS_PHASES.VFC,
          section: `VFC - ${levelType}`,
          itemName: `${building.name} - ${levelType} - ${trade} Layout`,
          discipline: trade,
          trade,
          docType: 'Drawing',
          levelType,
          expectedStartDate: addDays(startDate, dateOffset),
          expectedCompletionDate: addDays(addWeeks(projectStartDate, baseWeek + 2), dateOffset + heightModifierDays),
          policyWeekOffset: baseWeek,
          architectInputDate: archInputDate,
          structureInputDate: structInputDate,
        });
      }
    }
  }

  // ---- PHASE D1: DD Calculations (per building) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const ddBaseWeek = 22 + staggerWeeks; // DD starts around week 22

    for (const calc of DD_CALCULATIONS) {
      if (calc.conditional === 'has_basement' && basementCount === 0) continue;
      if (calc.conditional === 'has_parking' && !hasParking) continue;

      sortOrder++;
      items.push({
        sortOrder,
        buildingId: building.id,
        buildingName: building.name,
        phase: DDS_PHASES.DD,
        section: 'Calculations',
        itemName: `${building.name} - ${calc.name}`,
        discipline: calc.trade,
        trade: calc.trade,
        docType: calc.docType,
        levelType: null,
        expectedStartDate: addDays(addWeeks(projectStartDate, ddBaseWeek), dateOffset),
        expectedCompletionDate: addDays(addWeeks(projectStartDate, ddBaseWeek + 6), dateOffset + heightModifierDays),
        policyWeekOffset: ddBaseWeek,
        architectInputDate: null,
        structureInputDate: null,
      });
    }
  }

  // ---- PHASE D2: DD Schematics (per building) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const schematicBaseWeek = 28 + staggerWeeks;

    for (const schema of DD_SCHEMATICS) {
      sortOrder++;
      items.push({
        sortOrder,
        buildingId: building.id,
        buildingName: building.name,
        phase: DDS_PHASES.DD,
        section: 'Schematics',
        itemName: `${building.name} - ${schema.name}`,
        discipline: schema.trade,
        trade: schema.trade,
        docType: schema.docType,
        levelType: null,
        expectedStartDate: addDays(addWeeks(projectStartDate, schematicBaseWeek), dateOffset),
        expectedCompletionDate: addDays(addWeeks(projectStartDate, schematicBaseWeek + 4), dateOffset + heightModifierDays),
        policyWeekOffset: schematicBaseWeek,
        architectInputDate: null,
        structureInputDate: null,
      });
    }
  }

  // ---- PHASE D3: DD Layouts (per building × level type × trade category) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const floorTypes = building.floorTypes || getDefaultDDFloorTypes(building);
    const ddLayoutBaseWeek = 30 + staggerWeeks;

    for (const cat of DD_LAYOUT_CATEGORIES) {
      for (const levelType of floorTypes) {
        sortOrder++;
        const weekOffset = ddLayoutBaseWeek + DD_LEVEL_TYPES.indexOf(levelType);

        items.push({
          sortOrder,
          buildingId: building.id,
          buildingName: building.name,
          phase: DDS_PHASES.DD,
          section: cat.category,
          itemName: `${building.name} - ${cat.trade} Layout - ${levelType}`,
          discipline: cat.trade,
          trade: cat.trade,
          docType: 'Drawing',
          levelType,
          expectedStartDate: addDays(addWeeks(projectStartDate, weekOffset), dateOffset),
          expectedCompletionDate: addDays(addWeeks(projectStartDate, weekOffset + 3), dateOffset + heightModifierDays),
          policyWeekOffset: weekOffset,
          architectInputDate: addWeeks(projectStartDate, weekOffset - 2),
          structureInputDate: addWeeks(projectStartDate, weekOffset - 1),
        });
      }
    }
  }

  // ---- PHASE E: MEP Schematic (SLD with Tender) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const schematicWeek = 44 + staggerWeeks;
    sortOrder++;
    items.push({
      sortOrder,
      buildingId: building.id,
      buildingName: building.name,
      phase: DDS_PHASES.SCHEMATIC,
      section: 'MEP Schematic',
      itemName: `${building.name} - MEP Schematic (SLD with Tender)`,
      discipline: 'MEP',
      trade: 'MEP',
      docType: 'Schematic',
      levelType: null,
      expectedStartDate: addDays(addWeeks(projectStartDate, schematicWeek), dateOffset),
      expectedCompletionDate: addDays(addWeeks(projectStartDate, schematicWeek + 12), dateOffset + heightModifierDays),
      policyWeekOffset: schematicWeek,
      architectInputDate: null,
      structureInputDate: null,
    });
  }

  return {
    items,
    metadata: {
      tier,
      maxHeight,
      heightModifierDays,
      basementModifierDays,
      towerCount: buildings.length,
      towerStaggerWeeks,
      totalItems: items.length,
      phases: {
        design: items.filter(i => i.phase === DDS_PHASES.DESIGN).length,
        tender: items.filter(i => i.phase === DDS_PHASES.TENDER).length,
        vfc: items.filter(i => i.phase === DDS_PHASES.VFC).length,
        dd: items.filter(i => i.phase === DDS_PHASES.DD).length,
        schematic: items.filter(i => i.phase === DDS_PHASES.SCHEMATIC).length,
      },
    },
  };
}

// ============================================================
// HELPERS: Default floor types based on building properties
// ============================================================
function getDefaultFloorTypes(building) {
  const types = ['Typical Floor'];
  if (building.hasPodium || building.podiumCount > 0) types.unshift('Podium');
  types.push('Refuge Floor');
  if (building.height > 60 || building.totalFloors > 15) {
    types.push('Penthouse Level');
  }
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
// DEFAULT POLICY — The complete "For Sale" residential template
// ============================================================
function getDefaultPolicy() {
  return {
    name: 'Policy 130 - 3 Yr 10 Month Completion',
    description: 'Standard DDS policy based on Policy 130 guidelines for marketing project completion within 3 years 10 months',
    version: 12,
    policyNumber: '130',
    heightTiers: HEIGHT_TIERS,
    designStages: DESIGN_STAGES,
    tenderItems: MEP_TENDER_ITEMS,
    vfcDrawingTrades: VFC_DRAWING_TRADES,
    vfcLevelTypes: VFC_LEVEL_TYPES,
    ddCalculations: DD_CALCULATIONS,
    ddSchematics: DD_SCHEMATICS,
    ddLayoutCategories: DD_LAYOUT_CATEGORIES,
    ddLevelTypes: DD_LEVEL_TYPES,
    annexureA: ANNEXURE_A_MILESTONES,
    defaultTowerStaggerWeeks: 4,
    consultantOffsetDays: -7,
  };
}

// ============================================================
// VFC DRAWING LIST — Dynamic floor-wise drawing register per tower
// Generates drawings based on actual building floor data
// ============================================================

// MEP trades that need floor-level VFC drawings
const VFC_TRADES = [
  'Fire Fighting', 'PHE', 'HVAC', 'Lighting', 'Small Power',
  'Lightning Protection', 'Containment', 'FA & PA', 'ELV',
];

// DD layout categories — each generates floor-level drawings per tower
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

// ============================================================
// TRADE-LEVEL APPLICABILITY RULES
// Defines which floor levels each trade's drawings apply to.
// This is the MEP engineering standard applied consistently
// across ALL projects. Modify here → applies everywhere.
//
//   vfc : levels where VFC layout drawings are needed
//   dd  : levels where DD layout drawings are needed
//   If a key is omitted, that trade is not used in that list type.
//
// ENGINEERING RATIONALE (maintained here for reference):
//   LPS  – Air termination layout only on terrace / roof level
//   PHE  – Drainage starts at plinth level, also above terrace
//          for rain water & OHT piping
//   FF   – Sprinkler/hydrant layouts also in basements &
//          above terrace for terrace-level fire systems
//   HVAC – Basement ventilation / smoke exhaust in basements;
//          chiller/AHU on terrace; no plinth drawings
//   Containment – Cable tray routes from basement upward
//   Lighting – Basement lighting required; no plinth
//   Small Power – Not in basements / plinth / above terrace
//   FA & PA – Fire alarm required in basements
//   ELV  – CCTV etc. in basements too
//   Co-ordinate – All levels for services coordination
//   Builders Work – All levels for cutouts & sleeves
//   FAVA – Same as FA & PA (fire alarm & voice evacuation)
// ============================================================

// Standard levels (ordered bottom → top)
const ALL_ABOVE_GROUND = [
  'STILT FLOOR', 'GROUND FLOOR', 'PODIUM LEVEL', 'MEZZANINE FLOOR',
  'GARDEN LEVEL', 'TYPICAL FLOOR', 'REFUGE FLOOR', 'PENTHOUSE LEVEL',
  'TERRACE FLOOR',
];
const ABOVE_TERRACE = ['ROOF LEVEL', 'LIFT MACHINE ROOM', 'OHT LEVEL'];
const BELOW_GROUND = ['BASEMENT', 'PLINTH LEVEL', 'PARKING LEVEL'];

const TRADE_LEVEL_RULES = {
  // ---------- VFC + DD trades ----------
  'Fire Fighting': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  [...ALL_ABOVE_GROUND, ...ABOVE_TERRACE],
  },
  'PHE': {
    vfc: ['PLINTH LEVEL', ...ALL_ABOVE_GROUND],
    dd:  ['PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE],
  },
  'HVAC': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  ['BASEMENT', ...ALL_ABOVE_GROUND],  // basement ventilation layouts
  },
  'Lighting': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  ['BASEMENT', ...ALL_ABOVE_GROUND],
  },
  'Small Power': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  [...ALL_ABOVE_GROUND],
  },
  'Lightning Protection': {
    // LPS layout drawing is only for terrace / roof level
    // (air termination network, down conductors shown on terrace plan)
    vfc: ['TERRACE FLOOR', 'ROOF LEVEL'],
    dd:  ['TERRACE FLOOR', 'ROOF LEVEL'],
  },
  'Containment': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  ['BASEMENT', ...ALL_ABOVE_GROUND],
  },
  'FA & PA': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  ['BASEMENT', ...ALL_ABOVE_GROUND],
  },
  'ELV': {
    vfc: [...ALL_ABOVE_GROUND],
    dd:  ['BASEMENT', ...ALL_ABOVE_GROUND],
  },
  // ---------- DD-only layout trades ----------
  'Co-ordinate': {
    dd: ['BASEMENT', 'PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE],
  },
  'Builders Work': {
    dd: ['BASEMENT', 'PLINTH LEVEL', ...ALL_ABOVE_GROUND, ...ABOVE_TERRACE],
  },
  'FAVA': {
    dd: ['BASEMENT', ...ALL_ABOVE_GROUND],
  },
};

/**
 * Check if a trade's drawing is applicable for a given floor level.
 * @param {string} trade      - Trade name (e.g. 'Lightning Protection')
 * @param {string} level      - Floor level classification (e.g. 'TERRACE FLOOR')
 * @param {'vfc'|'dd'} listType - Drawing list type
 * @returns {boolean}
 */
function isLevelApplicable(trade, level, listType) {
  const rule = TRADE_LEVEL_RULES[trade];
  if (!rule) return true;                     // unknown trade → allow all levels
  const levels = rule[listType];
  if (!levels) return true;                    // no rule for this list type → allow
  return levels.includes(level);
}

// Classify raw floor name → a drawing-level group
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
  // Default — it's a typical numbered floor
  return 'TYPICAL FLOOR';
}

// Build ordered unique drawing levels from actual floor list
function deriveFloorLevels(floors, building) {
  if (!floors || floors.length === 0) {
    // Fallback: generic levels if no floor data
    return [{ level: 'GROUND FLOOR', label: 'Ground Floor' },
            { level: 'TYPICAL FLOOR', label: 'Typical Floor' },
            { level: 'TERRACE FLOOR', label: 'Terrace Floor' }];
  }

  // Sort floors by floor_number
  const sorted = [...floors].sort((a, b) => (a.number || a.floor_number || 0) - (b.number || b.floor_number || 0));

  // Group into drawing levels maintaining order
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

  // Add terrace/roof if building likely has them but no explicit floor entry
  if (!seenLevels.has('TERRACE FLOOR') && !seenLevels.has('ROOF LEVEL')) {
    levelOrder.push({ level: 'TERRACE FLOOR', label: 'Terrace Floor' });
  }

  // Store typical floor count for metadata
  if (levelOrder.length > 0) {
    const typEntry = levelOrder.find(l => l.level === 'TYPICAL FLOOR');
    if (typEntry && typicalFloors.length > 1) {
      typEntry.label = `Typical Floors (${typicalFloors.length} nos - ${typicalFloors[0]} to ${typicalFloors[typicalFloors.length - 1]})`;
    } else if (typEntry && typicalFloors.length === 1) {
      typEntry.label = `Typical Floor (${typicalFloors[0]})`;
    }
  }

  return levelOrder.length > 0 ? levelOrder : [
    { level: 'GROUND FLOOR', label: 'Ground Floor' },
    { level: 'TYPICAL FLOOR', label: 'Typical Floor' },
    { level: 'TERRACE FLOOR', label: 'Terrace Floor' },
  ];
}

// Week offsets per level group for DDS date calculation
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
// GENERATE DRAWING LISTS for a DDS — dynamic per building floors
// Returns { vfcDrawings: [...], ddDrawings: [...] }
// ============================================================

// DD Calculations — standard MEP engineering calculations (not floor-dependent)
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

// DD Schematics — standard MEP schematics (not floor-dependent)
const DD_DRAWING_SCHEMATIC_TEMPLATE = [
  { trade: 'PHE', docType: 'Schematic', description: 'Water Supply Schematic' },
  { trade: 'PHE', docType: 'Schematic', description: 'Drainage Schematic' },
  { trade: 'PHE', docType: 'Schematic', description: 'Rain Water Schematic' },
  { trade: 'Fire Fighting', docType: 'Schematic', description: 'Fire Fighting Schematic' },
  { trade: 'HVAC', docType: 'Schematic', description: 'Condensate Drain Schematic' },
  { trade: 'HVAC', docType: 'Schematic', description: 'HVAC Schematic (Staircase, Lift Lobby & Pressurization)' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Electrical SLD' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Earthing Schematic' },
  { trade: 'Electrical', docType: 'Schematic', description: 'Lightning Protection Schematic' },
  { trade: 'ELV', docType: 'Schematic', description: 'ELV Schematic' },
  { trade: 'FAVA', docType: 'Schematic', description: 'FAVA Schematic' },
];

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

  // ---- VFC Drawing List (per tower, per actual floor group) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const towerLabel = building.name || `Tower-${(building.towerIndex || 0) + 1}`;
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
          description: `${trade} Layout - ${fl.label} - ${towerLabel}`,
          category: 'VFC Layouts',
          ddsDate: addDays(addWeeks(projectStartDate, weekOffset + 2), dateOffset),
          sortOrder: srNo,
        });
      }
    }
  }

  // ---- DD Drawing List (per tower) ----
  for (const building of buildings) {
    const staggerWeeks = (building.towerIndex || 0) * towerStaggerWeeks;
    const towerLabel = building.name || `Tower-${(building.towerIndex || 0) + 1}`;
    const floorLevels = deriveFloorLevels(building.floors || [], building);
    const bHasBasement = hasBasement || (building.basementCount || 0) > 0 || floorLevels.some(l => l.level === 'BASEMENT');
    let srNo = 0;

    // Section A — Calculations (unchanged — these are engineering calcs, not floor-dependent)
    const calcBaseWeek = 22 + staggerWeeks;
    for (const calc of DD_DRAWING_CALC_TEMPLATE) {
      if (calc.conditional === 'has_basement' && !bHasBasement) continue;
      if (calc.conditional === 'has_parking' && !hasParking) continue;
      srNo++;
      ddDrawings.push({
        buildingId: building.id,
        listType: 'DD',
        srNo,
        trade: calc.trade,
        docType: calc.docType,
        tower: towerLabel,
        level: calc.level || '',
        description: `${calc.description} - ${towerLabel}`,
        category: 'A. Calculations',
        ddsDate: addDays(addWeeks(projectStartDate, calcBaseWeek + 6), dateOffset),
        sortOrder: srNo,
      });
    }

    // Section B — Schematics (per tower, not floor-dependent)
    const schBaseWeek = 28 + staggerWeeks;
    for (const sch of DD_DRAWING_SCHEMATIC_TEMPLATE) {
      srNo++;
      ddDrawings.push({
        buildingId: building.id,
        listType: 'DD',
        srNo,
        trade: sch.trade,
        docType: sch.docType,
        tower: towerLabel,
        level: '',
        description: `${sch.description} - ${towerLabel}`,
        category: 'B. Schematics',
        ddsDate: addDays(addWeeks(projectStartDate, schBaseWeek + 4), dateOffset),
        sortOrder: srNo,
      });
    }

    // Sections C-onwards — Layouts per category per actual floor level
    const layoutBaseWeek = 30 + staggerWeeks;
    for (const cat of DD_LAYOUT_CATS) {
      for (let i = 0; i < floorLevels.length; i++) {
        const fl = floorLevels[i];
        if (!isLevelApplicable(cat.trade, fl.level, 'dd')) continue;

        srNo++;
        ddDrawings.push({
          buildingId: building.id,
          listType: 'DD',
          srNo,
          trade: cat.trade,
          docType: 'Drawing',
          tower: towerLabel,
          level: fl.level,
          description: `${cat.trade} Layout - ${fl.label} - ${towerLabel}`,
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
// GENERATE BOQ — Placeholder (will be implemented with a better approach later)
// ============================================================
/* generateBOQ removed — placeholder for future implementation */

/* --- REMOVED generateBOQ function ---

  for (const building of buildings) {
    const towerLabel = building.name || `Tower-${(building.towerIndex || 0) + 1}`;
    const floorCount = building.totalFloors || (building.floors ? building.floors.length : 0) || 1;
    const bHasBasement = hasBasement || (building.basementCount || 0) > 0;
    const bHasLift = building.hasLift !== false; // default true for high-rise
    const bHasPool = (building.poolVolume || 0) > 0;
    const bHasPodium = (building.podiumCount || 0) > 0;

    // --- Earthing ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Earthing', description: `GI Earthing Strip (25x3mm) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Earthing', description: `GI Earth Electrode (Pipe type) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Earthing', description: `Earth Pit Chamber - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Earthing', description: `GI Earth Riser - ${towerLabel}`, unit: 'RM' });

    // --- Electrical (scale with floors) ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Main LT Panel (MDB) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Sub Distribution Board (SDB) - ${towerLabel}`, unit: 'Nos' });
    if (floorCount > 1) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Floor Distribution Board (FDB) x${floorCount} floors - ${towerLabel}`, unit: 'Nos' });
    }
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `DB for Common Area Lighting - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `LT XLPE Power Cable (as per SLD) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `FRLS PVC Insulated Cable - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Cable Tray (Perforated GI) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Conduit (GI/PVC as applicable) - ${towerLabel}`, unit: 'RM' });

    // --- PHE ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `CPVC/PPR Pipe (internal plumbing) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `GI Pipe (Riser) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `SWR/uPVC Pipe (Drainage) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Rain Water Down Take Pipe - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Water Meter (Domestic) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Booster Pump Set - ${towerLabel}`, unit: 'Set' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Transfer Pump Set - ${towerLabel}`, unit: 'Set' });

    // --- Fire Fighting ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `MS ERW Pipe (Riser & Distribution) - ${towerLabel}`, unit: 'RM' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `Fire Hydrant (Landing Valve) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `Hose Reel with Hose - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `Fire Extinguisher (ABC type) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `Fire Pump Set (Electric + Diesel + Jockey) - ${towerLabel}`, unit: 'Set' });
    if (floorCount > 5) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Fire Fighting', description: `Sprinkler Head (Pendent type) - ${towerLabel}`, unit: 'Nos' });
    }

    // --- FAVA ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Addressable Fire Alarm Panel - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Smoke Detector (Addressable) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Heat Detector (Addressable) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Manual Call Point (MCP) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Response Indicator - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `Hooter cum Flasher - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `PA Speaker - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'FAVA', description: `FRLS Cable (FA system) - ${towerLabel}`, unit: 'RM' });

    // --- HVAC (conditional items) ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Staircase Pressurization Fan - ${towerLabel}`, unit: 'Nos' });
    if (bHasLift) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Lift Well Pressurization Fan - ${towerLabel}`, unit: 'Nos' });
    }
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `GI Duct (as per drawing) - ${towerLabel}`, unit: 'Sq.m' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Diffuser / Grille - ${towerLabel}`, unit: 'Nos' });
    if (bHasBasement || hasParking) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Jet Fan (Car Park / Basement Ventilation) - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Axial Flow Fan (Basement Ventilation) - ${towerLabel}`, unit: 'Nos' });
    }
    if (building.applicationType === 'Residential' || building.application_type === 'Residential') {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Split AC provision (condenser platform/piping) - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'HVAC', description: `Refrigerant Copper Pipe Set - ${towerLabel}`, unit: 'RM' });
    }

    // --- Security ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `CCTV IP Camera (Dome) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `CCTV IP Camera (Bullet) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `NVR - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `Video Intercom (Indoor + Outdoor) - ${towerLabel}`, unit: 'Set' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `Access Control System - ${towerLabel}`, unit: 'Set' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Security', description: `CAT6 Cable (CCTV/Intercom) - ${towerLabel}`, unit: 'RM' });

    // --- ELV ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `Data Point (CAT6A) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `TV Point - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `Telephone Point - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `FTTH ONU - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `Network Switch - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'ELV', description: `Fiber Optic Cable - ${towerLabel}`, unit: 'RM' });

    // --- Lifts (conditional) ---
    if (bHasLift || floorCount > 4) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Lifts', description: `Passenger Lift - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Lifts', description: `Service/Stretcher Lift - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Lifts', description: `Lift Car Finishing - ${towerLabel}`, unit: 'Lot' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Lifts', description: `ARD (Automatic Rescue Device) - ${towerLabel}`, unit: 'Nos' });
    }

    // --- DG ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'DG', description: `Diesel Generator Set (as per load calc) - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'DG', description: `ATS Panel - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'DG', description: `DG Exhaust System - ${towerLabel}`, unit: 'Lot' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'DG', description: `Acoustic Enclosure - ${towerLabel}`, unit: 'Lot' });

    // --- STP (typically one per project, but attach to first tower) ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'STP', description: `STP Plant (as per capacity) - ${towerLabel}`, unit: 'Lot' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'STP', description: `STP Blower - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'STP', description: `Sludge Pump - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'STP', description: `uPVC Piping for STP - ${towerLabel}`, unit: 'RM' });

    // --- OWC ---
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'OWC', description: `Organic Waste Converter - ${towerLabel}`, unit: 'Nos' });
    boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'OWC', description: `Collection Bins (Wet/Dry) - ${towerLabel}`, unit: 'Nos' });

    // --- Solar Hot Water (residential) ---
    if (building.applicationType === 'Residential' || building.application_type === 'Residential') {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Solar Hot Water', description: `Solar Collector (ETC type) - ${towerLabel}`, unit: 'Sq.m' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Solar Hot Water', description: `Insulated Storage Tank - ${towerLabel}`, unit: 'Ltr' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Solar Hot Water', description: `Circulation Pump - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Solar Hot Water', description: `Hot Water Piping - ${towerLabel}`, unit: 'RM' });
    }

    // --- Swimming Pool (conditional) ---
    if (bHasPool) {
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Swimming Pool Filtration Plant - ${towerLabel}`, unit: 'Set' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'PHE', description: `Pool Circulation Pump - ${towerLabel}`, unit: 'Nos' });
      boqRows.push({ buildingId: building.id, tower: towerLabel, trade: 'Electrical', description: `Pool Lighting (Underwater) - ${towerLabel}`, unit: 'Nos' });
    }
  }

  return boqRows;
}
--- END REMOVED generateBOQ function --- */

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
