/**
 * Earthing & Lightning Protection Calculation Service
 * 
 * Performs earthing system design per IS 3043 and lightning protection 
 * per IS/IEC 62305. Includes risk assessment, earth electrode sizing,
 * rolling sphere method, and down conductor routing.
 */

class EarthingLightningCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Soil Resistivity values (Ω·m) ────────────────────────────────────
  static SOIL_RESISTIVITY = {
    'Clay (wet)': 10,
    'Clay (dry)': 100,
    'Loam': 50,
    'Sand (wet)': 200,
    'Sand (dry)': 1000,
    'Gravel': 300,
    'Limestone': 500,
    'Rock (granite)': 2000,
    'Murram/Laterite': 150,
    'Black cotton soil': 30,
    'Alluvial soil': 50,
    'Red soil': 100,
  };

  // ─── Earth Electrode Materials per IS 3043 ─────────────────────────────
  static ELECTRODE_TYPES = {
    'CI Pipe (40mm dia)': { diameter: 0.04, minLength: 2.5, resistanceFormula: 'rod', material: 'Cast Iron' },
    'CI Pipe (50mm dia)': { diameter: 0.05, minLength: 2.5, resistanceFormula: 'rod', material: 'Cast Iron' },
    'GI Pipe (40mm dia)': { diameter: 0.04, minLength: 2.5, resistanceFormula: 'rod', material: 'Galvanized Iron' },
    'Copper Rod (16mm dia)': { diameter: 0.016, minLength: 3.0, resistanceFormula: 'rod', material: 'Copper' },
    'Copper Rod (20mm dia)': { diameter: 0.020, minLength: 3.0, resistanceFormula: 'rod', material: 'Copper' },
    'GI Strip (600×600mm)': { width: 0.6, height: 0.6, resistanceFormula: 'plate', material: 'Galvanized Iron' },
    'Copper Plate (600×600mm)': { width: 0.6, height: 0.6, resistanceFormula: 'plate', material: 'Copper' },
    'Copper Plate (900×900mm)': { width: 0.9, height: 0.9, resistanceFormula: 'plate', material: 'Copper' },
    'Chemical Earthing (maintenance-free)': { diameter: 0.063, minLength: 3.0, resistanceFormula: 'chemical', material: 'Copper with backfill' },
  };

  // ─── Lightning Protection Levels per IEC 62305-1 ─────────────────────
  static LP_LEVELS = {
    I:   { rollingSphereRadius: 20, meshSize: 5,  downConductorSpacing: 10, collectionEfficiency: 0.99 },
    II:  { rollingSphereRadius: 30, meshSize: 10, downConductorSpacing: 10, collectionEfficiency: 0.97 },
    III: { rollingSphereRadius: 45, meshSize: 15, downConductorSpacing: 15, collectionEfficiency: 0.91 },
    IV:  { rollingSphereRadius: 60, meshSize: 20, downConductorSpacing: 20, collectionEfficiency: 0.84 },
  };

  // ─── Conductor sizes per IS 3043 / IEC 62305 ─────────────────────────
  static CONDUCTOR_SIZES = {
    'Down Conductor (GI Strip)': { material: 'GI', crossSection: 50, dimensions: '25mm × 3mm' },
    'Down Conductor (GI Round)': { material: 'GI', crossSection: 50, dimensions: '8mm dia' },
    'Down Conductor (Copper Strip)': { material: 'Copper', crossSection: 50, dimensions: '25mm × 3mm' },
    'Down Conductor (Copper Round)': { material: 'Copper', crossSection: 50, dimensions: '8mm dia' },
    'Air Termination (GI)': { material: 'GI', crossSection: 50, dimensions: '25mm × 3mm strip / 8mm dia rod' },
    'Air Termination (Copper)': { material: 'Copper', crossSection: 50, dimensions: '25mm × 3mm strip / 8mm dia rod' },
    'Earth Bus (Copper)': { material: 'Copper', crossSection: 200, dimensions: '50mm × 6mm' },
    'Equipment Earthing (Copper)': { material: 'Copper', crossSection: 25, dimensions: '25mm × 3mm' },
  };

  // ─── Keraunic Level (thunderstorm days/year) for Indian cities ────────
  static KERAUNIC_LEVELS = {
    MUMBAI: 40, PUNE: 35, DELHI: 30, BANGALORE: 60, CHENNAI: 50,
    HYDERABAD: 45, KOLKATA: 70, AHMEDABAD: 25, JAIPUR: 20, LUCKNOW: 40,
    DEFAULT: 40,
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      buildingLength = 50,           // m
      buildingWidth = 20,            // m
      buildingHeight = 30,           // m
      soilType = 'Loam',
      measuredResistivity = null,    // Ω·m (override if soil test done)
      electrodeType = 'Copper Rod (16mm dia)',
      targetResistance = 2,          // Ω (IS 3043: ≤2Ω for LT systems, ≤1Ω for LPS)
      faultCurrentA = 5000,          // A (prospective earth fault current)
      faultDurationS = 1.0,          // s
      city = 'MUMBAI',
      buildingType = 'RESIDENTIAL',
      lpLevel = 'III',               // Lightning protection level I-IV
      hasExplosives = false,
      hasSensitiveEquipment = false,
      numberOfTransformers = 1,
    } = params;

    const soilResistivity = measuredResistivity || EarthingLightningCalculator.SOIL_RESISTIVITY[soilType] || 100;

    // 1. Earthing system design
    const earthingDesign = this.calculateEarthing(
      soilResistivity, electrodeType, targetResistance, faultCurrentA, faultDurationS, numberOfTransformers
    );

    // 2. Lightning risk assessment
    const riskAssessment = this.calculateRiskAssessment(
      buildingLength, buildingWidth, buildingHeight, city, buildingType, hasExplosives, hasSensitiveEquipment
    );

    // 3. Lightning protection design
    const lightningProtection = this.calculateLightningProtection(
      buildingLength, buildingWidth, buildingHeight, lpLevel
    );

    // 4. Surge protection requirements
    const surgeProtection = this.calculateSurgeProtection(buildingType, hasSensitiveEquipment);

    return {
      siteConditions: {
        soilType,
        soilResistivity,
        city,
        buildingType,
        buildingDimensions: `${buildingLength}m × ${buildingWidth}m × ${buildingHeight}m`,
      },
      earthingDesign,
      riskAssessment,
      lightningProtection,
      surgeProtection,
    };
  }

  /**
   * Design earthing system per IS 3043
   */
  calculateEarthing(resistivity, electrodeType, targetResistance, faultCurrent, faultDuration, numberOfTransformers) {
    const electrode = EarthingLightningCalculator.ELECTRODE_TYPES[electrodeType]
      || EarthingLightningCalculator.ELECTRODE_TYPES['Copper Rod (16mm dia)'];

    // Single electrode resistance
    let singleElectrodeResistance;
    if (electrode.resistanceFormula === 'rod') {
      // R = ρ/(2πL) × ln(4L/d) for vertical rod
      const L = electrode.minLength;
      const d = electrode.diameter;
      singleElectrodeResistance = (resistivity / (2 * Math.PI * L)) * Math.log(4 * L / d);
    } else if (electrode.resistanceFormula === 'plate') {
      // R = ρ / (4 × √(A/π)) for plate electrode
      const A = electrode.width * electrode.height;
      singleElectrodeResistance = resistivity / (4 * Math.sqrt(A / Math.PI));
    } else {
      // Chemical earthing — typically 50% lower resistance
      const L = electrode.minLength;
      const d = electrode.diameter;
      singleElectrodeResistance = (resistivity / (2 * Math.PI * L)) * Math.log(4 * L / d) * 0.5;
    }

    // Number of electrodes (in parallel, assuming spacing > 2×length for no coupling)
    // R_total = R_single / n (simplified, ignoring coupling)
    const couplingFactor = 0.85; // accounts for electrode interaction
    const numberOfElectrodes = Math.ceil(
      (singleElectrodeResistance * couplingFactor) / targetResistance
    );

    const achievedResistance = (singleElectrodeResistance * couplingFactor) / numberOfElectrodes;

    // Earth conductor sizing per IS 3043 cl. 11
    // Min area = I × √t / k (similar to cable short circuit)
    const k = electrode.material.includes('Copper') ? 159 : 78; // k factor
    const minConductorArea = (faultCurrent * Math.sqrt(faultDuration)) / k;
    const standardConductorSizes = [16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
    const selectedConductorArea = standardConductorSizes.find(s => s >= minConductorArea) || 25;

    // Earthing requirements per IS 3043
    const earthPitDepth = electrode.resistanceFormula === 'plate' ? 2.0 : 0.5;
    const earthPitSpacing = electrode.minLength * 2; // minimum spacing between electrodes

    // Additional earth electrodes for transformers
    const transformerEarths = numberOfTransformers * 2; // 2 earth pits per transformer (body + neutral)

    return {
      electrode: {
        type: electrodeType,
        material: electrode.material,
        length: electrode.minLength,
      },
      soilResistivity: resistivity,
      singleElectrodeResistance: parseFloat(singleElectrodeResistance.toFixed(2)),
      targetResistance,
      numberOfElectrodes: Math.max(numberOfElectrodes, 2), // minimum 2
      achievedResistance: parseFloat(achievedResistance.toFixed(2)),
      compliant: achievedResistance <= targetResistance,
      earthConductor: {
        minAreaSqMM: parseFloat(minConductorArea.toFixed(1)),
        selectedAreaSqMM: selectedConductorArea,
        material: electrode.material.includes('Copper') ? 'Copper' : 'GI',
      },
      earthPitDetails: {
        depthM: earthPitDepth,
        spacingM: earthPitSpacing,
        backfillMaterial: electrode.resistanceFormula === 'chemical' ? 'Chemical compound (maintenance-free)' : 'Charcoal + Salt + Sand',
        backfillQuantity: electrode.resistanceFormula === 'chemical' ? 'Pre-filled' : '10kg charcoal + 5kg salt per pit',
      },
      transformerEarths,
      totalEarthPits: numberOfElectrodes + transformerEarths,
      earthBusBar: {
        material: 'Copper',
        size: '50mm × 6mm',
        location: 'Main switchboard room',
      },
    };
  }

  /**
   * Lightning risk assessment per IEC 62305-2
   */
  calculateRiskAssessment(length, width, height, city, buildingType, hasExplosives, hasSensitiveEquipment) {
    const Ng = (EarthingLightningCalculator.KERAUNIC_LEVELS[city.toUpperCase()] || 40) * 0.04; // Flash density per km²/year
    
    // Collection area (equivalent, for isolated structure)
    const Ad = (length * width) + (2 * length * height) + (2 * width * height) + (Math.PI * height * height);
    const AdKm2 = Ad / 1e6;

    // Annual frequency of direct lightning strikes
    const Nd = Ng * AdKm2 * 1; // Cd = 1 for isolated

    // Tolerable frequency
    let Nc;
    if (hasExplosives) {
      Nc = 1e-5;
    } else if (hasSensitiveEquipment) {
      Nc = 1e-4;
    } else if (buildingType === 'RESIDENTIAL') {
      Nc = 1e-3;
    } else {
      Nc = 1e-3;
    }

    const protectionRequired = Nd > Nc;
    const protectionEfficiency = protectionRequired ? Math.max(0, 1 - Nc / Nd) : 0;

    // Determine required LP level
    let requiredLevel = 'IV';
    if (protectionEfficiency >= 0.99) requiredLevel = 'I';
    else if (protectionEfficiency >= 0.97) requiredLevel = 'II';
    else if (protectionEfficiency >= 0.91) requiredLevel = 'III';
    else requiredLevel = 'IV';

    return {
      flashDensityNg: parseFloat(Ng.toFixed(3)),
      collectionAreaM2: Math.round(Ad),
      annualStrikeFrequencyNd: parseFloat(Nd.toFixed(6)),
      tolerableFrequencyNc: Nc,
      protectionRequired,
      requiredProtectionEfficiency: parseFloat((protectionEfficiency * 100).toFixed(1)),
      recommendedLevel: requiredLevel,
      keraunicLevel: EarthingLightningCalculator.KERAUNIC_LEVELS[city.toUpperCase()] || 40,
    };
  }

  /**
   * Lightning protection system design per IEC 62305-3
   */
  calculateLightningProtection(length, width, height, lpLevel) {
    const level = EarthingLightningCalculator.LP_LEVELS[lpLevel]
      || EarthingLightningCalculator.LP_LEVELS.III;

    // Air termination — rolling sphere method
    const rollingSphereRadius = level.rollingSphereRadius;
    const meshSize = level.meshSize;

    // Number of air termination rods on roof (mesh method)
    const rodsAlongLength = Math.ceil(length / meshSize) + 1;
    const rodsAlongWidth = Math.ceil(width / meshSize) + 1;
    const totalRoofRods = rodsAlongLength * 2 + rodsAlongWidth * 2 - 4; // Perimeter + cross conductors
    const meshConductorLength = (rodsAlongLength * width) + (rodsAlongWidth * length);

    // Down conductors
    const perimeter = 2 * (length + width);
    const numberOfDownConductors = Math.max(2, Math.ceil(perimeter / level.downConductorSpacing));
    const downConductorLength = height * numberOfDownConductors;

    // Earth termination (ring earth + rod)
    const ringEarthLength = perimeter + 4; // 1m extension at each corner
    const numberOfEarthRods = numberOfDownConductors; // 1 rod per down conductor
    const earthRodLength = 3.0; // m per IS 3043

    // Separation distance (to prevent side-flash)
    const separationDistance = 0.04 * height; // Simplified: s = ki × kc × L/km

    // Test links
    const testLinkCount = numberOfDownConductors;

    // Material quantities
    const totalGIStripM = meshConductorLength + downConductorLength + ringEarthLength;

    return {
      level: lpLevel,
      rollingSphereRadius,
      meshSize: `${meshSize}m × ${meshSize}m`,
      airTermination: {
        method: 'Mesh + Franklin rod hybrid',
        meshConductorLengthM: Math.round(meshConductorLength),
        numberOfRods: totalRoofRods,
        rodHeight: height > 30 ? 1.0 : 0.5, // m above roof
      },
      downConductors: {
        count: numberOfDownConductors,
        spacing: level.downConductorSpacing,
        totalLengthM: Math.round(downConductorLength),
        material: 'GI Strip 25mm × 3mm / GI Round 8mm dia',
      },
      earthTermination: {
        type: 'Ring earth + driven rods',
        ringEarthLengthM: Math.round(ringEarthLength),
        numberOfRods: numberOfEarthRods,
        rodLengthM: earthRodLength,
        targetResistanceOhm: 10, // per IEC 62305-3
      },
      separationDistanceM: parseFloat(separationDistance.toFixed(2)),
      testLinks: testLinkCount,
      materialSummary: {
        giStripOrRoundM: Math.round(totalGIStripM),
        earthRodsCount: numberOfEarthRods,
        earthRodLengthEachM: earthRodLength,
        testJointBoxes: testLinkCount,
        clamps: Math.round(totalGIStripM / 1.5), // 1 clamp per 1.5m approx
      },
    };
  }

  /**
   * Surge protection device (SPD) requirements
   */
  calculateSurgeProtection(buildingType, hasSensitiveEquipment) {
    const spds = [];

    // Type 1 SPD at main incoming (mandatory for LPS-equipped buildings per IS/IEC 62305-4)
    spds.push({
      type: 'Type 1 (Class I)',
      location: 'Main Distribution Board (MDB)',
      iimp: '12.5 kA (10/350μs)',
      uc: '340V (for 230/400V system)',
      up: '≤ 4 kV',
    });

    // Type 2 SPD at sub-distribution
    spds.push({
      type: 'Type 2 (Class II)',
      location: 'Sub-Distribution Boards (SDB)',
      imax: '40 kA (8/20μs)',
      uc: '340V',
      up: '≤ 2.5 kV',
    });

    // Type 3 SPD at sensitive equipment
    if (hasSensitiveEquipment) {
      spds.push({
        type: 'Type 3 (Class III)',
        location: 'Near sensitive equipment (servers, BMS, fire panel)',
        imax: '10 kA (8/20μs)',
        uc: '275V',
        up: '≤ 1.5 kV',
      });
    }

    return {
      required: true,
      devices: spds,
      coordinationType: 'Energy coordination per IEC 61643-12',
      notes: [
        'SPDs must be coordinated (decoupling inductance or distance >10m between stages)',
        'Green/Red status indicator required on each SPD',
        'Remote monitoring contact recommended for critical installations',
      ],
    };
  }
}

export default EarthingLightningCalculator;
