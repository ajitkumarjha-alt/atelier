/**
 * Fire Fighting System Design Service
 * 
 * Comprehensive fire fighting system design covering:
 * - Wet riser / Dry riser sizing
 * - Sprinkler system hydraulic design
 * - Fire hydrant system
 * - Hose reel system
 * - Fire suppression (gas-based, foam)
 * 
 * Compliant with NBC 2016 Part 4, IS 15105, IS 3844, NFPA 13/14/20.
 */

class FireFightingSystemCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── NBC 2016 Part 4 Requirements by Building Height ──────────────────
  static NBC_REQUIREMENTS = {
    '15m': {
      wetRiser: false, dryRiser: false, sprinkler: false, hoseReel: true,
      fireExtinguisher: true, yardHydrant: true, internalHydrant: false,
      waterStorage: 50, // m³
    },
    '24m': {
      wetRiser: true, dryRiser: false, sprinkler: false, hoseReel: true,
      fireExtinguisher: true, yardHydrant: true, internalHydrant: true,
      waterStorage: 100,
    },
    '45m': {
      wetRiser: true, dryRiser: false, sprinkler: true, hoseReel: true,
      fireExtinguisher: true, yardHydrant: true, internalHydrant: true,
      waterStorage: 200,
    },
    '60m': {
      wetRiser: true, dryRiser: false, sprinkler: true, hoseReel: true,
      fireExtinguisher: true, yardHydrant: true, internalHydrant: true,
      zoneValve: true, waterStorage: 300,
    },
    'above60m': {
      wetRiser: true, dryRiser: true, sprinkler: true, hoseReel: true,
      fireExtinguisher: true, yardHydrant: true, internalHydrant: true,
      zoneValve: true, refugeArea: true, waterStorage: 450,
    },
  };

  // ─── Riser Pipe Sizes per IS 3844 ─────────────────────────────────────
  static RISER_PIPE_SIZES = {
    wetRiser: {
      'Up to 30m (residential)': { diameter: 100, material: 'MS ERW IS 1239 Medium' },
      'Up to 30m (commercial)': { diameter: 100, material: 'MS ERW IS 1239 Medium' },
      '30m to 60m': { diameter: 150, material: 'MS ERW IS 1239 Heavy' },
      'Above 60m': { diameter: 150, material: 'MS Seamless IS 1239 Heavy' },
    },
    dryRiser: {
      default: { diameter: 100, material: 'MS ERW IS 1239 Medium' },
    },
    hoseReel: {
      default: { diameter: 50, material: 'MS ERW IS 1239 Medium' },
    },
    sprinklerRiser: {
      'Up to 50 heads': { diameter: 100, material: 'MS ERW IS 1239 Medium' },
      '51-100 heads': { diameter: 125, material: 'MS ERW IS 1239 Medium' },
      'Above 100 heads': { diameter: 150, material: 'MS ERW IS 1239 Heavy' },
    },
  };

  // ─── Sprinkler Design Parameters ──────────────────────────────────────
  static SPRINKLER_CLASSES = {
    'Light Hazard': {
      designDensity: 2.25,       // mm/min
      designArea: 84,            // m²
      maxCoverage: 21,           // m² per head
      maxSpacing: 4.6,           // m
      minPressure: 0.7,          // bar
      operatingTemp: 68,         // °C (red bulb)
      kFactor: 80,
      examples: 'Offices, hospitals, hotels, schools',
    },
    'Ordinary Hazard Group 1': {
      designDensity: 5.0,
      designArea: 72,
      maxCoverage: 12.5,
      maxSpacing: 4.0,
      minPressure: 0.5,
      operatingTemp: 68,
      kFactor: 80,
      examples: 'Restaurants, laundries, bakeries',
    },
    'Ordinary Hazard Group 2': {
      designDensity: 5.0,
      designArea: 144,
      maxCoverage: 12.5,
      maxSpacing: 4.0,
      minPressure: 0.5,
      operatingTemp: 68,
      kFactor: 80,
      examples: 'Workshops, car parks, stages',
    },
    'High Hazard': {
      designDensity: 10.0,
      designArea: 260,
      maxCoverage: 9.0,
      maxSpacing: 3.7,
      minPressure: 1.0,
      operatingTemp: 68,
      kFactor: 115,
      examples: 'Warehouses, flammable storage',
    },
  };

  // ─── Hydrant Equipment ────────────────────────────────────────────────
  static HYDRANT_EQUIPMENT = {
    landingValve: {
      size: '63mm (2.5")',
      type: 'Angle valve with instantaneous coupling',
      material: 'Gunmetal IS 318',
    },
    hose: {
      diameter: '63mm',
      length: 15, // m per section
      sections: 2,
      material: 'RRL Type A / Synthetic',
    },
    nozzle: {
      type: 'Multi-purpose (jet/spray/fog)',
      size: '20mm',
      flowRate: 2.27, // l/s at 3.5 bar
    },
    cabinet: {
      type: 'MS powder coated (RAL 3000 red)',
      size: '750 × 600 × 250mm',
    },
    hoseReel: {
      diameter: '19mm',
      length: 30, // m
      flowRate: 0.4, // l/s minimum
      nozzle: 'Shut-off type',
      pressure: 2.0, // bar minimum at nozzle
    },
  };

  // ─── Pipe Friction (C values for Hazen-Williams) ──────────────────────
  static PIPE_C_VALUES = {
    'MS Black': 100,
    'MS Galvanized': 120,
    'CI (lined)': 100,
    'SS 304': 140,
    'CPVC': 150,
    'HDPE': 150,
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      buildingHeight = 45,            // m
      numberOfFloors = 15,
      floorHeight = 3.0,              // m
      buildingType = 'commercial',    // residential | commercial | mixed
      totalBuiltUpArea = 10000,       // m²
      floorArea = 700,                // m² per floor
      basementLevels = 2,
      occupancyType = 'Business',     // per NBC classification
      sprinklerHazard = 'Light Hazard',
      hasSprinkler = true,
      hasHoseReel = true,
      customWaterStorage = null,
    } = params;

    // Determine NBC category
    const nbcCategory = this.getNbcCategory(buildingHeight);
    const nbcReqs = FireFightingSystemCalculator.NBC_REQUIREMENTS[nbcCategory];

    // Design each system
    const wetRiser = nbcReqs.wetRiser ? this.designWetRiser(buildingHeight, numberOfFloors, floorHeight) : null;
    const dryRiser = nbcReqs.dryRiser ? this.designDryRiser(buildingHeight, numberOfFloors, floorHeight) : null;
    const sprinklerSystem = hasSprinkler && nbcReqs.sprinkler 
      ? this.designSprinkler(floorArea, numberOfFloors, sprinklerHazard, buildingHeight, floorHeight)
      : null;
    const hoseReelSystem = hasHoseReel ? this.designHoseReel(numberOfFloors, floorHeight) : null;
    const hydrantSystem = this.designInternalHydrant(numberOfFloors, buildingHeight, floorHeight);
    const yardHydrant = this.designYardHydrant(totalBuiltUpArea);

    // Water storage calculation
    const waterStorage = this.calculateWaterStorage(
      nbcReqs, wetRiser, sprinklerSystem, hoseReelSystem, hydrantSystem, customWaterStorage
    );

    // Fire extinguisher schedule
    const extinguishers = this.scheduleExtinguishers(floorArea, numberOfFloors, buildingType);

    // Zone valve requirements
    const zoneValves = buildingHeight > 45 
      ? this.designZoneValves(numberOfFloors, floorHeight, buildingHeight) 
      : null;

    // Pipe material schedule
    const pipingSchedule = this.generatePipingSchedule(
      wetRiser, dryRiser, sprinklerSystem, hoseReelSystem, numberOfFloors, floorHeight
    );

    return {
      buildingInfo: {
        height: buildingHeight,
        floors: numberOfFloors,
        basements: basementLevels,
        floorArea,
        totalArea: totalBuiltUpArea,
        buildingType,
        occupancy: occupancyType,
        nbcCategory,
      },
      nbcRequirements: nbcReqs,
      wetRiser,
      dryRiser,
      sprinklerSystem,
      hoseReelSystem,
      hydrantSystem,
      yardHydrant,
      waterStorage,
      extinguishers,
      zoneValves,
      pipingSchedule,
      summary: {
        systemsProvided: [
          wetRiser && 'Wet Riser',
          dryRiser && 'Dry Riser',
          sprinklerSystem && 'Sprinkler System',
          hoseReelSystem && 'Hose Reel',
          hydrantSystem && 'Internal Hydrant',
          yardHydrant && 'Yard Hydrant',
        ].filter(Boolean),
        totalWaterStorageM3: waterStorage.totalM3,
        totalWaterStorageLitres: waterStorage.totalLitres,
        totalPumpPowerKW: (
          (wetRiser?.pumpPowerKW || 0) +
          (sprinklerSystem?.pumpPowerKW || 0) +
          (hoseReelSystem?.pumpPowerKW || 0)
        ),
      },
    };
  }

  /**
   * Get NBC height category
   */
  getNbcCategory(height) {
    if (height <= 15) return '15m';
    if (height <= 24) return '24m';
    if (height <= 45) return '45m';
    if (height <= 60) return '60m';
    return 'above60m';
  }

  /**
   * Design wet riser system
   */
  designWetRiser(buildingHeight, floors, floorHeight) {
    let pipeSpec;
    if (buildingHeight <= 30) {
      pipeSpec = FireFightingSystemCalculator.RISER_PIPE_SIZES.wetRiser['Up to 30m (commercial)'];
    } else if (buildingHeight <= 60) {
      pipeSpec = FireFightingSystemCalculator.RISER_PIPE_SIZES.wetRiser['30m to 60m'];
    } else {
      pipeSpec = FireFightingSystemCalculator.RISER_PIPE_SIZES.wetRiser['Above 60m'];
    }

    // Hydraulic calculation
    const flowRate = 2.27; // l/s per hydrant
    const simultaneousHydrants = buildingHeight > 45 ? 3 : 2;
    const totalFlow = flowRate * simultaneousHydrants;
    
    // Pressure at highest hydrant
    const staticHead = buildingHeight * 0.0981; // bar
    const frictionLoss = this.calculateFrictionLoss(totalFlow, pipeSpec.diameter, buildingHeight);
    const residualPressure = 3.5; // bar at nozzle
    const totalHead = staticHead + frictionLoss + residualPressure;

    // Pump sizing
    const pumpFlowM3h = totalFlow * 3.6;
    const pumpHeadM = totalHead / 0.0981;
    const pumpPowerKW = (pumpFlowM3h * pumpHeadM * 9.81) / (3600 * 0.65); // 65% efficiency

    return {
      pipeDiameter: pipeSpec.diameter,
      pipeMaterial: pipeSpec.material,
      numberOfRisers: buildingHeight > 60 ? 2 : 1,
      landingValves: floors,
      simultaneousHydrants,
      flowRateLPS: parseFloat(totalFlow.toFixed(2)),
      hydraulics: {
        staticHeadBar: parseFloat(staticHead.toFixed(2)),
        frictionLossBar: parseFloat(frictionLoss.toFixed(2)),
        residualPressureBar: residualPressure,
        totalHeadBar: parseFloat(totalHead.toFixed(2)),
        totalHeadM: parseFloat(pumpHeadM.toFixed(1)),
      },
      pumpFlowM3h: parseFloat(pumpFlowM3h.toFixed(1)),
      pumpHeadM: parseFloat(pumpHeadM.toFixed(1)),
      pumpPowerKW: parseFloat(pumpPowerKW.toFixed(1)),
      equipment: FireFightingSystemCalculator.HYDRANT_EQUIPMENT.landingValve,
    };
  }

  /**
   * Design dry riser (for fire brigade use)
   */
  designDryRiser(buildingHeight, floors, floorHeight) {
    return {
      pipeDiameter: 100,
      pipeMaterial: 'MS ERW IS 1239 Medium',
      numberOfRisers: 1,
      inletConnection: {
        location: 'Ground floor external wall',
        type: '4-way collecting head (IS 903)',
        size: '63mm instantaneous coupling × 4',
      },
      landingValves: Math.ceil(floors / 2), // alternate floors typically
      outletSize: '63mm',
      drainValve: 'At base of riser',
      airVent: 'At top of riser',
      testFrequency: 'Annual (hydraulic test at 7 bar for 10 minutes)',
    };
  }

  /**
   * Design sprinkler system
   */
  designSprinkler(floorArea, floors, hazardClass, buildingHeight, floorHeight) {
    const spec = FireFightingSystemCalculator.SPRINKLER_CLASSES[hazardClass];
    if (!spec) return null;

    // Number of sprinkler heads per floor
    const headsPerFloor = Math.ceil(floorArea / spec.maxCoverage);
    const totalHeads = headsPerFloor * floors;

    // Riser sizing
    let riserDia;
    if (headsPerFloor <= 50) riserDia = 100;
    else if (headsPerFloor <= 100) riserDia = 125;
    else riserDia = 150;

    // Hydraulic calculation for design area
    const designHeads = Math.ceil(spec.designArea / spec.maxCoverage);
    const flowPerHead = spec.kFactor * Math.sqrt(spec.minPressure * 10) / 1000; // l/s
    const designFlow = flowPerHead * designHeads;

    // Pressure at remotest head
    const staticHead = buildingHeight * 0.0981;
    const frictionLoss = this.calculateFrictionLoss(designFlow, riserDia, buildingHeight);
    const totalHead = staticHead + frictionLoss + spec.minPressure;

    // Branch pipe sizing
    const branchSizes = this.sizeSprinklerBranches(headsPerFloor, spec);

    // Pump sizing
    const pumpFlowM3h = designFlow * 3.6;
    const pumpHeadM = totalHead / 0.0981;
    const pumpPowerKW = (pumpFlowM3h * pumpHeadM * 9.81) / (3600 * 0.65);

    return {
      hazardClass,
      designParameters: {
        designDensity: `${spec.designDensity} mm/min`,
        designArea: `${spec.designArea} m²`,
        maxCoveragePerHead: `${spec.maxCoverage} m²`,
        maxSpacing: `${spec.maxSpacing} m`,
        minPressureBar: spec.minPressure,
        operatingTemp: `${spec.operatingTemp}°C (Red bulb)`,
        kFactor: spec.kFactor,
      },
      sprinklerCount: {
        perFloor: headsPerFloor,
        totalFloors: floors,
        totalHeads,
        designHeads,
      },
      riserDiameter: riserDia,
      branchSizing: branchSizes,
      hydraulics: {
        flowPerHeadLPS: parseFloat(flowPerHead.toFixed(3)),
        designFlowLPS: parseFloat(designFlow.toFixed(2)),
        staticHeadBar: parseFloat(staticHead.toFixed(2)),
        frictionLossBar: parseFloat(frictionLoss.toFixed(2)),
        residualPressureBar: spec.minPressure,
        totalHeadBar: parseFloat(totalHead.toFixed(2)),
      },
      pumpFlowM3h: parseFloat(pumpFlowM3h.toFixed(1)),
      pumpHeadM: parseFloat(pumpHeadM.toFixed(1)),
      pumpPowerKW: parseFloat(pumpPowerKW.toFixed(1)),
      alarmValve: {
        type: 'Wet Alarm Valve (IS 15105)',
        size: riserDia >= 150 ? '150mm' : '100mm',
        location: 'Ground floor pump room',
      },
      flowSwitch: 'Paddle type on each floor riser',
    };
  }

  /**
   * Size sprinkler branch lines
   */
  sizeSprinklerBranches(headsPerFloor, spec) {
    return {
      branchLine: {
        maxHeads: 8,
        diameter: 25, // mm for up to 3 heads, increasing
        sizingRule: 'IS 15105 Table 6.5',
        sizes: [
          { heads: '1-2', dia: 25 },
          { heads: '3-5', dia: 32 },
          { heads: '6-8', dia: 40 },
          { heads: '9-12', dia: 50 },
        ],
      },
      crossMain: {
        diameter: headsPerFloor <= 40 ? 65 : headsPerFloor <= 80 ? 80 : 100,
        material: 'MS ERW IS 1239 Medium',
      },
      feedMain: {
        diameter: headsPerFloor <= 60 ? 80 : headsPerFloor <= 120 ? 100 : 125,
        material: 'MS ERW IS 1239 Medium',
      },
    };
  }

  /**
   * Design hose reel system
   */
  designHoseReel(floors, floorHeight) {
    const spec = FireFightingSystemCalculator.HYDRANT_EQUIPMENT.hoseReel;
    const hoseReelsPerFloor = 1; // minimum 1 per floor, adjust for large floors
    const totalHoseReels = hoseReelsPerFloor * floors;

    // Simultaneous operation: 2 hose reels
    const designFlow = spec.flowRate * 2; // l/s
    const staticHead = (floors * floorHeight) * 0.0981;
    const residualPressure = spec.pressure; // bar
    const totalHead = staticHead + 0.5 + residualPressure; // 0.5 bar friction

    const pumpFlowM3h = designFlow * 3.6;
    const pumpHeadM = totalHead / 0.0981;
    const pumpPowerKW = (pumpFlowM3h * pumpHeadM * 9.81) / (3600 * 0.60);

    return {
      specification: {
        hoseDiameter: `${spec.diameter}mm`,
        hoseLength: `${spec.length}m`,
        flowRate: `${spec.flowRate} l/s`,
        minPressure: `${spec.pressure} bar`,
        nozzleType: spec.nozzle,
      },
      count: {
        perFloor: hoseReelsPerFloor,
        totalFloors: floors,
        total: totalHoseReels,
      },
      riserDiameter: 50,
      riserMaterial: 'MS ERW IS 1239 Medium',
      pumpFlowM3h: parseFloat(pumpFlowM3h.toFixed(1)),
      pumpHeadM: parseFloat(pumpHeadM.toFixed(1)),
      pumpPowerKW: parseFloat(pumpPowerKW.toFixed(1)),
      note: 'Hose reel pump can be combined with hydrant pump if flow/head compatible',
    };
  }

  /**
   * Design internal hydrant system
   */
  designInternalHydrant(floors, buildingHeight, floorHeight) {
    const hydrantsPerFloor = 1;
    const totalHydrants = hydrantsPerFloor * floors;
    const simultaneousOps = buildingHeight > 45 ? 3 : 2;
    const nozzleFlow = 2.27; // l/s
    const designFlow = nozzleFlow * simultaneousOps;

    return {
      hydrantsPerFloor,
      totalHydrants,
      simultaneousOperations: simultaneousOps,
      designFlowLPS: parseFloat(designFlow.toFixed(2)),
      minPressureAtNozzle: '3.5 bar',
      equipment: {
        cabinet: FireFightingSystemCalculator.HYDRANT_EQUIPMENT.cabinet,
        hose: FireFightingSystemCalculator.HYDRANT_EQUIPMENT.hose,
        nozzle: FireFightingSystemCalculator.HYDRANT_EQUIPMENT.nozzle,
        landingValve: FireFightingSystemCalculator.HYDRANT_EQUIPMENT.landingValve,
      },
    };
  }

  /**
   * Design yard hydrant system
   */
  designYardHydrant(totalArea) {
    // 1 yard hydrant per 1000-1500 m² area, minimum 2
    const count = Math.max(2, Math.ceil(totalArea / 1500));

    return {
      count,
      type: 'Double headed (IS 909)',
      outletSize: '63mm instantaneous × 2',
      minFlowRate: '10 l/s per hydrant',
      minPressure: '3.5 bar',
      spacing: 'Max 45m between hydrants',
      undergroundPipe: '150mm CI / DI',
    };
  }

  /**
   * Calculate water storage requirements
   */
  calculateWaterStorage(nbcReqs, wetRiser, sprinkler, hoseReel, hydrant, customStorage) {
    if (customStorage) {
      return {
        totalM3: customStorage,
        totalLitres: customStorage * 1000,
        source: 'User specified',
      };
    }

    // NBC minimum
    const nbcMinimumM3 = nbcReqs.waterStorage;

    // Calculated based on 1-hour operation
    const hydrantStorage = wetRiser ? (wetRiser.flowRateLPS * 3600 / 1000) : 0;
    const sprinklerStorage = sprinkler ? (sprinkler.hydraulics.designFlowLPS * 3600 / 1000) : 0;
    const hoseReelStorage = hoseReel ? (0.8 * 3600 / 1000) : 0;
    const calculatedStorage = hydrantStorage + sprinklerStorage + hoseReelStorage;

    const designStorage = Math.max(nbcMinimumM3, Math.ceil(calculatedStorage / 5) * 5);

    return {
      nbcMinimumM3: nbcMinimumM3,
      hydrantStorageM3: parseFloat(hydrantStorage.toFixed(1)),
      sprinklerStorageM3: parseFloat(sprinklerStorage.toFixed(1)),
      hoseReelStorageM3: parseFloat(hoseReelStorage.toFixed(1)),
      calculatedM3: parseFloat(calculatedStorage.toFixed(1)),
      totalM3: designStorage,
      totalLitres: designStorage * 1000,
      tankType: designStorage > 100 ? 'Underground RCC tank' : 'Underground / Overhead GRP/RCC',
      durationHours: 1,
      refillNote: 'Municipal supply or tanker refill within 24 hours',
    };
  }

  /**
   * Schedule fire extinguishers per NBC 2016
   */
  scheduleExtinguishers(floorArea, floors, buildingType) {
    // 1 extinguisher per 200 m²
    const perFloor = Math.max(2, Math.ceil(floorArea / 200));
    
    return {
      perFloor,
      total: perFloor * floors,
      types: [
        { type: 'ABC Dry Powder (6 kg)', count: Math.ceil(perFloor * 0.5), placement: 'Near exits, corridors' },
        { type: 'CO2 (4.5 kg)', count: Math.ceil(perFloor * 0.3), placement: 'Near electrical panels, server rooms' },
        { type: 'Mechanical Foam (9 L)', count: Math.ceil(perFloor * 0.2), placement: 'Kitchen, generator room' },
      ],
      maxTravelDistance: '15m',
      mountingHeight: '1.0m from floor to handle',
      signage: 'IS 9457 / NBC compliant fire safety signs',
    };
  }

  /**
   * Design zone valves for tall buildings
   */
  designZoneValves(floors, floorHeight, buildingHeight) {
    const maxZoneHeight = 30; // m (max 30m per zone)
    const floorsPerZone = Math.floor(maxZoneHeight / floorHeight);
    const numberOfZones = Math.ceil(floors / floorsPerZone);

    const zones = [];
    for (let i = 0; i < numberOfZones; i++) {
      const startFloor = i * floorsPerZone + 1;
      const endFloor = Math.min((i + 1) * floorsPerZone, floors);
      zones.push({
        zone: i + 1,
        floors: `${startFloor} to ${endFloor}`,
        heightRange: `${(startFloor - 1) * floorHeight}m to ${endFloor * floorHeight}m`,
        PRVSetting: `${Math.round(7 - (i * 2))} bar`, // reduce pressure for lower zones
      });
    }

    return {
      numberOfZones,
      floorsPerZone,
      maxZoneHeight: `${maxZoneHeight}m`,
      zones,
      valveType: 'Butterfly valve with limit switch (IS 13095)',
      PRV: buildingHeight > 60 ? 'Pressure Reducing Valve at each zone' : 'Not required',
    };
  }

  /**
   * Generate piping schedule / BoQ
   */
  generatePipingSchedule(wetRiser, dryRiser, sprinkler, hoseReel, floors, floorHeight) {
    const items = [];
    const totalHeight = floors * floorHeight;

    if (wetRiser) {
      items.push({
        system: 'Wet Riser',
        diameter: wetRiser.pipeDiameter,
        material: wetRiser.pipeMaterial || 'MS ERW IS 1239',
        lengthM: Math.ceil(totalHeight * 1.1), // 10% extra
        fittings: `${floors} landing valves, ${Math.ceil(floors / 5)} check valves`,
      });
    }

    if (dryRiser) {
      items.push({
        system: 'Dry Riser',
        diameter: 100,
        material: 'MS ERW IS 1239 Medium',
        lengthM: Math.ceil(totalHeight * 1.1),
        fittings: `4-way collecting head, ${Math.ceil(floors / 2)} landing valves`,
      });
    }

    if (sprinkler) {
      items.push({
        system: 'Sprinkler Riser',
        diameter: sprinkler.riserDiameter,
        material: 'MS ERW IS 1239 Medium',
        lengthM: Math.ceil(totalHeight * 1.1),
        fittings: `Alarm valve, ${floors} floor control valves, ${sprinkler.sprinklerCount.totalHeads} sprinkler heads`,
      });
    }

    if (hoseReel) {
      items.push({
        system: 'Hose Reel Riser',
        diameter: 50,
        material: 'MS ERW IS 1239 Medium',
        lengthM: Math.ceil(totalHeight * 1.1),
        fittings: `${floors} hose reel drums`,
      });
    }

    return items;
  }

  /**
   * Calculate friction loss using Hazen-Williams formula
   */
  calculateFrictionLoss(flowLPS, pipeDiaMM, lengthM) {
    const C = 100; // MS pipe
    const diaM = pipeDiaMM / 1000;
    const flowM3s = flowLPS / 1000;

    // Hazen-Williams: h = 10.67 × Q^1.852 / (C^1.852 × D^4.87) × L
    const hfPerM = 10.67 * Math.pow(flowM3s, 1.852) / (Math.pow(C, 1.852) * Math.pow(diaM, 4.87));
    const equivalentLength = lengthM * 1.3; // 30% for fittings
    const totalLoss = hfPerM * equivalentLength;

    return totalLoss * 0.0981; // Convert m to bar
  }
}

export default FireFightingSystemCalculator;
