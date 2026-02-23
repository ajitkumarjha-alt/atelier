/**
 * Ventilation & Pressurization Calculation Service
 * 
 * Calculates ventilation requirements per IS 3103 / NBC 2016 and 
 * staircase pressurization per IS 5765 / BS EN 12101-6.
 * Covers car park ventilation, basement ventilation, and smoke extraction.
 */

class VentilationPressurizationCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Air Changes per Hour (ACH) requirements per NBC 2016 / IS 3103 ───
  static ACH_REQUIREMENTS = {
    // Mechanical Ventilation Required
    'Basement Parking': { ach: 6, minFreshAirPercent: 100, exhaustOnly: true },
    'Covered Parking': { ach: 6, minFreshAirPercent: 100, exhaustOnly: true },
    'Underground Parking': { ach: 8, minFreshAirPercent: 100, exhaustOnly: true },
    'Kitchen (Commercial)': { ach: 15, minFreshAirPercent: 80, exhaustOnly: false },
    'Kitchen (Residential)': { ach: 12, minFreshAirPercent: 100, exhaustOnly: true },
    'Toilet/Bathroom': { ach: 15, minFreshAirPercent: 100, exhaustOnly: true },
    'Laundry': { ach: 10, minFreshAirPercent: 100, exhaustOnly: true },
    'Gymnasium': { ach: 6, minFreshAirPercent: 50, exhaustOnly: false },
    'Server Room': { ach: 10, minFreshAirPercent: 30, exhaustOnly: false },
    'Electrical Room': { ach: 6, minFreshAirPercent: 100, exhaustOnly: true },
    'Pump Room': { ach: 6, minFreshAirPercent: 100, exhaustOnly: true },
    'Generator Room': { ach: 20, minFreshAirPercent: 100, exhaustOnly: true },
    'Transformer Room': { ach: 12, minFreshAirPercent: 100, exhaustOnly: true },
    'Garbage Room': { ach: 10, minFreshAirPercent: 100, exhaustOnly: true },
    'STP Room': { ach: 10, minFreshAirPercent: 100, exhaustOnly: true },
    'Common Corridor (basement)': { ach: 6, minFreshAirPercent: 100, exhaustOnly: true },
    'Swimming Pool Area': { ach: 4, minFreshAirPercent: 50, exhaustOnly: false },
  };

  // ─── Pressurization Requirements per IS 5765 / BS EN 12101-6 ──────────
  static PRESSURIZATION_STANDARDS = {
    staircase: {
      minPressurePa: 50,           // Minimum overpressure
      maxDoorOpeningForce: 100,     // N (max force to open door)
      maxDoorOpenForceN: 133,       // N on 1m² door with 50 Pa
      leakageArea: {
        'Single leaf door (rated)': 0.01,     // m² per door
        'Single leaf door (non-rated)': 0.02,
        'Double leaf door': 0.03,
        'Lift landing door': 0.06,
      },
      airVelocityAtOpenDoor: 1.0,  // m/s minimum through open door
    },
    'fire_lift_lobby': {
      minPressurePa: 50,
      leakageArea: { 'Lift lobby door': 0.02, 'Lift shaft openings': 0.04 },
    },
    'lift_shaft': {
      minPressurePa: 25,
      leakageArea: { 'Per landing door': 0.06 },
    },
  };

  // ─── Fan Types & Specifications ────────────────────────────────────────
  static FAN_TYPES = {
    'Axial Flow': { maxCFM: 100000, maxStaticPa: 500, efficiency: [0.60, 0.80], application: 'Car park, supply/exhaust' },
    'Centrifugal (forward curved)': { maxCFM: 30000, maxStaticPa: 1500, efficiency: [0.55, 0.75], application: 'General HVAC' },
    'Centrifugal (backward curved)': { maxCFM: 50000, maxStaticPa: 3000, efficiency: [0.70, 0.85], application: 'High pressure systems' },
    'Mixed Flow': { maxCFM: 50000, maxStaticPa: 800, efficiency: [0.65, 0.80], application: 'Car park, inline' },
    'Jet Fan': { maxCFM: 0, maxStaticPa: 0, efficiency: [0.50, 0.70], application: 'Car park (ductless)' },
    'Smoke Extraction (rated 300°C/2h)': { maxCFM: 80000, maxStaticPa: 1000, efficiency: [0.55, 0.75], application: 'Smoke exhaust' },
  };

  // ─── CO Sensor-Based Ventilation Parameters ───────────────────────────
  static CO_SENSOR_PARAMS = {
    normalLevel: 25,           // ppm — fans at low speed
    level1Alarm: 50,           // ppm — fans at medium speed
    level2Alarm: 100,          // ppm — fans at full speed
    level3Alarm: 200,          // ppm — alarm + full exhaust
    sensorSpacingM: 20,        // max 20m between sensors
    sensorHeight: 1.5,         // m from floor
    numberOfSensorsPerZone: 3, // minimum redundancy
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const { zones = [] } = params;

    const zoneResults = [];
    let totalSupplyCFM = 0;
    let totalExhaustCFM = 0;
    let totalFanPowerKW = 0;

    for (const zone of zones) {
      let result;
      if (zone.type === 'PRESSURIZATION') {
        result = this.calculatePressurization(zone);
      } else if (zone.type === 'SMOKE_EXTRACTION') {
        result = this.calculateSmokeExtraction(zone);
      } else {
        result = this.calculateVentilation(zone);
      }
      zoneResults.push(result);
      totalSupplyCFM += result.supplyCFM || 0;
      totalExhaustCFM += result.exhaustCFM || 0;
      totalFanPowerKW += result.totalFanPowerKW || 0;
    }

    return {
      zoneResults,
      summary: {
        totalZones: zones.length,
        totalSupplyCFM: Math.round(totalSupplyCFM),
        totalExhaustCFM: Math.round(totalExhaustCFM),
        totalFanPowerKW: parseFloat(totalFanPowerKW.toFixed(1)),
        totalFanPowerHP: parseFloat((totalFanPowerKW * 1.341).toFixed(1)),
      },
    };
  }

  /**
   * Calculate general ventilation for a zone
   */
  calculateVentilation(zone) {
    const {
      name,
      spaceType = 'Basement Parking',
      length = 50,   // m
      width = 30,     // m
      height = 3.0,   // m
      useJetFans = false,
      ductLengthM = 50,
      numberOfBends = 6,
      fanStaticPressurePa = null,
    } = zone;

    const area = length * width;
    const volume = area * height;
    const spec = VentilationPressurizationCalculator.ACH_REQUIREMENTS[spaceType]
      || VentilationPressurizationCalculator.ACH_REQUIREMENTS['Basement Parking'];

    // Volume flow rate
    const volumeFlowM3h = volume * spec.ach;
    const volumeFlowCFM = volumeFlowM3h / 1.699;
    const volumeFlowM3s = volumeFlowM3h / 3600;

    // Duct sizing (if not jet fan)
    let ductSizing = null;
    let fanSelection = null;

    if (!useJetFans) {
      ductSizing = this.sizeDuct(volumeFlowM3s);
      
      // Fan static pressure calculation
      const staticPressure = fanStaticPressurePa || this.calculateFanStaticPressure(
        volumeFlowM3s, ductSizing.selectedSize, ductLengthM, numberOfBends
      );

      fanSelection = this.selectFan(volumeFlowCFM, staticPressure, spaceType, spec.exhaustOnly);
    } else {
      // Jet fan system for car parks
      fanSelection = this.selectJetFans(area, height);
    }

    // CO sensor layout for car parks
    let coSensorLayout = null;
    if (spaceType.toLowerCase().includes('parking')) {
      coSensorLayout = this.designCOSensorLayout(area, length, width);
    }

    return {
      name,
      spaceType,
      type: 'VENTILATION',
      dimensions: { length, width, height, area, volume },
      requirements: {
        ach: spec.ach,
        exhaustOnly: spec.exhaustOnly,
        freshAirPercent: spec.minFreshAirPercent,
      },
      airflow: {
        volumeFlowM3h: Math.round(volumeFlowM3h),
        volumeFlowCFM: Math.round(volumeFlowCFM),
        volumeFlowM3s: parseFloat(volumeFlowM3s.toFixed(2)),
      },
      supplyCFM: spec.exhaustOnly ? 0 : Math.round(volumeFlowCFM * 0.9),
      exhaustCFM: Math.round(volumeFlowCFM),
      ductSizing,
      fanSelection,
      totalFanPowerKW: fanSelection?.totalPowerKW || 0,
      coSensorLayout,
      useJetFans,
    };
  }

  /**
   * Calculate staircase / lobby pressurization per IS 5765
   */
  calculatePressurization(zone) {
    const {
      name,
      pressurizationType = 'staircase',     // staircase | fire_lift_lobby | lift_shaft
      numberOfFloors = 20,
      floorHeight = 3.0,                     // m
      numberOfDoors = null,                   // auto-calculate if null
      doorType = 'Single leaf door (rated)',
      staircaseArea = 12,                     // m² (cross-section of staircase)
      numberOfSimultaneousOpenDoors = 2,     // NBC: at least 2 doors open simultaneously
      ductLengthM = null,                     // Auto: building height + 10m
    } = zone;

    const standards = VentilationPressurizationCalculator.PRESSURIZATION_STANDARDS[pressurizationType]
      || VentilationPressurizationCalculator.PRESSURIZATION_STANDARDS.staircase;
    
    const doors = numberOfDoors || numberOfFloors + 1;
    const leakagePerDoor = standards.leakageArea[doorType] || 0.01;

    // Air leakage through closed doors
    // Q = Cd × A × √(2 × ΔP / ρ)
    const deltaP = standards.minPressurePa;
    const airDensity = 1.2; // kg/m³
    const Cd = 0.65; // discharge coefficient
    const closedDoors = doors - numberOfSimultaneousOpenDoors;
    const leakageThroughClosedDoors = closedDoors * Cd * leakagePerDoor * Math.sqrt(2 * deltaP / airDensity);

    // Air velocity through open doors: min 1.0 m/s
    const doorArea = doorType.includes('Double') ? 1.8 * 2.1 : 0.9 * 2.1; // m²
    const airThroughOpenDoors = numberOfSimultaneousOpenDoors * doorArea * standards.staircase?.airVelocityAtOpenDoor || 1.0;

    // Total airflow required
    const totalAirflowM3s = leakageThroughClosedDoors + airThroughOpenDoors;
    const totalAirflowCFM = totalAirflowM3s * 2119;

    // Duct/shaft sizing
    const shaftArea = staircaseArea * 0.3; // approximately 30% of staircase area for duct
    const ductVelocity = totalAirflowM3s / shaftArea;

    // Fan sizing
    const ductLength = ductLengthM || (numberOfFloors * floorHeight + 10);
    const systemStaticPressure = deltaP + (ductLength * 1.5) + 100; // Pa (ΔP + duct loss + grille loss)
    const fanSelection = this.selectFan(totalAirflowCFM, systemStaticPressure, 'pressurization', false);

    return {
      name,
      type: 'PRESSURIZATION',
      pressurizationType,
      parameters: {
        numberOfFloors,
        floorHeight,
        totalDoors: doors,
        doorType,
        simultaneousOpenDoors: numberOfSimultaneousOpenDoors,
        designPressurePa: deltaP,
      },
      leakageCalculation: {
        leakagePerDoorM2: leakagePerDoor,
        closedDoors,
        leakageThroughClosedDoorsM3s: parseFloat(leakageThroughClosedDoors.toFixed(3)),
        airThroughOpenDoorsM3s: parseFloat(airThroughOpenDoors.toFixed(3)),
      },
      airflow: {
        totalM3s: parseFloat(totalAirflowM3s.toFixed(2)),
        totalCFM: Math.round(totalAirflowCFM),
        totalM3h: Math.round(totalAirflowM3s * 3600),
      },
      supplyCFM: Math.round(totalAirflowCFM),
      exhaustCFM: 0,
      fanSelection,
      totalFanPowerKW: fanSelection?.totalPowerKW || 0,
      doorForceCheck: {
        maxForceN: standards.staircase?.maxDoorOpeningForce || 100,
        calculatedForceN: Math.round(deltaP * doorArea / 2 + 10), // F = ΔP × A/2 + spring force
        compliant: (deltaP * doorArea / 2 + 10) <= (standards.staircase?.maxDoorOpeningForce || 100),
      },
    };
  }

  /**
   * Calculate smoke extraction system
   */
  calculateSmokeExtraction(zone) {
    const {
      name,
      length = 50,
      width = 30,
      height = 3.0,
      smokeZoneArea = null,      // m² (auto if null)
      fireSize = 3000,            // kW (design fire size)
      smokeLayerHeight = 2.0,    // m (min clear height above floor)
    } = zone;

    const area = length * width;
    const zoneArea = smokeZoneArea || Math.min(area, 2000); // Max 2000 m² per smoke zone

    // Smoke production rate (per BS 7346-5 / CIBSE TM19)
    // M = 0.071 × P × y^(3/2) + 0.0018 × Q  (kg/s)
    const fireDiameter = Math.sqrt(fireSize / (300 * Math.PI)); // approximate
    const P = Math.PI * fireDiameter; // fire perimeter
    const y = height - smokeLayerHeight; // smoke layer depth
    const smokeProductionRate = 0.071 * P * Math.pow(y, 1.5) + 0.0018 * fireSize;

    // Smoke volume flow rate (at smoke temperature)
    const ambientTemp = 293; // K (20°C)
    const smokeTemp = ambientTemp + (fireSize / (smokeProductionRate * 1.0 * 1000)); // simplified
    const smokeFlowM3s = smokeProductionRate / 1.2 * (smokeTemp / ambientTemp);
    const smokeFlowCFM = smokeFlowM3s * 2119;

    // NBC requirement: minimum 6 ACH for smoke extraction
    const minFlowByACH = (area * height * 6) / 3600;
    const designFlowM3s = Math.max(smokeFlowM3s, minFlowByACH);
    const designFlowCFM = designFlowM3s * 2119;

    // Fan selection (smoke rated: 300°C for 2 hours)
    const systemPressure = 500; // Pa (typical for smoke duct systems)
    const fanSelection = this.selectFan(designFlowCFM, systemPressure, 'smoke_extraction', true);

    // Smoke barrier/curtain requirements
    const smokeZoneCount = Math.ceil(area / 2000);
    const smokeCurtainLength = smokeZoneCount > 1 ? (smokeZoneCount - 1) * width : 0;

    return {
      name,
      type: 'SMOKE_EXTRACTION',
      designFire: {
        fireSizeKW: fireSize,
        fireDiameterM: parseFloat(fireDiameter.toFixed(2)),
        smokeLayerHeightM: smokeLayerHeight,
        clearHeightM: smokeLayerHeight,
      },
      smokeProduction: {
        smokeRateKgS: parseFloat(smokeProductionRate.toFixed(3)),
        smokeTempK: Math.round(smokeTemp),
        smokeTempC: Math.round(smokeTemp - 273),
        smokeFlowM3s: parseFloat(smokeFlowM3s.toFixed(2)),
        minFlowByACHM3s: parseFloat(minFlowByACH.toFixed(2)),
      },
      airflow: {
        designFlowM3s: parseFloat(designFlowM3s.toFixed(2)),
        designFlowCFM: Math.round(designFlowCFM),
      },
      supplyCFM: Math.round(designFlowCFM * 0.8), // 80% make-up air
      exhaustCFM: Math.round(designFlowCFM),
      fanSelection,
      totalFanPowerKW: fanSelection?.totalPowerKW || 0,
      smokeZoning: {
        totalArea: area,
        maxZoneArea: 2000,
        numberOfZones: smokeZoneCount,
        smokeCurtainLengthM: Math.round(smokeCurtainLength),
        smokeCurtainDropM: Math.max(0.5, height - smokeLayerHeight),
      },
      fanRating: '300°C for 2 hours (BS EN 12101-3)',
    };
  }

  /**
   * Size rectangular duct
   */
  sizeDuct(flowM3s) {
    const targetVelocity = 8.0; // m/s for main ducts
    const requiredAreaM2 = flowM3s / targetVelocity;
    
    // Standard duct widths (mm)
    const standardWidths = [200, 250, 300, 400, 500, 600, 750, 800, 1000, 1200, 1500, 1800];
    const standardHeights = [200, 250, 300, 400, 500, 600, 750, 800];

    let selectedWidth = 600;
    let selectedHeight = 400;

    for (const w of standardWidths) {
      for (const h of standardHeights) {
        if ((w * h / 1e6) >= requiredAreaM2 && h <= w) {
          selectedWidth = w;
          selectedHeight = h;
          break;
        }
      }
      if ((selectedWidth * selectedHeight / 1e6) >= requiredAreaM2) break;
    }

    const actualArea = selectedWidth * selectedHeight / 1e6;
    const actualVelocity = flowM3s / actualArea;

    // Equivalent circular diameter
    const eqDia = 1.3 * Math.pow(selectedWidth * selectedHeight, 0.625) / Math.pow(selectedWidth + selectedHeight, 0.25);

    return {
      requiredAreaM2: parseFloat(requiredAreaM2.toFixed(4)),
      selectedSize: `${selectedWidth}mm × ${selectedHeight}mm`,
      selectedWidthMM: selectedWidth,
      selectedHeightMM: selectedHeight,
      actualAreaM2: parseFloat(actualArea.toFixed(4)),
      actualVelocityMs: parseFloat(actualVelocity.toFixed(1)),
      equivalentDiaMM: Math.round(eqDia),
      velocityCompliant: actualVelocity >= 5 && actualVelocity <= 12,
      material: 'GI Sheet (24 gauge for up to 750mm, 22 gauge above)',
    };
  }

  /**
   * Calculate fan static pressure
   */
  calculateFanStaticPressure(flowM3s, ductSize, ductLength, numberOfBends) {
    // Friction loss: ~1 Pa/m for standard duct velocities
    const ductFriction = ductLength * 1.0; // Pa
    const bendLoss = numberOfBends * 15; // Pa per bend (typical)
    const grilleLoss = 50; // Pa for supply/exhaust grilles
    const filterLoss = 100; // Pa for filter
    return Math.round(ductFriction + bendLoss + grilleLoss + filterLoss);
  }

  /**
   * Select fan for given duty
   */
  selectFan(cfm, staticPressurePa, application, isExhaust) {
    let fanType;
    if (application === 'smoke_extraction') {
      fanType = 'Smoke Extraction (rated 300°C/2h)';
    } else if (application === 'pressurization') {
      fanType = staticPressurePa > 1000 ? 'Centrifugal (backward curved)' : 'Centrifugal (forward curved)';
    } else if (cfm > 30000) {
      fanType = 'Axial Flow';
    } else {
      fanType = 'Mixed Flow';
    }

    const spec = VentilationPressurizationCalculator.FAN_TYPES[fanType];
    const efficiency = (spec.efficiency[0] + spec.efficiency[1]) / 2;

    // Fan power: P = Q × ΔP / (η × 1000)
    const flowM3s = cfm / 2119;
    const fanPowerKW = (flowM3s * staticPressurePa) / (efficiency * 1000);

    // Standard motor sizes (kW)
    const motorSizes = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75];
    const selectedMotor = motorSizes.find(s => s >= fanPowerKW) || fanPowerKW;

    // Number of fans (redundancy for critical systems)
    const numberOfFans = application === 'smoke_extraction' || application === 'pressurization' ? 2 : 1;

    return {
      fanType,
      application: isExhaust ? 'Exhaust' : 'Supply',
      flowCFM: Math.round(cfm / numberOfFans),
      staticPressurePa,
      efficiency: parseFloat(efficiency.toFixed(2)),
      calculatedPowerKW: parseFloat(fanPowerKW.toFixed(2)),
      motorPowerKW: selectedMotor,
      numberOfFans,
      configuration: numberOfFans > 1 ? '1W + 1S' : 'Single',
      totalPowerKW: parseFloat((selectedMotor * numberOfFans).toFixed(1)),
    };
  }

  /**
   * Select jet fans for car park ventilation
   */
  selectJetFans(area, height) {
    // Jet fan coverage: ~300-500 m² per fan
    const coveragePerFan = 400;
    const numberOfFans = Math.ceil(area / coveragePerFan);
    const fanDia = height > 3.5 ? 400 : 315; // mm
    const fanPowerKW = fanDia === 400 ? 2.2 : 1.1;

    return {
      fanType: 'Jet Fan',
      application: 'Car park ventilation (ductless)',
      numberOfFans,
      fanDiameter: fanDia,
      motorPowerKW: fanPowerKW,
      totalPowerKW: parseFloat((fanPowerKW * numberOfFans).toFixed(1)),
      thrust: fanDia === 400 ? '40N' : '25N',
      reversible: true,
      spacing: `Approx ${Math.round(Math.sqrt(coveragePerFan))}m grid`,
      coSensorControlled: true,
    };
  }

  /**
   * Design CO sensor layout for parking
   */
  designCOSensorLayout(area, length, width) {
    const params = VentilationPressurizationCalculator.CO_SENSOR_PARAMS;
    const numberOfSensors = Math.max(
      params.numberOfSensorsPerZone,
      Math.ceil(area / (params.sensorSpacingM * params.sensorSpacingM))
    );

    return {
      numberOfSensors,
      sensorSpacing: `${params.sensorSpacingM}m grid`,
      mountHeight: `${params.sensorHeight}m from floor`,
      alarmLevels: {
        normal: `≤${params.normalLevel} ppm — fans at low speed`,
        level1: `${params.level1Alarm} ppm — fans at medium speed`,
        level2: `${params.level2Alarm} ppm — fans at full speed`,
        level3: `${params.level3Alarm} ppm — alarm + evacuation`,
      },
      sensorType: 'Electrochemical CO sensor (0-500 ppm, ±5% accuracy)',
      cabling: '2-core shielded cable to BMS panel',
    };
  }
}

export default VentilationPressurizationCalculator;
