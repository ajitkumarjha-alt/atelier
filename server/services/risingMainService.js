/**
 * Rising Main / Bus Riser Design Service
 * 
 * Calculates floor-by-floor electrical load aggregation,
 * busbar/cable riser sizing, and voltage drop verification.
 * Covers Rising Main, Bus Riser, and Down Take designs.
 * Compliant with IS 732, IS 694, IS 8623, IEC 61439.
 */

class RisingMainCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Standard Busbar Sizes (IS 8623) ──────────────────────────────────
  static BUSBAR_RATINGS = [
    { ratingA: 200, size: '25×3mm Cu', reactanceOhmPerM: 0.00015, resistanceOhmPerM: 0.00090 },
    { ratingA: 400, size: '40×5mm Cu', reactanceOhmPerM: 0.00012, resistanceOhmPerM: 0.00045 },
    { ratingA: 630, size: '50×6mm Cu', reactanceOhmPerM: 0.00010, resistanceOhmPerM: 0.00029 },
    { ratingA: 800, size: '60×6mm Cu', reactanceOhmPerM: 0.00009, resistanceOhmPerM: 0.00024 },
    { ratingA: 1000, size: '80×6mm Cu', reactanceOhmPerM: 0.00008, resistanceOhmPerM: 0.00018 },
    { ratingA: 1250, size: '80×10mm Cu', reactanceOhmPerM: 0.00007, resistanceOhmPerM: 0.00014 },
    { ratingA: 1600, size: '100×10mm Cu', reactanceOhmPerM: 0.00006, resistanceOhmPerM: 0.00011 },
    { ratingA: 2000, size: '2×(80×6mm) Cu', reactanceOhmPerM: 0.00005, resistanceOhmPerM: 0.00009 },
    { ratingA: 2500, size: '2×(100×10mm) Cu', reactanceOhmPerM: 0.00005, resistanceOhmPerM: 0.00007 },
    { ratingA: 3200, size: '3×(80×10mm) Cu', reactanceOhmPerM: 0.00004, resistanceOhmPerM: 0.00005 },
    { ratingA: 4000, size: '3×(100×10mm) Cu', reactanceOhmPerM: 0.00004, resistanceOhmPerM: 0.00004 },
    { ratingA: 5000, size: '4×(100×10mm) Cu', reactanceOhmPerM: 0.00003, resistanceOhmPerM: 0.00003 },
  ];

  // ─── Standard Cable Sizes for Risers (XLPE Cu) ───────────────────────
  static RISER_CABLE_SIZES = [
    { sizeSqMM: 25, cccA: 110, rOhmPerKm: 0.727, xOhmPerKm: 0.08 },
    { sizeSqMM: 35, cccA: 137, rOhmPerKm: 0.524, xOhmPerKm: 0.08 },
    { sizeSqMM: 50, cccA: 167, rOhmPerKm: 0.387, xOhmPerKm: 0.08 },
    { sizeSqMM: 70, cccA: 216, rOhmPerKm: 0.268, xOhmPerKm: 0.08 },
    { sizeSqMM: 95, cccA: 264, rOhmPerKm: 0.193, xOhmPerKm: 0.08 },
    { sizeSqMM: 120, cccA: 308, rOhmPerKm: 0.153, xOhmPerKm: 0.08 },
    { sizeSqMM: 150, cccA: 356, rOhmPerKm: 0.124, xOhmPerKm: 0.08 },
    { sizeSqMM: 185, cccA: 410, rOhmPerKm: 0.0991, xOhmPerKm: 0.08 },
    { sizeSqMM: 240, cccA: 487, rOhmPerKm: 0.0754, xOhmPerKm: 0.08 },
    { sizeSqMM: 300, cccA: 561, rOhmPerKm: 0.0601, xOhmPerKm: 0.08 },
    { sizeSqMM: 400, cccA: 656, rOhmPerKm: 0.0470, xOhmPerKm: 0.08 },
    { sizeSqMM: 500, cccA: 749, rOhmPerKm: 0.0366, xOhmPerKm: 0.08 },
    { sizeSqMM: 630, cccA: 855, rOhmPerKm: 0.0283, xOhmPerKm: 0.08 },
  ];

  // ─── Diversity Factors for Multi-Floor Buildings ──────────────────────
  static FLOOR_DIVERSITY = {
    residential: [
      { floors: 5, factor: 0.9 },
      { floors: 10, factor: 0.8 },
      { floors: 15, factor: 0.75 },
      { floors: 20, factor: 0.7 },
      { floors: 30, factor: 0.65 },
      { floors: 50, factor: 0.6 },
    ],
    commercial: [
      { floors: 5, factor: 0.95 },
      { floors: 10, factor: 0.85 },
      { floors: 15, factor: 0.8 },
      { floors: 20, factor: 0.75 },
      { floors: 50, factor: 0.7 },
    ],
  };

  // ─── Voltage Drop Limits per IS 732 ───────────────────────────────────
  static VOLTAGE_DROP_LIMITS = {
    riser: 1.5,        // % max for riser section
    subMain: 1.0,      // % max for sub-main
    totalSystem: 5.0,  // % max total (transformer to final point)
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      designType = 'RISING_MAIN',      // RISING_MAIN | DOWN_TAKE | BUS_RISER
      riserType = 'BUSBAR',            // BUSBAR | CABLE
      systemVoltage = 415,
      phases = 3,
      powerFactor = 0.85,
      numberOfFloors = 20,
      floorHeight = 3.0,               // m
      buildingType = 'residential',
      floors = [],                      // Array of floor loads
      incomingSupplyFromFloor = 0,      // 0 = ground floor (rising), topFloor = down take
    } = params;

    // Generate floor loads if not provided
    const floorLoads = floors.length > 0 ? floors : this.generateDefaultFloorLoads(numberOfFloors, buildingType);

    // Calculate cumulative loads
    const floorResults = this.calculateFloorLoads(floorLoads, buildingType, powerFactor, systemVoltage, phases, numberOfFloors);

    // Determine supply direction
    const isDownTake = designType === 'DOWN_TAKE' || incomingSupplyFromFloor > 0;
    const supplyFloor = isDownTake ? numberOfFloors : 0;

    // Calculate cumulative current at each floor
    const cumulativeLoads = this.calculateCumulativeLoads(floorResults, supplyFloor, isDownTake);

    // Size riser
    let riserSizing;
    if (riserType === 'BUSBAR') {
      riserSizing = this.sizeBusbarRiser(cumulativeLoads, systemVoltage, phases, powerFactor);
    } else {
      riserSizing = this.sizeCableRiser(cumulativeLoads, systemVoltage, phases, powerFactor);
    }

    // Calculate voltage drop at each floor
    const voltageDropAnalysis = this.calculateVoltageDrops(
      cumulativeLoads, riserSizing, floorHeight, systemVoltage, phases, powerFactor, isDownTake
    );

    // Tap-off / isolation switch sizing
    const tapOffs = this.sizeTapOffs(floorResults);

    // Protection coordination
    const protection = this.sizeProtection(cumulativeLoads[0]?.cumulativeCurrentA || 0, floorResults);

    // Shaft sizing
    const shaftRequirement = this.calculateShaftSize(riserSizing, riserType);

    return {
      designInfo: {
        designType,
        riserType,
        systemVoltage,
        phases: `${phases} Phase + N + E`,
        powerFactor,
        buildingType,
        numberOfFloors,
        floorHeight,
        totalHeight: parseFloat((numberOfFloors * floorHeight).toFixed(1)),
        supplyDirection: isDownTake ? 'Down Take (Top to Bottom)' : 'Rising Main (Bottom to Top)',
      },
      floors: floorResults,
      cumulativeLoads,
      riserSizing,
      voltageDropAnalysis,
      tapOffs,
      protection,
      shaftRequirement,
      summary: {
        totalConnectedLoadKW: parseFloat(floorResults.reduce((sum, f) => sum + f.connectedLoadKW, 0).toFixed(1)),
        totalDiversifiedLoadKW: parseFloat(cumulativeLoads[0]?.cumulativeLoadKW?.toFixed(1) || '0'),
        maxCurrentA: parseFloat(cumulativeLoads[0]?.cumulativeCurrentA?.toFixed(1) || '0'),
        riserSize: riserSizing.selectedSize,
        maxVoltageDropPercent: voltageDropAnalysis.maxVoltageDrop?.percent || 0,
        maxVoltageDropFloor: voltageDropAnalysis.maxVoltageDrop?.floor || 0,
        compliant: voltageDropAnalysis.compliant,
      },
    };
  }

  /**
   * Generate default floor loads based on building type
   */
  generateDefaultFloorLoads(numberOfFloors, buildingType) {
    const floors = [];
    for (let i = 1; i <= numberOfFloors; i++) {
      if (buildingType === 'residential') {
        floors.push({
          floor: i,
          name: `Floor ${i}`,
          lightingKW: 4 * 4,      // 4 flats × 4 kW
          powerKW: 4 * 3,          // 4 flats × 3 kW
          acKW: 4 * 6,             // 4 flats × 6 kW (2×3TR splits)
          commonAreaKW: 2,         // corridor, staircase lighting
          spareaKW: 2,
        });
      } else {
        floors.push({
          floor: i,
          name: `Floor ${i}`,
          lightingKW: 40,          // ~500 sq m @ 8 W/m²
          powerKW: 30,             // sockets
          acKW: 60,                // ~500 sq m @ 120 W/m² cooling
          commonAreaKW: 5,
          spareKW: 5,
        });
      }
    }
    return floors;
  }

  /**
   * Calculate individual floor loads
   */
  calculateFloorLoads(floors, buildingType, pf, voltage, phases, totalFloors) {
    return floors.map(floor => {
      const connectedKW = (floor.lightingKW || 0) + (floor.powerKW || 0) + 
                          (floor.acKW || 0) + (floor.commonAreaKW || 0) + (floor.spareKW || 0);
      
      // Floor diversity (0.8-0.9 typically)
      const floorDiversity = 0.85;
      const diversifiedKW = connectedKW * floorDiversity;
      
      // Current
      const currentA = phases === 3 
        ? (diversifiedKW * 1000) / (Math.sqrt(3) * voltage * pf)
        : (diversifiedKW * 1000) / (voltage * pf);

      return {
        floor: floor.floor,
        name: floor.name || `Floor ${floor.floor}`,
        loadBreakdown: {
          lightingKW: floor.lightingKW || 0,
          powerKW: floor.powerKW || 0,
          acKW: floor.acKW || 0,
          commonAreaKW: floor.commonAreaKW || 0,
          spareKW: floor.spareKW || 0,
        },
        connectedLoadKW: parseFloat(connectedKW.toFixed(1)),
        diversifiedLoadKW: parseFloat(diversifiedKW.toFixed(1)),
        currentA: parseFloat(currentA.toFixed(1)),
      };
    });
  }

  /**
   * Calculate cumulative loads from supply point
   */
  calculateCumulativeLoads(floorResults, supplyFloor, isDownTake) {
    const sorted = [...floorResults].sort((a, b) => isDownTake ? b.floor - a.floor : a.floor - b.floor);
    
    let cumulativeKW = 0;
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
      cumulativeKW += sorted[i].diversifiedLoadKW;
      
      // Apply building diversity factor based on cumulative floor count
      const floorsFromSupply = i + 1;
      const buildingDiversity = this.getBuildingDiversityFactor(floorsFromSupply);
      const diversifiedCumulativeKW = cumulativeKW * buildingDiversity;
      
      result.push({
        floor: sorted[i].floor,
        distanceFromSupplyM: floorsFromSupply * 3, // approximate
        cumulativeConnectedKW: parseFloat(cumulativeKW.toFixed(1)),
        buildingDiversityFactor: buildingDiversity,
        cumulativeLoadKW: parseFloat(diversifiedCumulativeKW.toFixed(1)),
        cumulativeCurrentA: parseFloat((diversifiedCumulativeKW * 1000 / (Math.sqrt(3) * 415 * 0.85)).toFixed(1)),
      });
    }

    // Sort by floor for output
    return result.sort((a, b) => a.floor - b.floor);
  }

  /**
   * Get building diversity factor based on number of floors served
   */
  getBuildingDiversityFactor(floorsServed) {
    if (floorsServed <= 2) return 1.0;
    if (floorsServed <= 5) return 0.9;
    if (floorsServed <= 10) return 0.8;
    if (floorsServed <= 15) return 0.75;
    if (floorsServed <= 20) return 0.7;
    if (floorsServed <= 30) return 0.65;
    return 0.6;
  }

  /**
   * Size busbar riser
   */
  sizeBusbarRiser(cumulativeLoads, voltage, phases, pf) {
    const maxCurrentA = Math.max(...cumulativeLoads.map(c => c.cumulativeCurrentA));
    const designCurrent = maxCurrentA * 1.2; // 20% margin

    const selected = RisingMainCalculator.BUSBAR_RATINGS.find(b => b.ratingA >= designCurrent)
      || RisingMainCalculator.BUSBAR_RATINGS[RisingMainCalculator.BUSBAR_RATINGS.length - 1];

    return {
      type: 'BUSBAR',
      selectedSize: selected.size,
      ratingA: selected.ratingA,
      designCurrentA: parseFloat(designCurrent.toFixed(1)),
      maxCurrentA: parseFloat(maxCurrentA.toFixed(1)),
      utilization: parseFloat(((maxCurrentA / selected.ratingA) * 100).toFixed(1)),
      resistanceOhmPerM: selected.resistanceOhmPerM,
      reactanceOhmPerM: selected.reactanceOhmPerM,
      manufacturer: 'Busbar Trunking System (Sandwich type)',
      ipRating: 'IP54',
      fireRating: '2 hours',
    };
  }

  /**
   * Size cable riser
   */
  sizeCableRiser(cumulativeLoads, voltage, phases, pf) {
    const maxCurrentA = Math.max(...cumulativeLoads.map(c => c.cumulativeCurrentA));
    const designCurrent = maxCurrentA * 1.2;

    // May need parallel cables
    let cables = 1;
    let selected = RisingMainCalculator.RISER_CABLE_SIZES.find(c => c.cccA >= designCurrent);
    
    if (!selected) {
      // Need parallel cables
      cables = 2;
      selected = RisingMainCalculator.RISER_CABLE_SIZES.find(c => c.cccA * 2 >= designCurrent);
      if (!selected) {
        cables = 3;
        selected = RisingMainCalculator.RISER_CABLE_SIZES.find(c => c.cccA * 3 >= designCurrent);
      }
      if (!selected) {
        cables = 4;
        selected = RisingMainCalculator.RISER_CABLE_SIZES[RisingMainCalculator.RISER_CABLE_SIZES.length - 1];
      }
    }

    return {
      type: 'CABLE',
      selectedSize: `${cables > 1 ? cables + '×' : ''}${selected.sizeSqMM} sq mm XLPE Cu 4C`,
      sizeSqMM: selected.sizeSqMM,
      numberOfCables: cables,
      ratingA: selected.cccA * cables,
      designCurrentA: parseFloat(designCurrent.toFixed(1)),
      maxCurrentA: parseFloat(maxCurrentA.toFixed(1)),
      utilization: parseFloat(((maxCurrentA / (selected.cccA * cables)) * 100).toFixed(1)),
      resistanceOhmPerKm: selected.rOhmPerKm / cables,
      reactanceOhmPerKm: selected.xOhmPerKm,
      installation: 'Cable tray in electrical shaft',
    };
  }

  /**
   * Calculate voltage drop at each floor
   */
  calculateVoltageDrops(cumulativeLoads, riserSizing, floorHeight, voltage, phases, pf, isDownTake) {
    const results = [];
    let maxDrop = { percent: 0, floor: 0 };

    // Get impedance per unit length
    let rPerM, xPerM;
    if (riserSizing.type === 'BUSBAR') {
      rPerM = riserSizing.resistanceOhmPerM;
      xPerM = riserSizing.reactanceOhmPerM;
    } else {
      rPerM = riserSizing.resistanceOhmPerKm / 1000;
      xPerM = riserSizing.reactanceOhmPerKm / 1000;
    }

    // Calculate cumulative voltage drop
    const sorted = [...cumulativeLoads].sort((a, b) => 
      isDownTake ? b.floor - a.floor : a.floor - b.floor
    );

    let cumulativeVdrop = 0;
    for (let i = 0; i < sorted.length; i++) {
      const currentA = sorted[i].cumulativeCurrentA;
      const sectionLength = floorHeight;
      const cosPhi = pf;
      const sinPhase = Math.sqrt(1 - cosPhi * cosPhi);

      // Voltage drop per section: Vd = √3 × I × L × (R cosφ + X sinφ)
      const vdrop = Math.sqrt(3) * currentA * sectionLength * (rPerM * cosPhi + xPerM * sinPhase);
      cumulativeVdrop += vdrop;
      const vdropPercent = (cumulativeVdrop / voltage) * 100;

      if (vdropPercent > maxDrop.percent) {
        maxDrop = { percent: parseFloat(vdropPercent.toFixed(2)), floor: sorted[i].floor };
      }

      results.push({
        floor: sorted[i].floor,
        sectionCurrentA: parseFloat(currentA.toFixed(1)),
        sectionVdropV: parseFloat(vdrop.toFixed(2)),
        cumulativeVdropV: parseFloat(cumulativeVdrop.toFixed(2)),
        cumulativeVdropPercent: parseFloat(vdropPercent.toFixed(2)),
        voltageAtFloorV: parseFloat((voltage - cumulativeVdrop).toFixed(1)),
        compliant: vdropPercent <= RisingMainCalculator.VOLTAGE_DROP_LIMITS.riser,
      });
    }

    return {
      results: results.sort((a, b) => a.floor - b.floor),
      maxVoltageDrop: maxDrop,
      compliant: maxDrop.percent <= RisingMainCalculator.VOLTAGE_DROP_LIMITS.riser,
      limit: `${RisingMainCalculator.VOLTAGE_DROP_LIMITS.riser}%`,
    };
  }

  /**
   * Size tap-off / isolation switches at each floor
   */
  sizeTapOffs(floorResults) {
    const mcbRatings = [63, 100, 125, 160, 200, 250, 315, 400];
    
    return floorResults.map(floor => {
      const designCurrent = floor.currentA * 1.25;
      const rating = mcbRatings.find(r => r >= designCurrent) || mcbRatings[mcbRatings.length - 1];
      
      return {
        floor: floor.floor,
        loadCurrentA: floor.currentA,
        device: rating <= 63 ? 'MCB TP' : 'MCCB 4P',
        ratingA: rating,
        type: 'Plug-in / Bolt-on',
      };
    });
  }

  /**
   * Incoming protection sizing
   */
  sizeProtection(maxCurrentA, floorResults) {
    const designCurrent = maxCurrentA * 1.25;
    const mcbRatings = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];
    const incomingRating = mcbRatings.find(r => r >= designCurrent) || mcbRatings[mcbRatings.length - 1];

    return {
      incomingDevice: {
        type: incomingRating > 1600 ? 'ACB' : 'MCCB',
        ratingA: incomingRating,
        poles: 4,
        breakingCapacity: incomingRating > 800 ? '50kA' : '36kA',
      },
      earthFaultProtection: {
        type: 'Core Balance CT + Earth Fault Relay',
        setting: '30% of rated current',
        trippingTime: '0.1 seconds',
      },
    };
  }

  /**
   * Calculate required shaft size
   */
  calculateShaftSize(riserSizing, riserType) {
    let shaftWidth, shaftDepth;
    
    if (riserType === 'BUSBAR') {
      // Busbar trunking typically 200-400mm wide
      const rating = riserSizing.ratingA;
      shaftWidth = rating <= 800 ? 300 : rating <= 1600 ? 400 : 600;
      shaftDepth = rating <= 800 ? 200 : rating <= 1600 ? 300 : 400;
    } else {
      // Cable riser on tray
      const cables = riserSizing.numberOfCables || 1;
      shaftWidth = Math.max(300, cables * 150 + 100);
      shaftDepth = 200;
    }

    // Add clearance (600mm front, 150mm sides per IS 732)
    return {
      riserSpaceWidthMM: shaftWidth,
      riserSpaceDepthMM: shaftDepth,
      minShaftWidthMM: shaftWidth + 300,   // 150mm each side clearance
      minShaftDepthMM: shaftDepth + 750,   // 600mm front + 150mm rear
      fireRating: '2 hours',
      accessDoor: 'At each floor',
      ventilation: 'Natural / Forced per IS 732',
    };
  }
}

export default RisingMainCalculator;
