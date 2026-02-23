/**
 * Fire Pump Calculation Service
 * 
 * Performs hydraulic calculations for fire fighting systems per NBC 2016 Part 4,
 * IS 3844, IS 15105, and TAC (Television Approval Committee) guidelines.
 * Sizes fire pumps (main, standby, jockey, diesel), fire water tanks,
 * and sprinkler system requirements.
 */

class FirePumpCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── NBC 2016 Part 4 — Fire Water Demand ────────────────────────────────
  // Water demand based on building height and occupancy type
  static FIRE_WATER_DEMAND = {
    // Residential buildings
    RESIDENTIAL: {
      'UP_TO_15M':    { hydrantLPM: 0,    sprinklerLPM: 0,    durationMin: 0,   tankLitres: 0 },
      '15M_TO_24M':   { hydrantLPM: 900,  sprinklerLPM: 0,    durationMin: 30,  tankLitres: 50000 },
      '24M_TO_45M':   { hydrantLPM: 1800, sprinklerLPM: 0,    durationMin: 60,  tankLitres: 110000 },
      '45M_TO_60M':   { hydrantLPM: 2700, sprinklerLPM: 0,    durationMin: 60,  tankLitres: 170000 },
      'ABOVE_60M':    { hydrantLPM: 2700, sprinklerLPM: 1500, durationMin: 60,  tankLitres: 250000 },
    },
    // Commercial / Mixed-use
    COMMERCIAL: {
      'UP_TO_15M':    { hydrantLPM: 900,  sprinklerLPM: 0,    durationMin: 30,  tankLitres: 50000 },
      '15M_TO_24M':   { hydrantLPM: 1800, sprinklerLPM: 0,    durationMin: 60,  tankLitres: 110000 },
      '24M_TO_45M':   { hydrantLPM: 2700, sprinklerLPM: 1500, durationMin: 60,  tankLitres: 250000 },
      '45M_TO_60M':   { hydrantLPM: 2700, sprinklerLPM: 1500, durationMin: 60,  tankLitres: 300000 },
      'ABOVE_60M':    { hydrantLPM: 2700, sprinklerLPM: 1500, durationMin: 60,  tankLitres: 350000 },
    },
  };

  // ─── Pump Sizing References ─────────────────────────────────────────────
  static STANDARD_PUMP_SIZES = {
    // kW ratings for standard fire pumps
    ELECTRIC: [5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200],
    DIESEL:   [7.5, 11, 15, 22, 30, 37, 55, 75, 110, 132, 160, 200, 250],
  };

  // ─── Sprinkler System Parameters per IS 15105 / NFPA 13 ────────────────
  static SPRINKLER_HAZARD_CLASS = {
    LIGHT: {
      description: 'Light Hazard (Residential, Office, Hospital)',
      designDensity: 2.25,   // mm/min (L/min/m²)
      operatingArea: 84,     // m²
      maxSpacingM2: 21,      // m² per head
      maxSpacing: 4.6,       // m between heads
      kFactor: 5.6,
      numberOfHeads: 6,      // minimum operating heads
    },
    ORDINARY_1: {
      description: 'Ordinary Hazard Group 1 (Parking, Retail)',
      designDensity: 4.1,
      operatingArea: 139,
      maxSpacingM2: 12.1,
      maxSpacing: 4.0,
      kFactor: 8.0,
      numberOfHeads: 15,
    },
    ORDINARY_2: {
      description: 'Ordinary Hazard Group 2 (Manufacturing)',
      designDensity: 4.1,
      operatingArea: 139,
      maxSpacingM2: 12.1,
      maxSpacing: 4.0,
      kFactor: 8.0,
      numberOfHeads: 20,
    },
    HIGH: {
      description: 'High Hazard (Warehouse, Chemical Storage)',
      designDensity: 8.1,
      operatingArea: 260,
      maxSpacingM2: 9.3,
      maxSpacing: 3.7,
      kFactor: 11.2,
      numberOfHeads: 30,
    },
  };

  // ─── Pipe friction loss coefficients (Hazen-Williams C values) ─────────
  static HAZEN_WILLIAMS_C = {
    'Black Steel': 120,
    'Galvanized Steel': 120,
    'Stainless Steel': 140,
    'Copper': 140,
    'CPVC': 150,
    'HDPE': 150,
    'CI (old)': 100,
    'CI (new/lined)': 130,
  };

  // ─── Standard pipe sizes (mm) ──────────────────────────────────────────
  static STANDARD_PIPE_SIZES = [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      buildingType = 'RESIDENTIAL',
      buildingHeight = 30,            // m
      numberOfBuildings = 1,
      numberOfFloors = 10,
      floorHeight = 3.0,              // m
      hasSprinkler = false,
      hasWetRiser = true,
      hasDryRiser = false,
      totalFloorArea = 5000,          // m²
      basementLevels = 0,
      hasParking = false,
      parkingArea = 0,
      pipeType = 'Black Steel',
      longestPipeRun = 100,           // m
      numberOfBends = 10,
      numberOfTees = 5,
      numberOfValves = 4,
      sprinklerHazardClass = 'LIGHT',
      numberOfSprinklerHeads = 0,
    } = params;

    const heightCategory = this.getHeightCategory(buildingHeight);
    const occupancyType = buildingType.toUpperCase().includes('COMMERCIAL') ? 'COMMERCIAL' : 'RESIDENTIAL';
    const demand = FirePumpCalculator.FIRE_WATER_DEMAND[occupancyType]?.[heightCategory]
      || FirePumpCalculator.FIRE_WATER_DEMAND.RESIDENTIAL['15M_TO_24M'];

    // 1. Hydrant system sizing
    const hydrantSystem = this.calculateHydrantSystem(demand, buildingHeight, numberOfFloors, floorHeight, pipeType, longestPipeRun, numberOfBends, numberOfTees, numberOfValves);

    // 2. Sprinkler system sizing (if applicable)
    let sprinklerSystem = null;
    if (hasSprinkler || demand.sprinklerLPM > 0) {
      sprinklerSystem = this.calculateSprinklerSystem(
        sprinklerHazardClass,
        totalFloorArea,
        numberOfSprinklerHeads,
        buildingHeight,
        numberOfFloors,
        floorHeight,
        pipeType,
        longestPipeRun
      );
    }

    // 3. Fire water tank sizing
    const tankSizing = this.calculateTankSizing(demand, numberOfBuildings, buildingHeight);

    // 4. Jockey pump sizing
    const jockeyPump = this.calculateJockeyPump(hydrantSystem.systemPressureBar);

    // 5. Diesel pump sizing (standby)
    const dieselPump = this.calculateDieselPump(hydrantSystem.pumpFlowLPM, hydrantSystem.totalHeadM);

    // 6. Pump room sizing
    const pumpRoomSizing = this.calculatePumpRoomSize(hydrantSystem, sprinklerSystem, dieselPump);

    return {
      buildingInfo: {
        buildingType,
        buildingHeight,
        heightCategory,
        occupancyType,
        numberOfBuildings,
        numberOfFloors,
        hasSprinkler: hasSprinkler || demand.sprinklerLPM > 0,
        hasWetRiser,
        hasDryRiser,
      },
      nbcRequirements: demand,
      hydrantSystem,
      sprinklerSystem,
      tankSizing,
      jockeyPump,
      dieselPump,
      pumpRoomSizing,
      totalElectricalLoad: {
        mainPumpKW: hydrantSystem.pumpPowerKW,
        sprinklerPumpKW: sprinklerSystem?.pumpPowerKW || 0,
        jockeyPumpKW: jockeyPump.powerKW,
        totalKW: hydrantSystem.pumpPowerKW + (sprinklerSystem?.pumpPowerKW || 0) + jockeyPump.powerKW,
        dieselPumpKW: dieselPump.ratedKW,
      },
    };
  }

  getHeightCategory(heightM) {
    if (heightM <= 15) return 'UP_TO_15M';
    if (heightM <= 24) return '15M_TO_24M';
    if (heightM <= 45) return '24M_TO_45M';
    if (heightM <= 60) return '45M_TO_60M';
    return 'ABOVE_60M';
  }

  /**
   * Calculate hydrant (wet riser) system
   */
  calculateHydrantSystem(demand, buildingHeight, numberOfFloors, floorHeight, pipeType, longestPipeRun, numberOfBends, numberOfTees, numberOfValves) {
    const flowLPM = demand.hydrantLPM;
    if (flowLPM <= 0) {
      return { required: false, pumpFlowLPM: 0, totalHeadM: 0, pumpPowerKW: 0, systemPressureBar: 0 };
    }

    const flowM3s = flowLPM / 60000;
    
    // Pipe sizing — velocity should be 1.5-3.0 m/s for fire mains
    const targetVelocity = 2.5;  // m/s
    const requiredAreaM2 = flowM3s / targetVelocity;
    const requiredDiaMM = Math.sqrt(requiredAreaM2 * 4 / Math.PI) * 1000;
    const selectedPipeDia = FirePumpCalculator.STANDARD_PIPE_SIZES.find(s => s >= requiredDiaMM) || 150;

    // Actual velocity
    const actualAreaM2 = Math.PI * Math.pow(selectedPipeDia / 2000, 2);
    const actualVelocity = flowM3s / actualAreaM2;

    // Friction loss using Hazen-Williams
    const C = FirePumpCalculator.HAZEN_WILLIAMS_C[pipeType] || 120;
    const frictionLossPerM = this.hazenWilliamsLoss(flowLPM, selectedPipeDia, C);
    const pipeFrictionLoss = frictionLossPerM * longestPipeRun;

    // Fitting equivalent lengths (approximate)
    const bendEquivLength = numberOfBends * selectedPipeDia * 0.03;
    const teeEquivLength = numberOfTees * selectedPipeDia * 0.05;
    const valveEquivLength = numberOfValves * selectedPipeDia * 0.02;
    const fittingFrictionLoss = frictionLossPerM * (bendEquivLength + teeEquivLength + valveEquivLength);

    // Total friction loss
    const totalFrictionLossM = pipeFrictionLoss + fittingFrictionLoss;

    // Static head = building height + basement depth + tank elevation
    const staticHeadM = buildingHeight + 10; // +10m for tank to roof connection

    // Residual pressure at topmost outlet (NBC: min 3.5 bar = 35m for hydrant)
    const residualPressureM = 35;

    // Total pump head
    const totalHeadM = staticHeadM + totalFrictionLossM + residualPressureM;
    const systemPressureBar = totalHeadM / 10.2;

    // Pump power: P = ρgQH / (η × 1000)
    const pumpEfficiency = 0.70;
    const pumpPowerKW = (1000 * 9.81 * flowM3s * totalHeadM) / (pumpEfficiency * 1000);
    const selectedPumpKW = FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC.find(s => s >= pumpPowerKW)
      || FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC[FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC.length - 1];

    return {
      required: true,
      pumpFlowLPM: flowLPM,
      pumpFlowM3h: parseFloat((flowLPM * 0.06).toFixed(1)),
      pipeSize: selectedPipeDia,
      pipeVelocityMs: parseFloat(actualVelocity.toFixed(2)),
      staticHeadM: Math.round(staticHeadM),
      frictionLossM: parseFloat(totalFrictionLossM.toFixed(1)),
      residualPressureM,
      totalHeadM: Math.round(totalHeadM),
      systemPressureBar: parseFloat(systemPressureBar.toFixed(1)),
      pumpPowerKW: selectedPumpKW,
      calculatedPumpKW: parseFloat(pumpPowerKW.toFixed(1)),
      pumpType: selectedPumpKW > 55 ? 'Horizontal Split Case' : 'End Suction',
      numberOfPumps: 2,
      configuration: 'Main + Standby (Electric)',
    };
  }

  /**
   * Calculate sprinkler system
   */
  calculateSprinklerSystem(hazardClass, totalFloorArea, headCount, buildingHeight, numberOfFloors, floorHeight, pipeType, longestPipeRun) {
    const hazard = FirePumpCalculator.SPRINKLER_HAZARD_CLASS[hazardClass]
      || FirePumpCalculator.SPRINKLER_HAZARD_CLASS.LIGHT;

    const calculatedHeads = headCount > 0 ? headCount : Math.ceil(totalFloorArea / hazard.maxSpacingM2);
    const operatingHeads = Math.max(hazard.numberOfHeads, Math.min(calculatedHeads, 30));

    // Flow from operating heads
    const flowPerHead = hazard.designDensity * hazard.maxSpacingM2;  // LPM
    const totalFlowLPM = flowPerHead * operatingHeads;

    // Pipe sizing
    const flowM3s = totalFlowLPM / 60000;
    const requiredDiaMM = Math.sqrt(flowM3s / 2.0 * 4 / Math.PI) * 1000;
    const selectedPipeDia = FirePumpCalculator.STANDARD_PIPE_SIZES.find(s => s >= requiredDiaMM) || 100;

    // Friction loss
    const C = FirePumpCalculator.HAZEN_WILLIAMS_C[pipeType] || 120;
    const frictionLossPerM = this.hazenWilliamsLoss(totalFlowLPM, selectedPipeDia, C);
    const totalFrictionLossM = frictionLossPerM * (longestPipeRun + 30); // +30m for fittings

    const staticHeadM = buildingHeight + 5;
    const residualPressureM = 7; // 0.7 bar for sprinklers
    const totalHeadM = staticHeadM + totalFrictionLossM + residualPressureM;

    // Pump power
    const pumpEfficiency = 0.70;
    const pumpPowerKW = (1000 * 9.81 * flowM3s * totalHeadM) / (pumpEfficiency * 1000);
    const selectedPumpKW = FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC.find(s => s >= pumpPowerKW)
      || FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC[FirePumpCalculator.STANDARD_PUMP_SIZES.ELECTRIC.length - 1];

    return {
      hazardClass,
      hazardDescription: hazard.description,
      designDensity: hazard.designDensity,
      operatingArea: hazard.operatingArea,
      totalHeads: calculatedHeads,
      operatingHeads,
      flowPerHeadLPM: parseFloat(flowPerHead.toFixed(1)),
      totalFlowLPM: Math.round(totalFlowLPM),
      mainPipeSize: selectedPipeDia,
      staticHeadM: Math.round(staticHeadM),
      frictionLossM: parseFloat(totalFrictionLossM.toFixed(1)),
      totalHeadM: Math.round(totalHeadM),
      pumpPowerKW: selectedPumpKW,
      calculatedPumpKW: parseFloat(pumpPowerKW.toFixed(1)),
      pumpType: 'End Suction',
      numberOfPumps: 2,
      configuration: 'Main + Standby',
    };
  }

  /**
   * Calculate fire water tank sizing
   */
  calculateTankSizing(demand, numberOfBuildings, buildingHeight) {
    let totalCapacity = demand.tankLitres;
    // For multiple buildings, NBC allows shared tank if within 100m of pump house
    if (numberOfBuildings > 1) {
      totalCapacity = Math.max(demand.tankLitres, demand.tankLitres * 1.3); // 30% extra for multiple buildings
    }

    const totalM3 = totalCapacity / 1000;
    
    // Tank dimensions (assuming depth of 3m for UGR)
    const tankDepthM = 3.0;
    const tankAreaM2 = totalM3 / tankDepthM;
    const tankSide = Math.sqrt(tankAreaM2);

    // Separate tanks for sprinkler and hydrant if both exist
    const hydrantTankRatio = demand.sprinklerLPM > 0 ? 0.6 : 1.0;
    const sprinklerTankRatio = demand.sprinklerLPM > 0 ? 0.4 : 0;

    return {
      totalCapacityLitres: totalCapacity,
      totalCapacityM3: parseFloat(totalM3.toFixed(1)),
      tankDepthM,
      tankAreaM2: Math.round(tankAreaM2),
      approxDimensions: `${Math.ceil(tankSide)}m × ${Math.ceil(tankSide)}m × ${tankDepthM}m`,
      hydrantTankLitres: Math.round(totalCapacity * hydrantTankRatio),
      sprinklerTankLitres: Math.round(totalCapacity * sprinklerTankRatio),
      durationMinutes: demand.durationMin,
      numberOfBuildings,
      tankType: totalCapacity > 100000 ? 'RCC Underground Reservoir' : 'RCC or MS Underground Tank',
    };
  }

  /**
   * Calculate jockey pump
   */
  calculateJockeyPump(systemPressureBar) {
    // Jockey pump: maintains system pressure + 1 bar above main pump shutoff
    const jockeyPressureBar = systemPressureBar + 1.0;
    const jockeyFlowLPM = 30; // Typical ~30 LPM
    const jockeyHeadM = jockeyPressureBar * 10.2;

    const powerKW = (1000 * 9.81 * (jockeyFlowLPM / 60000) * jockeyHeadM) / (0.60 * 1000);
    const standardSizes = [1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11];
    const selectedKW = standardSizes.find(s => s >= powerKW) || 5.5;

    return {
      flowLPM: jockeyFlowLPM,
      headM: Math.round(jockeyHeadM),
      pressureBar: parseFloat(jockeyPressureBar.toFixed(1)),
      powerKW: selectedKW,
      pumpType: 'Vertical Multistage',
    };
  }

  /**
   * Calculate diesel standby pump
   */
  calculateDieselPump(flowLPM, headM) {
    if (flowLPM <= 0) return { required: false };
    
    const flowM3s = flowLPM / 60000;
    const pumpEfficiency = 0.65;
    const engineEfficiency = 0.30;
    
    const ratedKW = (1000 * 9.81 * flowM3s * headM) / (pumpEfficiency * 1000);
    const selectedKW = FirePumpCalculator.STANDARD_PUMP_SIZES.DIESEL.find(s => s >= ratedKW)
      || FirePumpCalculator.STANDARD_PUMP_SIZES.DIESEL[FirePumpCalculator.STANDARD_PUMP_SIZES.DIESEL.length - 1];
    
    // Fuel consumption ~0.25 L/kW/hr
    const fuelConsumptionLPH = selectedKW * 0.25;
    const fuelTankLitres = fuelConsumptionLPH * 4; // 4-hour run capacity (NBC minimum)

    return {
      required: true,
      flowLPM,
      headM: Math.round(headM),
      ratedKW: selectedKW,
      engineHP: Math.round(selectedKW * 1.341),
      fuelConsumptionLPH: parseFloat(fuelConsumptionLPH.toFixed(1)),
      fuelTankLitres: Math.round(fuelTankLitres),
      startType: 'Auto-start on pressure drop',
      batteryType: '24V Lead-acid (dual bank)',
    };
  }

  /**
   * Calculate pump room dimensions
   */
  calculatePumpRoomSize(hydrantSystem, sprinklerSystem, dieselPump) {
    let pumpCount = 0;
    if (hydrantSystem.required) pumpCount += hydrantSystem.numberOfPumps;
    if (sprinklerSystem) pumpCount += sprinklerSystem.numberOfPumps;
    if (dieselPump.required) pumpCount += 1;
    pumpCount += 1; // jockey pump

    // Minimum pump room size per NBC
    const minLengthM = Math.max(6, 3 + pumpCount * 1.5);
    const minWidthM = Math.max(5, 4);
    const minHeightM = 3.5;

    return {
      totalPumps: pumpCount,
      minLengthM: Math.ceil(minLengthM),
      minWidthM: Math.ceil(minWidthM),
      minHeightM,
      minAreaM2: Math.ceil(minLengthM * minWidthM),
      ventilationRequired: dieselPump.required,
      drainageRequired: true,
      controlPanelLocation: 'Adjacent to pump room entrance',
    };
  }

  /**
   * Hazen-Williams friction loss calculation
   * Returns friction loss per metre of pipe (m-H2O/m)
   */
  hazenWilliamsLoss(flowLPM, pipeDiaMM, C) {
    // Q in L/min, d in mm → loss in m per m
    const Q = flowLPM;
    const d = pipeDiaMM;
    // HW formula: h = 10.67 × Q^1.852 / (C^1.852 × d^4.87) per metre
    // Converted for LPM and mm
    const loss = (6.05e5 * Math.pow(Q / 60, 1.852)) / (Math.pow(C, 1.852) * Math.pow(d / 1000, 4.87));
    return loss / 1000; // convert mm to m
  }
}

export default FirePumpCalculator;
