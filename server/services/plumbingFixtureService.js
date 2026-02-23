/**
 * Plumbing Fixture Unit Calculation Service
 * 
 * Performs pipe sizing using the Fixture Unit method per IS 2065,
 * with Hunter's curve for simultaneous demand estimation.
 * Sizes hot and cold water distribution piping.
 */

class PlumbingFixtureCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Fixture Units (FU) per IS 2065 — Private Use ─────────────────────
  static FIXTURE_UNITS_PRIVATE = {
    'Water Closet (flush tank)': { cold: 3, hot: 0, total: 3, minPipeMM: 15, flowLPS: 0.10 },
    'Water Closet (flush valve)': { cold: 6, hot: 0, total: 6, minPipeMM: 25, flowLPS: 1.00 },
    'Lavatory Basin': { cold: 1, hot: 1, total: 1, minPipeMM: 15, flowLPS: 0.10 },
    'Bathtub': { cold: 2, hot: 2, total: 2, minPipeMM: 15, flowLPS: 0.20 },
    'Shower': { cold: 2, hot: 2, total: 2, minPipeMM: 15, flowLPS: 0.15 },
    'Kitchen Sink': { cold: 2, hot: 2, total: 2, minPipeMM: 15, flowLPS: 0.20 },
    'Washing Machine': { cold: 2, hot: 2, total: 2, minPipeMM: 15, flowLPS: 0.20 },
    'Dishwasher': { cold: 1, hot: 1, total: 1, minPipeMM: 15, flowLPS: 0.15 },
    'Bidet': { cold: 1, hot: 1, total: 1, minPipeMM: 15, flowLPS: 0.10 },
    'Hose Bib': { cold: 3, hot: 0, total: 3, minPipeMM: 15, flowLPS: 0.25 },
  };

  // ─── Fixture Units — Public Use (higher values) ───────────────────────
  static FIXTURE_UNITS_PUBLIC = {
    'Water Closet (flush tank)': { cold: 5, hot: 0, total: 5, minPipeMM: 20, flowLPS: 0.10 },
    'Water Closet (flush valve)': { cold: 10, hot: 0, total: 10, minPipeMM: 25, flowLPS: 1.00 },
    'Urinal (flush valve)': { cold: 5, hot: 0, total: 5, minPipeMM: 20, flowLPS: 0.50 },
    'Urinal (sensor)': { cold: 3, hot: 0, total: 3, minPipeMM: 15, flowLPS: 0.20 },
    'Lavatory Basin': { cold: 2, hot: 2, total: 2, minPipeMM: 15, flowLPS: 0.10 },
    'Kitchen Sink (commercial)': { cold: 4, hot: 4, total: 4, minPipeMM: 20, flowLPS: 0.30 },
    'Mop Sink': { cold: 3, hot: 3, total: 3, minPipeMM: 20, flowLPS: 0.25 },
    'Drinking Fountain': { cold: 1, hot: 0, total: 1, minPipeMM: 15, flowLPS: 0.05 },
  };

  // ─── Hunter's Curve — Fixture Units to Flow (LPS) ─────────────────────
  // Predominantly flush-tank systems (IS 2065 Table B)
  static HUNTERS_CURVE_FLUSH_TANK = [
    { fu: 1, lps: 0.10 }, { fu: 2, lps: 0.15 }, { fu: 3, lps: 0.19 },
    { fu: 5, lps: 0.25 }, { fu: 8, lps: 0.32 }, { fu: 10, lps: 0.38 },
    { fu: 15, lps: 0.44 }, { fu: 20, lps: 0.50 }, { fu: 25, lps: 0.57 },
    { fu: 30, lps: 0.63 }, { fu: 40, lps: 0.76 }, { fu: 50, lps: 0.88 },
    { fu: 60, lps: 0.95 }, { fu: 80, lps: 1.14 }, { fu: 100, lps: 1.26 },
    { fu: 120, lps: 1.39 }, { fu: 150, lps: 1.58 }, { fu: 200, lps: 1.83 },
    { fu: 250, lps: 2.08 }, { fu: 300, lps: 2.27 }, { fu: 400, lps: 2.71 },
    { fu: 500, lps: 3.03 }, { fu: 700, lps: 3.66 }, { fu: 1000, lps: 4.55 },
    { fu: 1500, lps: 5.81 }, { fu: 2000, lps: 6.94 }, { fu: 3000, lps: 8.83 },
    { fu: 5000, lps: 12.11 }, { fu: 8000, lps: 16.04 }, { fu: 10000, lps: 18.93 },
  ];

  // ─── Pipe sizing reference (copper/CPVC velocity 1.5-2.5 m/s) ────────
  static PIPE_CAPACITY_LPS = {
    15: { min: 0.05, max: 0.44 },
    20: { min: 0.10, max: 0.79 },
    25: { min: 0.20, max: 1.23 },
    32: { min: 0.40, max: 2.01 },
    40: { min: 0.60, max: 3.14 },
    50: { min: 1.00, max: 4.91 },
    65: { min: 1.70, max: 8.30 },
    80: { min: 2.50, max: 12.57 },
    100: { min: 4.00, max: 19.63 },
    125: { min: 6.50, max: 30.68 },
    150: { min: 9.50, max: 44.18 },
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      projectType = 'RESIDENTIAL',    // RESIDENTIAL | COMMERCIAL | MIXED
      useType = 'PRIVATE',             // PRIVATE | PUBLIC
      fixtures = [],                    // [{ type, count, floor }]
      floors = [],                      // [{ name, fixtures: [...] }]
      pipeMaterial = 'CPVC',
      buildingHeight = 30,
      numberOfRisers = 2,
      hotWaterRequired = true,
    } = params;

    const fixtureTable = useType === 'PUBLIC' ? PlumbingFixtureCalculator.FIXTURE_UNITS_PUBLIC : PlumbingFixtureCalculator.FIXTURE_UNITS_PRIVATE;

    // 1. Calculate fixture units per floor and totals
    const floorAnalysis = this.analyzeFloors(floors.length > 0 ? floors : [{ name: 'All Floors', fixtures }], fixtureTable);

    // 2. Apply Hunter's curve for simultaneous demand
    const simultaneousDemand = this.applyHuntersCurve(floorAnalysis.totalColdFU, floorAnalysis.totalHotFU, floorAnalysis.totalFU);

    // 3. Size main riser pipes
    const riserSizing = this.sizeRisers(
      simultaneousDemand.totalFlowLPS, numberOfRisers, pipeMaterial
    );

    // 4. Size branch pipes per floor
    const branchSizing = this.sizeBranches(floorAnalysis.floors, fixtureTable, pipeMaterial);

    // 5. Hot water system sizing
    let hotWaterSystem = null;
    if (hotWaterRequired) {
      hotWaterSystem = this.sizeHotWaterSystem(floorAnalysis.totalHotFU, projectType);
    }

    return {
      projectInfo: { projectType, useType, pipeMaterial, numberOfRisers },
      fixtureAnalysis: floorAnalysis,
      simultaneousDemand,
      riserSizing,
      branchSizing,
      hotWaterSystem,
      pipingMaterialSummary: this.generateMaterialSummary(riserSizing, branchSizing, buildingHeight),
    };
  }

  /**
   * Analyze fixtures per floor
   */
  analyzeFloors(floors, fixtureTable) {
    let totalColdFU = 0;
    let totalHotFU = 0;
    let totalFU = 0;
    let totalFixtureCount = 0;

    const floorDetails = floors.map(floor => {
      let floorColdFU = 0;
      let floorHotFU = 0;
      let floorTotalFU = 0;
      let floorFixtureCount = 0;

      const fixtureBreakdown = (floor.fixtures || []).map(f => {
        const spec = fixtureTable[f.type] || { cold: 2, hot: 0, total: 2, minPipeMM: 15, flowLPS: 0.10 };
        const count = f.count || 1;
        const coldFU = spec.cold * count;
        const hotFU = spec.hot * count;
        const totalF = spec.total * count;

        floorColdFU += coldFU;
        floorHotFU += hotFU;
        floorTotalFU += totalF;
        floorFixtureCount += count;

        return {
          type: f.type,
          count,
          unitColdFU: spec.cold,
          unitHotFU: spec.hot,
          totalColdFU: coldFU,
          totalHotFU: hotFU,
          totalFU: totalF,
          minPipeMM: spec.minPipeMM,
        };
      });

      totalColdFU += floorColdFU;
      totalHotFU += floorHotFU;
      totalFU += floorTotalFU;
      totalFixtureCount += floorFixtureCount;

      return {
        name: floor.name,
        fixtureCount: floorFixtureCount,
        coldFU: floorColdFU,
        hotFU: floorHotFU,
        totalFU: floorTotalFU,
        fixtures: fixtureBreakdown,
      };
    });

    return {
      floors: floorDetails,
      totalColdFU,
      totalHotFU,
      totalFU,
      totalFixtureCount,
    };
  }

  /**
   * Apply Hunter's curve to convert FU to LPS
   */
  applyHuntersCurve(coldFU, hotFU, totalFU) {
    const coldFlowLPS = this.fuToFlow(coldFU);
    const hotFlowLPS = this.fuToFlow(hotFU);
    const totalFlowLPS = this.fuToFlow(totalFU);

    return {
      coldWater: { fixtureUnits: coldFU, flowLPS: coldFlowLPS, flowLPM: parseFloat((coldFlowLPS * 60).toFixed(1)) },
      hotWater: { fixtureUnits: hotFU, flowLPS: hotFlowLPS, flowLPM: parseFloat((hotFlowLPS * 60).toFixed(1)) },
      total: { fixtureUnits: totalFU, flowLPS: totalFlowLPS, flowLPM: parseFloat((totalFlowLPS * 60).toFixed(1)) },
      totalFlowLPS,
      totalFlowLPM: parseFloat((totalFlowLPS * 60).toFixed(1)),
      simultaneityFactor: totalFU > 0 ? parseFloat((totalFlowLPS / (totalFU * 0.15)).toFixed(3)) : 0,
    };
  }

  /**
   * Interpolate Hunter's curve
   */
  fuToFlow(fu) {
    const curve = PlumbingFixtureCalculator.HUNTERS_CURVE_FLUSH_TANK;
    if (fu <= 0) return 0;
    if (fu >= curve[curve.length - 1].fu) {
      return curve[curve.length - 1].lps;
    }

    for (let i = 0; i < curve.length - 1; i++) {
      if (fu >= curve[i].fu && fu <= curve[i + 1].fu) {
        const ratio = (fu - curve[i].fu) / (curve[i + 1].fu - curve[i].fu);
        return parseFloat((curve[i].lps + ratio * (curve[i + 1].lps - curve[i].lps)).toFixed(3));
      }
    }
    return curve[0].lps;
  }

  /**
   * Size riser pipes
   */
  sizeRisers(totalFlowLPS, numberOfRisers, material) {
    const flowPerRiser = totalFlowLPS / numberOfRisers;
    const sizes = Object.entries(PlumbingFixtureCalculator.PIPE_CAPACITY_LPS);

    let selectedSize = 50;
    for (const [size, capacity] of sizes) {
      if (flowPerRiser <= capacity.max && flowPerRiser >= capacity.min * 0.5) {
        selectedSize = parseInt(size);
        break;
      }
    }

    const actualArea = Math.PI * Math.pow(selectedSize / 2000, 2);
    const velocity = (flowPerRiser / 1000) / actualArea;

    return {
      numberOfRisers,
      flowPerRiserLPS: parseFloat(flowPerRiser.toFixed(2)),
      riserSize: selectedSize,
      velocityMs: parseFloat(velocity.toFixed(2)),
      material,
      velocityCompliant: velocity >= 0.6 && velocity <= 2.5,
    };
  }

  /**
   * Size branch pipes for each floor
   */
  sizeBranches(floorDetails, fixtureTable, material) {
    return floorDetails.map(floor => {
      const floorFlowLPS = this.fuToFlow(floor.totalFU);
      const sizes = Object.entries(PlumbingFixtureCalculator.PIPE_CAPACITY_LPS);

      let branchSize = 20;
      for (const [size, capacity] of sizes) {
        if (floorFlowLPS <= capacity.max) {
          branchSize = parseInt(size);
          break;
        }
      }

      return {
        floorName: floor.name,
        fixtureUnits: floor.totalFU,
        flowLPS: parseFloat(floorFlowLPS.toFixed(3)),
        branchPipeSize: branchSize,
        material,
      };
    });
  }

  /**
   * Size hot water system
   */
  sizeHotWaterSystem(hotFU, projectType) {
    const hotFlowLPS = this.fuToFlow(hotFU);
    const hotFlowLPH = hotFlowLPS * 3600;

    // Storage type water heater sizing
    // Recovery rate for electric heater: ~20 LPH per kW at 45°C rise
    const tempRise = 35; // °C (15→50°C)
    const storageVolume = hotFlowLPH * 0.7; // 70% of peak hour demand
    const heaterPower = storageVolume / 20; // kW

    // Solar water heater sizing (for residential)
    const solarFraction = projectType === 'RESIDENTIAL' ? 0.80 : 0.60;
    const solarCollectorArea = (storageVolume * 4.18 * tempRise) / (4000 * 0.60); // m² (4 kWh/m²/day, 60% efficiency)

    // Standard heater sizes
    const standardSizes = [15, 25, 35, 50, 100, 150, 200, 250, 300, 500, 1000, 2000];
    const selectedStorage = standardSizes.find(s => s >= storageVolume) || storageVolume;

    return {
      hotWaterFU: hotFU,
      peakFlowLPS: parseFloat(hotFlowLPS.toFixed(3)),
      peakFlowLPH: Math.round(hotFlowLPH),
      temperatureRise: tempRise,
      storageVolumeL: Math.round(storageVolume),
      selectedStorageL: selectedStorage,
      heaterPowerKW: parseFloat(heaterPower.toFixed(1)),
      solarOption: {
        solarFraction,
        collectorAreaM2: parseFloat(solarCollectorArea.toFixed(1)),
        electricBackupKW: parseFloat((heaterPower * (1 - solarFraction)).toFixed(1)),
      },
      circulationPump: hotFlowLPH > 500 ? { required: true, flowLPM: Math.round(hotFlowLPH / 60), powerKW: 0.37 } : { required: false },
    };
  }

  /**
   * Generate piping material summary
   */
  generateMaterialSummary(riserSizing, branchSizing, buildingHeight) {
    const riserLength = buildingHeight * riserSizing.numberOfRisers;
    const branchLength = branchSizing.reduce((sum, b) => sum + 15, 0); // Approx 15m per floor branch

    return {
      riserPipe: { size: riserSizing.riserSize, material: riserSizing.material, totalLengthM: Math.round(riserLength) },
      branchPipes: branchSizing.map(b => ({ size: b.branchPipeSize, material: b.material })),
      estimatedTotalLengthM: Math.round(riserLength + branchLength),
      insulationRequired: true,
      insulationMaterial: 'Nitrile rubber (19mm thick) for hot water lines',
    };
  }
}

export default PlumbingFixtureCalculator;
