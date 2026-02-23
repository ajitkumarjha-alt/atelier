/**
 * HVAC Load Calculation Service
 * 
 * Performs cooling/heating load calculations per ASHRAE fundamentals and IS 3103
 * Supports room-by-room heat gain analysis with solar, transmission, ventilation, 
 * internal loads, and equipment sizing (chiller, AHU, fan coil units)
 * All factors are database-driven and configurable by L0 users
 */

class HVACLoadCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── U-Values for common constructions (W/m²·K) per IS 3792 ────────────
  static U_VALUES = {
    'Brick Wall 230mm (plastered)': 2.40,
    'Brick Wall 115mm (plastered)': 3.20,
    'RCC Wall 200mm': 3.50,
    'AAC Block 200mm (plastered)': 1.05,
    'Glass (single 6mm)': 5.80,
    'Glass (double glazed)': 2.80,
    'Glass (low-e double)': 1.80,
    'RCC Roof 150mm (no insulation)': 3.60,
    'RCC Roof + 50mm XPS': 0.55,
    'RCC Roof + 100mm XPS': 0.32,
    'Metal Roof (insulated)': 0.70,
    'Floor (on ground)': 1.50,
    'Floor (intermediate RCC)': 2.50,
    'Partition (gypsum double)': 2.50,
    'Partition (glass)': 5.80,
  };

  // ─── Solar Heat Gain Factors (W/m²) per orientation, latitude ~19°N (Mumbai) ─
  static SOLAR_HEAT_GAIN = {
    N:  { summer: 40,  monsoon: 35,  winter: 80 },
    NE: { summer: 120, monsoon: 100, winter: 80 },
    E:  { summer: 250, monsoon: 200, winter: 200 },
    SE: { summer: 200, monsoon: 180, winter: 250 },
    S:  { summer: 80,  monsoon: 70,  winter: 150 },
    SW: { summer: 200, monsoon: 180, winter: 250 },
    W:  { summer: 250, monsoon: 200, winter: 200 },
    NW: { summer: 120, monsoon: 100, winter: 80 },
    ROOF: { summer: 320, monsoon: 250, winter: 200 },
  };

  // ─── Internal Load Defaults ────────────────────────────────────────────
  static OCCUPANCY_HEAT = {
    RESIDENTIAL_LIVING: { sensible: 75, latent: 55 },    // W/person seated
    RESIDENTIAL_BEDROOM: { sensible: 60, latent: 40 },   // W/person resting
    OFFICE: { sensible: 75, latent: 55 },                // W/person moderate work
    RETAIL: { sensible: 75, latent: 55 },
    LOBBY: { sensible: 75, latent: 55 },
    GYM: { sensible: 210, latent: 315 },                 // W/person heavy activity
    RESTAURANT: { sensible: 75, latent: 55 },
    KITCHEN: { sensible: 115, latent: 140 },
  };

  // ─── Lighting power density defaults (W/m²) per ECBC 2017 ─────────────
  static LIGHTING_POWER_DENSITY = {
    RESIDENTIAL: 7.0,
    OFFICE: 9.0,
    RETAIL: 14.0,
    LOBBY: 10.0,
    CORRIDOR: 5.0,
    PARKING: 3.0,
    GYM: 10.0,
    RESTAURANT: 10.0,
    KITCHEN: 12.0,
  };

  // ─── Equipment power density defaults (W/m²) ──────────────────────────
  static EQUIPMENT_POWER_DENSITY = {
    RESIDENTIAL: 5.0,
    OFFICE: 15.0,
    RETAIL: 5.0,
    LOBBY: 2.0,
    CORRIDOR: 0,
    PARKING: 0,
    GYM: 10.0,
    RESTAURANT: 10.0,
    KITCHEN: 25.0,
  };

  // ─── Ventilation rates (L/s per person) per IS 3103 / ASHRAE 62.1 ─────
  static VENTILATION_RATES = {
    RESIDENTIAL: 7.5,
    OFFICE: 10.0,
    RETAIL: 7.5,
    LOBBY: 5.0,
    GYM: 15.0,
    RESTAURANT: 10.0,
    KITCHEN: 15.0,
    PARKING: 7.5,  // L/s per m² for parking
  };

  // ─── Outside design conditions for Indian cities ───────────────────────
  static DESIGN_CONDITIONS = {
    MUMBAI:    { summer: { db: 38, wb: 28, rh: 65 }, winter: { db: 16, rh: 50 } },
    PUNE:      { summer: { db: 40, wb: 24, rh: 40 }, winter: { db: 10, rh: 40 } },
    DELHI:     { summer: { db: 43, wb: 27, rh: 40 }, winter: { db: 4,  rh: 50 } },
    BANGALORE: { summer: { db: 36, wb: 23, rh: 40 }, winter: { db: 14, rh: 45 } },
    CHENNAI:   { summer: { db: 40, wb: 29, rh: 65 }, winter: { db: 18, rh: 60 } },
    HYDERABAD: { summer: { db: 42, wb: 25, rh: 35 }, winter: { db: 12, rh: 40 } },
    KOLKATA:   { summer: { db: 40, wb: 29, rh: 65 }, winter: { db: 10, rh: 55 } },
    AHMEDABAD: { summer: { db: 43, wb: 26, rh: 35 }, winter: { db: 10, rh: 35 } },
    DEFAULT:   { summer: { db: 40, wb: 27, rh: 50 }, winter: { db: 10, rh: 45 } },
  };

  // ─── Indoor design conditions ──────────────────────────────────────────
  static INDOOR_CONDITIONS = {
    RESIDENTIAL: { db: 24, rh: 55 },
    OFFICE:      { db: 24, rh: 50 },
    RETAIL:      { db: 24, rh: 50 },
    LOBBY:       { db: 26, rh: 55 },
    GYM:         { db: 22, rh: 50 },
    RESTAURANT:  { db: 24, rh: 50 },
    KITCHEN:     { db: 26, rh: 55 },
    SERVER_ROOM: { db: 22, rh: 45 },
  };

  /**
   * Main calculation entry point
   */
  async calculate(params, rooms, projectId) {
    const {
      city = 'MUMBAI',
      season = 'summer',
      safetyFactor = 1.10,
      ductLossFactor = 1.05,
      diversityFactor = 1.0,
    } = params;

    const outsideConditions = HVACLoadCalculator.DESIGN_CONDITIONS[city.toUpperCase()]
      || HVACLoadCalculator.DESIGN_CONDITIONS.DEFAULT;
    const outside = outsideConditions[season] || outsideConditions.summer;

    const roomResults = [];
    let totalSensible = 0;
    let totalLatent = 0;
    let totalVentilation = 0;

    for (const room of rooms) {
      const result = this.calculateRoom(room, outside, season);
      roomResults.push(result);
      totalSensible += result.totalSensibleHeatGain;
      totalLatent += result.totalLatentHeatGain;
      totalVentilation += result.ventilationLoad;
    }

    const grandTotalLoad = (totalSensible + totalLatent + totalVentilation) * safetyFactor * ductLossFactor;
    const grandTotalTR = grandTotalLoad / 3517;  // 1 TR = 3517 W

    // Equipment sizing
    const chillerSizing = this.sizeChiller(grandTotalTR, diversityFactor);
    const ahuSizing = this.sizeAHUs(roomResults);
    const coolingTowerSizing = this.sizeCoolingTower(chillerSizing.selectedCapacityTR);

    return {
      designConditions: {
        city,
        season,
        outside,
        safetyFactor,
        ductLossFactor,
        diversityFactor,
      },
      roomResults,
      summary: {
        totalSensibleHeatGain: Math.round(totalSensible),
        totalLatentHeatGain: Math.round(totalLatent),
        totalVentilationLoad: Math.round(totalVentilation),
        subtotalLoad: Math.round(totalSensible + totalLatent + totalVentilation),
        safetyFactorApplied: safetyFactor,
        ductLossApplied: ductLossFactor,
        grandTotalLoad: Math.round(grandTotalLoad),
        grandTotalTR: parseFloat(grandTotalTR.toFixed(2)),
        grandTotalBTU: Math.round(grandTotalLoad * 3.412),
      },
      chillerSizing,
      ahuSizing,
      coolingTowerSizing,
    };
  }

  /**
   * Calculate heat gain for a single room/zone
   */
  calculateRoom(room, outside, season) {
    const {
      name,
      spaceType = 'RESIDENTIAL',
      area = 0,                           // m²
      height = 3.0,                       // m
      occupancy = 0,                      // number of people
      walls = [],                         // [{ orientation, area, constructionType, shading }]
      windows = [],                       // [{ orientation, area, glassType, shading, shadingCoeff }]
      roofArea = 0,                       // m² (0 if intermediate floor)
      roofType = 'RCC Roof 150mm (no insulation)',
      floorArea = 0,
      floorType = 'Floor (intermediate RCC)',
      lightingDensity = null,             // W/m² override
      equipmentDensity = null,            // W/m² override
    } = room;

    const indoor = HVACLoadCalculator.INDOOR_CONDITIONS[spaceType]
      || HVACLoadCalculator.INDOOR_CONDITIONS.RESIDENTIAL;
    const deltaT = outside.db - indoor.db;

    // 1. Wall transmission heat gain
    let wallTransmission = 0;
    for (const wall of walls) {
      const uValue = HVACLoadCalculator.U_VALUES[wall.constructionType] || 2.40;
      wallTransmission += uValue * wall.area * deltaT;
    }

    // 2. Glass solar heat gain + transmission
    let glassSolar = 0;
    let glassTransmission = 0;
    for (const win of windows) {
      const uValue = HVACLoadCalculator.U_VALUES[win.glassType] || 5.80;
      glassTransmission += uValue * win.area * deltaT;
      const shgf = HVACLoadCalculator.SOLAR_HEAT_GAIN[win.orientation]?.[season] || 100;
      const sc = win.shadingCoeff || 0.87;   // No shading default
      const shadingReduction = win.shading ? 0.5 : 1.0;
      glassSolar += shgf * win.area * sc * shadingReduction;
    }

    // 3. Roof heat gain (only for top floor)
    const roofU = HVACLoadCalculator.U_VALUES[roofType] || 3.60;
    const roofHeatGain = roofArea > 0 ? roofU * roofArea * (deltaT + 10) : 0; // +10°C sol-air

    // 4. Floor heat gain
    const floorU = HVACLoadCalculator.U_VALUES[floorType] || 2.50;
    const floorHeatGain = floorArea > 0 ? floorU * floorArea * (deltaT * 0.3) : 0; // 30% of deltaT

    // 5. Internal loads — People
    const occupancySpec = HVACLoadCalculator.OCCUPANCY_HEAT[spaceType]
      || HVACLoadCalculator.OCCUPANCY_HEAT.RESIDENTIAL_LIVING;
    const peopleSensible = occupancy * occupancySpec.sensible;
    const peopleLatent = occupancy * occupancySpec.latent;

    // 6. Internal loads — Lighting
    const lpd = lightingDensity
      || HVACLoadCalculator.LIGHTING_POWER_DENSITY[spaceType]
      || 7.0;
    const lightingLoad = lpd * area;

    // 7. Internal loads — Equipment
    const epd = equipmentDensity
      || HVACLoadCalculator.EQUIPMENT_POWER_DENSITY[spaceType]
      || 5.0;
    const equipmentLoad = epd * area;

    // 8. Ventilation load (sensible + latent)
    const ventRate = HVACLoadCalculator.VENTILATION_RATES[spaceType] || 7.5;
    const freshAirLps = ventRate * occupancy;
    const freshAirCFM = freshAirLps * 2.119;
    const ventSensible = 1.23 * freshAirLps * deltaT;      // W
    const ventLatent = 3010 * freshAirLps * ((outside.rh - indoor.rh) / 100) * 0.01;  // simplified
    const ventilationLoad = ventSensible + Math.abs(ventLatent);

    // Totals
    const totalSensibleHeatGain = wallTransmission + glassTransmission + glassSolar
      + roofHeatGain + floorHeatGain + peopleSensible + lightingLoad + equipmentLoad;
    const totalLatentHeatGain = peopleLatent;
    const totalRoomLoad = totalSensibleHeatGain + totalLatentHeatGain + ventilationLoad;
    const roomTR = totalRoomLoad / 3517;

    // Room airflow requirement (CFM)
    const supplyAirDeltaT = 12; // °C supply/return difference
    const supplyAirCFM = (totalSensibleHeatGain * 3.412) / (1.08 * supplyAirDeltaT * 1.8); // approximate

    return {
      name,
      spaceType,
      area,
      breakdown: {
        wallTransmission: Math.round(wallTransmission),
        glassTransmission: Math.round(glassTransmission),
        glassSolar: Math.round(glassSolar),
        roofHeatGain: Math.round(roofHeatGain),
        floorHeatGain: Math.round(floorHeatGain),
        peopleSensible: Math.round(peopleSensible),
        peopleLatent: Math.round(peopleLatent),
        lightingLoad: Math.round(lightingLoad),
        equipmentLoad: Math.round(equipmentLoad),
        ventSensible: Math.round(ventSensible),
        ventLatent: Math.round(Math.abs(ventLatent)),
      },
      totalSensibleHeatGain: Math.round(totalSensibleHeatGain),
      totalLatentHeatGain: Math.round(totalLatentHeatGain),
      sensibleHeatRatio: totalSensibleHeatGain / (totalSensibleHeatGain + totalLatentHeatGain) || 0,
      ventilationLoad: Math.round(ventilationLoad),
      totalRoomLoad: Math.round(totalRoomLoad),
      roomTR: parseFloat(roomTR.toFixed(2)),
      supplyAirCFM: Math.round(supplyAirCFM),
      freshAirCFM: Math.round(freshAirCFM),
    };
  }

  /**
   * Size chiller plant
   */
  sizeChiller(totalTR, diversityFactor = 1.0) {
    const diversifiedTR = totalTR * diversityFactor;
    // Standard chiller sizes (TR)
    const standardSizes = [10, 15, 20, 30, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 500, 600, 700, 800, 1000];
    
    // For N+1 redundancy, size at 2 × 60% load
    const perChillerTR = diversifiedTR / 2;
    const selectedSize = standardSizes.find(s => s >= perChillerTR) || standardSizes[standardSizes.length - 1];
    const numberOfChillers = diversifiedTR <= 30 ? 1 : 2; // small systems: single chiller
    const totalInstalledTR = selectedSize * (numberOfChillers + (numberOfChillers > 1 ? 1 : 0)); // N+1

    // Power consumption (approx 0.65 kW/TR for water-cooled screw)
    const chillerKW = selectedSize * 0.65;
    const primaryPumpKW = selectedSize * 0.03; // ~3% of chiller capacity
    const secondaryPumpKW = selectedSize * 0.035;
    const coolingTowerFanKW = selectedSize * 0.02;
    const totalPlantKW = chillerKW + primaryPumpKW + secondaryPumpKW + coolingTowerFanKW;

    return {
      requiredTR: parseFloat(diversifiedTR.toFixed(1)),
      numberOfChillers: numberOfChillers + (numberOfChillers > 1 ? 1 : 0),
      configuration: numberOfChillers > 1 ? `${numberOfChillers}W + 1S` : '1W',
      selectedCapacityTR: selectedSize,
      totalInstalledTR,
      chillerType: diversifiedTR > 100 ? 'Water-cooled Screw' : diversifiedTR > 30 ? 'Water-cooled Scroll' : 'Air-cooled Scroll',
      copEstimate: diversifiedTR > 100 ? 5.5 : diversifiedTR > 30 ? 4.5 : 3.5,
      iplvEstimate: diversifiedTR > 100 ? 7.5 : diversifiedTR > 30 ? 6.0 : 4.5,
      powerBreakdown: {
        chillerKW: Math.round(chillerKW),
        primaryPumpKW: Math.round(primaryPumpKW),
        secondaryPumpKW: Math.round(secondaryPumpKW),
        coolingTowerFanKW: Math.round(coolingTowerFanKW),
        totalPlantKW: Math.round(totalPlantKW),
      },
    };
  }

  /**
   * Size AHUs based on room results
   */
  sizeAHUs(roomResults) {
    const zones = [];
    let totalCFM = 0;
    let totalFreshAirCFM = 0;

    for (const room of roomResults) {
      zones.push({
        name: room.name,
        supplyAirCFM: room.supplyAirCFM,
        freshAirCFM: room.freshAirCFM,
        loadTR: room.roomTR,
      });
      totalCFM += room.supplyAirCFM;
      totalFreshAirCFM += room.freshAirCFM;
    }

    // Standard AHU sizes (CFM)
    const standardAHUSizes = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
    const selectedAHUSize = standardAHUSizes.find(s => s >= totalCFM) || totalCFM;
    const ahuCount = totalCFM > 30000 ? Math.ceil(totalCFM / 20000) : 1;
    const perAHUCFM = Math.ceil(totalCFM / ahuCount);
    const ahuSize = standardAHUSizes.find(s => s >= perAHUCFM) || perAHUCFM;

    // Fan power (approx 0.0007 kW per CFM at 50mm WG)
    const fanKW = ahuSize * 0.0007 * ahuCount;

    return {
      zones,
      totalSupplyAirCFM: Math.round(totalCFM),
      totalFreshAirCFM: Math.round(totalFreshAirCFM),
      ahuCount,
      ahuCapacityCFM: ahuSize,
      fanPowerKW: parseFloat(fanKW.toFixed(1)),
      filterType: 'Pre-filter (G4) + Fine filter (F7)',
    };
  }

  /**
   * Size cooling tower
   */
  sizeCoolingTower(chillerTR) {
    // Cooling tower capacity = chiller TR × 1.25 (condenser heat rejection)
    const ctCapacityTR = chillerTR * 1.25;
    const waterFlowGPM = ctCapacityTR * 3.0; // ~3 GPM/TR
    const waterFlowLPM = waterFlowGPM * 3.785;
    const fanKW = ctCapacityTR * 0.02;

    return {
      capacityTR: Math.round(ctCapacityTR),
      waterFlowLPM: Math.round(waterFlowLPM),
      approachTemp: 4,   // °C
      rangeTemp: 5,      // °C
      fanPowerKW: parseFloat(fanKW.toFixed(1)),
      type: ctCapacityTR > 200 ? 'Induced Draft Cross-flow' : 'Induced Draft Counter-flow',
    };
  }
}

export default HVACLoadCalculator;
