/**
 * Panel Schedule Calculation Service
 * 
 * Generates panel schedules with circuit-wise load distribution,
 * MCCB/MCB sizing, busbar rating, and panel dimension estimation.
 * Compliant with IS 732, IS 8828, IS 13947, and IS 60947.
 */

class PanelScheduleCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Standard MCB/MCCB Ratings (A) ───────────────────────────────────
  static MCB_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63];
  static MCCB_RATINGS = [16, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600];
  static ACB_RATINGS = [630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];

  // ─── Standard Cable Sizes for MCB ratings ─────────────────────────────
  static CABLE_FOR_MCB = {
    6: '1.5 sq mm', 10: '1.5 sq mm', 16: '2.5 sq mm', 20: '4 sq mm',
    25: '4 sq mm', 32: '6 sq mm', 40: '10 sq mm', 50: '10 sq mm', 63: '16 sq mm',
  };

  // ─── Diversity Factors per IS 732 ─────────────────────────────────────
  static DIVERSITY_FACTORS = {
    lighting: { '1-10': 1.0, '11-20': 0.9, '21-50': 0.8, '50+': 0.7 },
    power: { '1-5': 1.0, '6-10': 0.8, '11-20': 0.7, '20+': 0.6 },
    socket: { '1-10': 0.9, '11-20': 0.7, '20+': 0.5 },
    ac: { '1-5': 1.0, '6-10': 0.85, '10+': 0.75 },
    motor: { '1-3': 1.0, '4-6': 0.8, '6+': 0.65 },
  };

  // ─── Panel Types ──────────────────────────────────────────────────────
  static PANEL_TYPES = {
    'SMDB': { description: 'Sub Main Distribution Board', maxWays: 24, enclosure: 'Metal Clad', incomingDevice: 'MCCB' },
    'MDB': { description: 'Main Distribution Board', maxWays: 36, enclosure: 'Metal Clad', incomingDevice: 'ACB/MCCB' },
    'DB': { description: 'Distribution Board', maxWays: 24, enclosure: 'Metal Clad / MCB DB', incomingDevice: 'MCCB/MCB' },
    'MLDB': { description: 'Lighting Distribution Board', maxWays: 24, enclosure: 'MCB DB', incomingDevice: 'MCB' },
    'PDB': { description: 'Power Distribution Board', maxWays: 12, enclosure: 'Metal Clad', incomingDevice: 'MCCB' },
    'EMDB': { description: 'Essential Main Distribution Board', maxWays: 24, enclosure: 'Metal Clad', incomingDevice: 'MCCB' },
    'MCC': { description: 'Motor Control Centre', maxWays: 36, enclosure: 'Metal Clad (IP54)', incomingDevice: 'ACB/MCCB' },
    'PCC': { description: 'Power Control Centre', maxWays: 48, enclosure: 'Metal Clad (IP42)', incomingDevice: 'ACB' },
    'APFC': { description: 'Automatic PF Correction Panel', maxWays: 12, enclosure: 'Metal Clad', incomingDevice: 'MCCB + Contactor' },
  };

  // ─── Busbar Specifications ────────────────────────────────────────────
  static BUSBAR_SIZES = [
    { ratingA: 100, size: '25 × 3mm', material: 'Copper', cccA: 120 },
    { ratingA: 200, size: '25 × 6mm', material: 'Copper', cccA: 220 },
    { ratingA: 400, size: '40 × 6mm', material: 'Copper', cccA: 420 },
    { ratingA: 630, size: '50 × 6mm', material: 'Copper', cccA: 650 },
    { ratingA: 800, size: '60 × 6mm', material: 'Copper', cccA: 830 },
    { ratingA: 1000, size: '80 × 6mm', material: 'Copper', cccA: 1050 },
    { ratingA: 1250, size: '80 × 10mm', material: 'Copper', cccA: 1300 },
    { ratingA: 1600, size: '100 × 10mm', material: 'Copper', cccA: 1650 },
    { ratingA: 2000, size: '2×(80 × 10mm)', material: 'Copper', cccA: 2100 },
    { ratingA: 2500, size: '2×(100 × 10mm)', material: 'Copper', cccA: 2650 },
    { ratingA: 3200, size: '3×(80 × 10mm)', material: 'Copper', cccA: 3300 },
    { ratingA: 4000, size: '3×(100 × 10mm)', material: 'Copper', cccA: 4100 },
  ];

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      panelName = 'DB-01',
      panelType = 'DB',
      voltage = 415,
      phases = 3,
      frequency = 50,
      powerFactor = 0.85,
      circuits = [],
      incomingSupply = null,
    } = params;

    // Calculate each circuit
    const circuitResults = circuits.map((circuit, index) => 
      this.calculateCircuit(circuit, index + 1, voltage, phases, powerFactor)
    );

    // Phase balancing
    const phaseBalance = phases === 3 
      ? this.balancePhases(circuitResults, voltage, powerFactor) 
      : this.singlePhaseTotal(circuitResults);

    // Total load
    const totalConnectedLoad = circuitResults.reduce((sum, c) => sum + c.loadKW, 0);
    const diversifiedLoad = this.applyDiversityFactors(circuitResults);
    const totalCurrentA = this.calculateTotalCurrent(diversifiedLoad, voltage, phases, powerFactor);

    // Incoming device sizing
    const incomingDevice = this.sizeIncomingDevice(totalCurrentA, panelType);

    // Busbar sizing
    const busbar = this.sizeBusbar(incomingDevice.ratingA);

    // Panel dimensions
    const panelDimensions = this.estimatePanelSize(circuitResults.length, panelType, incomingDevice);

    // Earth bus
    const earthBus = this.sizeEarthBus(incomingDevice.ratingA);

    return {
      panelInfo: {
        name: panelName,
        type: panelType,
        description: PanelScheduleCalculator.PANEL_TYPES[panelType]?.description || panelType,
        voltage: `${voltage}V, ${phases}Ph, ${frequency}Hz`,
        enclosure: PanelScheduleCalculator.PANEL_TYPES[panelType]?.enclosure || 'Metal Clad',
      },
      circuits: circuitResults,
      phaseBalance,
      loadSummary: {
        totalConnectedLoadKW: parseFloat(totalConnectedLoad.toFixed(2)),
        diversifiedLoadKW: parseFloat(diversifiedLoad.toFixed(2)),
        diversityFactor: parseFloat((diversifiedLoad / totalConnectedLoad).toFixed(2)),
        totalCurrentA: parseFloat(totalCurrentA.toFixed(1)),
        totalKVA: parseFloat((diversifiedLoad / powerFactor).toFixed(1)),
      },
      incomingDevice,
      busbar,
      earthBus,
      panelDimensions,
    };
  }

  /**
   * Calculate individual circuit
   */
  calculateCircuit(circuit, circuitNo, systemVoltage, systemPhases, systemPF) {
    const {
      name = `Circuit ${circuitNo}`,
      loadType = 'lighting',     // lighting | power | socket | ac | motor | spare
      loadKW = 0,
      quantity = 1,
      phases = 1,                // 1 or 3
      powerFactor = null,
      isSpare = false,
      hasStarter = false,
      starterType = 'DOL',      // DOL | Star-Delta | VFD
      assignedPhase = null,      // R | Y | B | RYB (auto if null)
    } = circuit;

    if (isSpare) {
      return {
        circuitNo,
        name: `SPARE ${circuitNo}`,
        loadType: 'spare',
        loadKW: 0,
        currentA: 0,
        protectionDevice: 'MCB',
        protectionRating: '-',
        cableSize: '-',
        phases: 1,
        assignedPhase: assignedPhase || 'R',
        isSpare: true,
      };
    }

    const totalKW = loadKW * quantity;
    const pf = powerFactor || (loadType === 'motor' ? 0.8 : loadType === 'lighting' ? 0.9 : systemPF);
    const circuitVoltage = phases === 1 ? 230 : systemVoltage;

    // Current calculation
    let currentA;
    if (phases === 1) {
      currentA = (totalKW * 1000) / (circuitVoltage * pf);
    } else {
      currentA = (totalKW * 1000) / (Math.sqrt(3) * circuitVoltage * pf);
    }

    // Motor starting current consideration
    let startingMultiplier = 1;
    if (loadType === 'motor' && hasStarter) {
      startingMultiplier = starterType === 'DOL' ? 6 : starterType === 'Star-Delta' ? 2.5 : 1.5;
    }

    // Protection device sizing (1.25× for continuous loads)
    const designCurrent = currentA * 1.25;
    const { device, rating } = this.sizeProtectionDevice(designCurrent, loadType, phases, hasStarter);

    // Cable sizing
    const cableSize = this.sizeCableForCircuit(rating, phases);

    return {
      circuitNo,
      name,
      loadType,
      loadKW: parseFloat(totalKW.toFixed(2)),
      quantity,
      powerFactor: pf,
      phases,
      currentA: parseFloat(currentA.toFixed(1)),
      startingCurrentA: loadType === 'motor' ? parseFloat((currentA * startingMultiplier).toFixed(1)) : null,
      protectionDevice: device,
      protectionRating: rating,
      cableSize,
      assignedPhase: assignedPhase || (phases === 3 ? 'RYB' : null),
      hasStarter,
      starterType: hasStarter ? starterType : null,
      isSpare: false,
    };
  }

  /**
   * Size protection device (MCB/MCCB)
   */
  sizeProtectionDevice(designCurrentA, loadType, phases, hasStarter) {
    // Motor circuits > 63A get MCCB
    const useMCCB = designCurrentA > 63 || hasStarter;
    const ratings = useMCCB ? PanelScheduleCalculator.MCCB_RATINGS : PanelScheduleCalculator.MCB_RATINGS;
    const rating = ratings.find(r => r >= designCurrentA) || ratings[ratings.length - 1];

    let device;
    if (useMCCB) {
      device = 'MCCB';
    } else {
      // MCB type selection
      if (loadType === 'motor') device = 'MCB Type D';
      else if (loadType === 'lighting') device = 'MCB Type B';
      else device = 'MCB Type C';
    }

    return { device, rating };
  }

  /**
   * Cable size based on protection device rating
   */
  sizeCableForCircuit(protectionRating, phases) {
    const cable = PanelScheduleCalculator.CABLE_FOR_MCB[protectionRating];
    if (cable) return cable;
    // For larger ratings
    if (protectionRating <= 100) return '25 sq mm';
    if (protectionRating <= 160) return '50 sq mm';
    if (protectionRating <= 250) return '95 sq mm';
    if (protectionRating <= 400) return '185 sq mm';
    return '240 sq mm';
  }

  /**
   * Balance load across 3 phases
   */
  balancePhases(circuits, voltage, pf) {
    const phases = { R: [], Y: [], B: [] };
    const phaseNames = ['R', 'Y', 'B'];

    // Separate 3-phase and 1-phase circuits
    const threePhase = circuits.filter(c => c.phases === 3 && !c.isSpare);
    const singlePhase = circuits.filter(c => c.phases === 1 && !c.isSpare);

    // Assign single-phase circuits to balance phases
    const phaseLoads = { R: 0, Y: 0, B: 0 };
    
    // Add 3-phase loads equally to all phases
    for (const circuit of threePhase) {
      const perPhase = circuit.loadKW / 3;
      phaseLoads.R += perPhase;
      phaseLoads.Y += perPhase;
      phaseLoads.B += perPhase;
      phases.R.push({ ...circuit, assignedPhase: 'RYB' });
      phases.Y.push({ ...circuit, assignedPhase: 'RYB' });
      phases.B.push({ ...circuit, assignedPhase: 'RYB' });
    }

    // Auto-assign single-phase (assign to least loaded phase)
    for (const circuit of singlePhase) {
      if (circuit.assignedPhase && phaseNames.includes(circuit.assignedPhase)) {
        // Pre-assigned
        phases[circuit.assignedPhase].push(circuit);
        phaseLoads[circuit.assignedPhase] += circuit.loadKW;
      } else {
        // Auto: assign to least loaded phase
        const minPhase = phaseNames.reduce((min, p) => phaseLoads[p] < phaseLoads[min] ? p : min, 'R');
        phases[minPhase].push({ ...circuit, assignedPhase: minPhase });
        phaseLoads[minPhase] += circuit.loadKW;
      }
    }

    const avgLoad = (phaseLoads.R + phaseLoads.Y + phaseLoads.B) / 3;
    const maxImbalance = Math.max(
      Math.abs(phaseLoads.R - avgLoad),
      Math.abs(phaseLoads.Y - avgLoad),
      Math.abs(phaseLoads.B - avgLoad)
    );
    const imbalancePercent = avgLoad > 0 ? (maxImbalance / avgLoad) * 100 : 0;

    return {
      R: { loadKW: parseFloat(phaseLoads.R.toFixed(2)), currentA: parseFloat((phaseLoads.R * 1000 / (230 * pf)).toFixed(1)), circuits: phases.R.length },
      Y: { loadKW: parseFloat(phaseLoads.Y.toFixed(2)), currentA: parseFloat((phaseLoads.Y * 1000 / (230 * pf)).toFixed(1)), circuits: phases.Y.length },
      B: { loadKW: parseFloat(phaseLoads.B.toFixed(2)), currentA: parseFloat((phaseLoads.B * 1000 / (230 * pf)).toFixed(1)), circuits: phases.B.length },
      balanced: imbalancePercent <= 15,
      imbalancePercent: parseFloat(imbalancePercent.toFixed(1)),
      recommendation: imbalancePercent > 15 ? 'Re-distribute circuits to achieve <15% imbalance' : 'Within acceptable limits',
    };
  }

  /**
   * Single phase total
   */
  singlePhaseTotal(circuits) {
    const total = circuits.reduce((sum, c) => sum + c.loadKW, 0);
    return { totalKW: parseFloat(total.toFixed(2)) };
  }

  /**
   * Apply diversity factors to get diversified load
   */
  applyDiversityFactors(circuits) {
    const grouped = {};
    for (const c of circuits) {
      if (c.isSpare) continue;
      if (!grouped[c.loadType]) grouped[c.loadType] = [];
      grouped[c.loadType].push(c);
    }

    let diversifiedLoad = 0;
    for (const [type, typeCircuits] of Object.entries(grouped)) {
      const count = typeCircuits.length;
      const totalKW = typeCircuits.reduce((sum, c) => sum + c.loadKW, 0);
      const factors = PanelScheduleCalculator.DIVERSITY_FACTORS[type] || PanelScheduleCalculator.DIVERSITY_FACTORS.power;

      let df;
      if (count <= 5) df = parseFloat(Object.values(factors)[0]);
      else if (count <= 10) df = parseFloat(Object.values(factors)[1] || Object.values(factors)[0]);
      else if (count <= 20) df = parseFloat(Object.values(factors)[2] || Object.values(factors)[1]);
      else df = parseFloat(Object.values(factors)[3] || Object.values(factors)[2]);

      diversifiedLoad += totalKW * df;
    }

    return diversifiedLoad;
  }

  /**
   * Calculate total current
   */
  calculateTotalCurrent(loadKW, voltage, phases, pf) {
    if (phases === 1) {
      return (loadKW * 1000) / (230 * pf);
    }
    return (loadKW * 1000) / (Math.sqrt(3) * voltage * pf);
  }

  /**
   * Size incoming device
   */
  sizeIncomingDevice(totalCurrentA, panelType) {
    const designCurrent = totalCurrentA * 1.25;
    const panelSpec = PanelScheduleCalculator.PANEL_TYPES[panelType];
    
    let ratings;
    if (designCurrent > 1600 || panelType === 'PCC') {
      ratings = PanelScheduleCalculator.ACB_RATINGS;
    } else {
      ratings = PanelScheduleCalculator.MCCB_RATINGS;
    }

    const rating = ratings.find(r => r >= designCurrent) || ratings[ratings.length - 1];
    const device = designCurrent > 1600 ? 'ACB' : 'MCCB';

    return {
      device,
      ratingA: rating,
      poles: 4, // TP+N
      breakingCapacity: rating <= 400 ? '36kA' : rating <= 1000 ? '50kA' : '65kA',
    };
  }

  /**
   * Size busbar
   */
  sizeBusbar(incomingRating) {
    const busbar = PanelScheduleCalculator.BUSBAR_SIZES.find(b => b.ratingA >= incomingRating)
      || PanelScheduleCalculator.BUSBAR_SIZES[PanelScheduleCalculator.BUSBAR_SIZES.length - 1];
    
    return {
      mainBus: { size: busbar.size, material: busbar.material, rating: `${busbar.cccA}A` },
      neutralBus: { size: busbar.size, material: busbar.material, note: 'Same as phase bus' },
      earthBus: { size: `${Math.ceil(parseInt(busbar.size) * 0.5)} × ${busbar.size.split('×')[1]?.trim() || '6mm'}`, material: 'Copper', note: '50% of phase bus' },
    };
  }

  /**
   * Size earth bus
   */
  sizeEarthBus(incomingRating) {
    // Per IS 3043: Earth conductor ≥ 50% of phase conductor
    if (incomingRating <= 100) return '25 × 3mm Cu';
    if (incomingRating <= 250) return '25 × 6mm Cu';
    if (incomingRating <= 400) return '40 × 6mm Cu';
    if (incomingRating <= 630) return '50 × 6mm Cu';
    return '60 × 6mm Cu';
  }

  /**
   * Estimate panel physical dimensions
   */
  estimatePanelSize(circuitCount, panelType, incomingDevice) {
    // Height: incoming + circuits + space
    const incomingHeightMM = incomingDevice.device === 'ACB' ? 400 : 200;
    const circuitHeightMM = circuitCount * 45; // 45mm per circuit row
    const spareHeightMM = 200; // space for future
    const totalHeightMM = Math.max(600, incomingHeightMM + circuitHeightMM + spareHeightMM + 100);

    // Round to standard size
    const standardHeights = [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2100];
    const height = standardHeights.find(h => h >= totalHeightMM) || 2100;

    // Width based on panel type
    const width = panelType === 'MCC' || panelType === 'PCC' ? 800 : 
                  incomingDevice.ratingA > 400 ? 600 : 400;

    // Depth
    const depth = incomingDevice.ratingA > 400 ? 300 : 200;

    return {
      heightMM: height,
      widthMM: width,
      depthMM: depth,
      ipRating: panelType === 'MCC' ? 'IP54' : 'IP42',
      material: 'CRCA Sheet (2mm)',
      color: 'RAL 7032 (Pebble Grey)',
      mounting: height > 1200 ? 'Floor Standing' : 'Wall Mounted',
    };
  }
}

export default PanelScheduleCalculator;
