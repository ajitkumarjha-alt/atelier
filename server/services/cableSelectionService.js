/**
 * Cable Selection & Sizing Service
 * 
 * Performs cable sizing calculations per IS 732 (voltage drop),
 * IS 3961 (current carrying capacity), and IEC 60502.
 * Considers derating factors for grouping, ambient temperature,
 * installation method, and short circuit withstand.
 */

class CableSelectionCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Standard cable sizes (sq mm) per IS 1554 / IS 7098 ────────────────
  static CABLE_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000];

  // ─── Current carrying capacity (Amps) per IS 3961 — XLPE, Copper ───────
  // Single core, trefoil touching, in air at 40°C ambient
  static CCC_XLPE_CU_TREFOIL = {
    1.5: 19, 2.5: 27, 4: 36, 6: 46, 10: 64, 16: 84,
    25: 110, 35: 137, 50: 163, 70: 207, 95: 251, 120: 289,
    150: 328, 185: 374, 240: 437, 300: 500, 400: 577, 500: 660, 630: 754, 800: 860, 1000: 976,
  };

  // ─── Current carrying capacity — XLPE, Aluminium ───────────────────────
  static CCC_XLPE_AL_TREFOIL = {
    1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 49, 16: 65,
    25: 85, 35: 106, 50: 126, 70: 160, 95: 194, 120: 224,
    150: 254, 185: 289, 240: 338, 300: 387, 400: 447, 500: 510, 630: 583, 800: 665, 1000: 755,
  };

  // ─── Current carrying capacity — PVC, Copper ──────────────────────────
  static CCC_PVC_CU_TREFOIL = {
    1.5: 16, 2.5: 22, 4: 29, 6: 37, 10: 52, 16: 69,
    25: 90, 35: 111, 50: 133, 70: 168, 95: 204, 120: 234,
    150: 267, 185: 303, 240: 354, 300: 404, 400: 464, 500: 530, 630: 604, 800: 695, 1000: 792,
  };

  // ─── Ambient temperature derating (base 40°C for XLPE, 30°C for PVC) ──
  static DERATING_AMBIENT_XLPE = {
    25: 1.14, 30: 1.10, 35: 1.05, 40: 1.00, 45: 0.95, 50: 0.89, 55: 0.84, 60: 0.77,
  };
  static DERATING_AMBIENT_PVC = {
    25: 1.10, 30: 1.00, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.50,
  };

  // ─── Grouping derating factors (number of cables/circuits) ─────────────
  static DERATING_GROUPING = {
    1: 1.00, 2: 0.85, 3: 0.79, 4: 0.75, 5: 0.73, 6: 0.72, 7: 0.70, 8: 0.70, 9: 0.69,
    10: 0.68, 12: 0.67, 16: 0.65, 20: 0.63,
  };

  // ─── Installation method derating per IS 3961 ─────────────────────────
  static DERATING_INSTALLATION = {
    'Trefoil (touching) in air': 1.00,
    'Flat (touching) in air': 1.08,
    'Trefoil in duct/conduit': 0.80,
    'Flat in duct/conduit': 0.85,
    'Direct buried': 0.90,
    'Cable tray (perforated)': 1.00,
    'Cable ladder': 1.05,
    'On wall surface (cleat)': 1.10,
  };

  // ─── Soil thermal resistivity derating (for buried cables) ────────────
  static DERATING_SOIL = {
    0.7: 1.18,   // Wet soil
    1.0: 1.06,   // Damp soil
    1.5: 1.00,   // Normal (reference)
    2.0: 0.93,   // Dry soil
    2.5: 0.87,   // Very dry soil
    3.0: 0.81,   // Sandy soil
  };

  // ─── Voltage drop factors (mV/A/m) per IS 732 ────────────────────────
  // For 3-phase cables at 50Hz, XLPE, copper
  static VD_FACTORS_XLPE_CU = {
    1.5: 29.0, 2.5: 17.4, 4: 10.9, 6: 7.3, 10: 4.4, 16: 2.8,
    25: 1.8, 35: 1.3, 50: 1.0, 70: 0.72, 95: 0.55, 120: 0.45,
    150: 0.38, 185: 0.33, 240: 0.28, 300: 0.25, 400: 0.22, 500: 0.20,
  };

  // ─── Short circuit withstand (kA² s / mm²) ───────────────────────────
  static SC_K_FACTORS = {
    'XLPE Copper': 143,
    'XLPE Aluminium': 94,
    'PVC Copper': 115,
    'PVC Aluminium': 76,
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      voltage = 415,                 // V (3-phase)
      phases = 3,
      frequency = 50,                // Hz
      loadKW = 10,
      powerFactor = 0.85,
      cableLength = 50,              // m
      conductorMaterial = 'Copper',   // Copper | Aluminium
      insulationType = 'XLPE',       // XLPE | PVC
      installationMethod = 'Trefoil (touching) in air',
      ambientTemp = 40,              // °C
      numberOfCircuits = 1,          // grouping
      soilResistivity = 1.5,         // K·m/W (for buried only)
      maxVoltageDropPercent = 2.5,   // IS 732: max 2.5% for motor, 5% for lighting
      faultLevel = 25,               // kA (prospective short circuit current)
      faultDuration = 1.0,           // seconds
      cableRoutes = [],              // Optional array of circuit segments
    } = params;

    // 1. Calculate load current
    const loadCurrent = this.calculateLoadCurrent(loadKW, voltage, powerFactor, phases);

    // 2. Calculate derating factors
    const deratingFactors = this.calculateDeratingFactors(
      insulationType, ambientTemp, numberOfCircuits, installationMethod, soilResistivity
    );

    // 3. Size cable based on current
    const cableByCurrentResult = this.sizeByCurrent(
      loadCurrent, conductorMaterial, insulationType, deratingFactors.combined
    );

    // 4. Size cable based on voltage drop
    const cableByVDResult = this.sizeByVoltageDrop(
      loadCurrent, cableLength, voltage, maxVoltageDropPercent, conductorMaterial, insulationType, phases
    );

    // 5. Size cable based on short circuit
    const cableBySCResult = this.sizeByShortCircuit(
      faultLevel, faultDuration, conductorMaterial, insulationType
    );

    // 6. Select final cable (largest of the three)
    const requiredSizes = [
      cableByCurrentResult.selectedSize,
      cableByVDResult.selectedSize,
      cableBySCResult.selectedSize,
    ];
    const finalSize = Math.max(...requiredSizes);
    const finalSizeStandard = CableSelectionCalculator.CABLE_SIZES.find(s => s >= finalSize) || finalSize;
    const governingCriteria = finalSizeStandard === cableByCurrentResult.selectedSize ? 'Current Carrying Capacity'
      : finalSizeStandard === cableByVDResult.selectedSize ? 'Voltage Drop'
      : 'Short Circuit Withstand';

    // 7. Calculate actual voltage drop for final cable
    const vdFactor = CableSelectionCalculator.VD_FACTORS_XLPE_CU[finalSizeStandard] || 0.25;
    const actualVD = vdFactor * loadCurrent * cableLength / 1000;
    const actualVDPercent = (actualVD / voltage) * 100;

    // 8. Cable tray fill calculation
    const cableDia = this.getCableDiameter(finalSizeStandard, phases);
    const cableTrayFill = this.calculateTrayFill(cableDia, numberOfCircuits);

    return {
      inputParameters: {
        voltage, phases, loadKW, powerFactor, cableLength,
        conductorMaterial, insulationType, installationMethod,
        ambientTemp, numberOfCircuits,
      },
      loadCurrent: parseFloat(loadCurrent.toFixed(1)),
      deratingFactors,
      sizingByCurrent: cableByCurrentResult,
      sizingByVoltageDrop: cableByVDResult,
      sizingByShortCircuit: cableBySCResult,
      selectedCable: {
        size: finalSizeStandard,
        description: `${phases === 3 ? '3.5C' : '2C'} × ${finalSizeStandard} sq.mm ${insulationType} ${conductorMaterial}`,
        governingCriteria,
        actualVoltageDrop: parseFloat(actualVD.toFixed(2)),
        actualVoltageDropPercent: parseFloat(actualVDPercent.toFixed(2)),
        voltageDropCompliant: actualVDPercent <= maxVoltageDropPercent,
        cccRating: this.getCCC(finalSizeStandard, conductorMaterial, insulationType),
        deRatedCCC: parseFloat((this.getCCC(finalSizeStandard, conductorMaterial, insulationType) * deratingFactors.combined).toFixed(1)),
      },
      cableTrayFill,
    };
  }

  calculateLoadCurrent(loadKW, voltage, pf, phases) {
    if (phases === 3) {
      return (loadKW * 1000) / (Math.sqrt(3) * voltage * pf);
    } else {
      return (loadKW * 1000) / (voltage * pf);
    }
  }

  calculateDeratingFactors(insulationType, ambientTemp, numberOfCircuits, installationMethod, soilResistivity) {
    // Ambient temp derating
    const ambientTable = insulationType === 'XLPE' ? CableSelectionCalculator.DERATING_AMBIENT_XLPE : CableSelectionCalculator.DERATING_AMBIENT_PVC;
    const tempKeys = Object.keys(ambientTable).map(Number).sort((a, b) => a - b);
    let closestTemp = tempKeys.reduce((prev, curr) => Math.abs(curr - ambientTemp) < Math.abs(prev - ambientTemp) ? curr : prev);
    const ambientFactor = ambientTable[closestTemp] || 1.0;

    // Grouping derating
    const groupKeys = Object.keys(CableSelectionCalculator.DERATING_GROUPING).map(Number).sort((a, b) => a - b);
    let closestGroup = groupKeys.reduce((prev, curr) => Math.abs(curr - numberOfCircuits) < Math.abs(prev - numberOfCircuits) ? curr : prev);
    const groupingFactor = CableSelectionCalculator.DERATING_GROUPING[closestGroup] || 1.0;

    // Installation method derating
    const installFactor = CableSelectionCalculator.DERATING_INSTALLATION[installationMethod] || 1.0;

    // Soil derating (only for buried cables)
    let soilFactor = 1.0;
    if (installationMethod === 'Direct buried') {
      const soilKeys = Object.keys(CableSelectionCalculator.DERATING_SOIL).map(Number).sort((a, b) => a - b);
      let closestSoil = soilKeys.reduce((prev, curr) => Math.abs(curr - soilResistivity) < Math.abs(prev - soilResistivity) ? curr : prev);
      soilFactor = CableSelectionCalculator.DERATING_SOIL[closestSoil] || 1.0;
    }

    const combined = ambientFactor * groupingFactor * installFactor * soilFactor;

    return {
      ambient: { factor: ambientFactor, referenceTemp: closestTemp },
      grouping: { factor: groupingFactor, circuits: numberOfCircuits },
      installation: { factor: installFactor, method: installationMethod },
      soil: { factor: soilFactor, resistivity: soilResistivity },
      combined: parseFloat(combined.toFixed(3)),
    };
  }

  getCCC(size, material, insulation) {
    const key = `CCC_${insulation}_${material === 'Copper' ? 'CU' : 'AL'}_TREFOIL`;
    const table = CableSelectionCalculator[key] || CableSelectionCalculator.CCC_XLPE_CU_TREFOIL;
    return table[size] || 0;
  }

  sizeByCurrent(loadCurrent, material, insulation, combinedDerating) {
    const requiredCCC = loadCurrent / combinedDerating;
    const key = `CCC_${insulation}_${material === 'Copper' ? 'CU' : 'AL'}_TREFOIL`;
    const table = CableSelectionCalculator[key] || CableSelectionCalculator.CCC_XLPE_CU_TREFOIL;

    for (const size of CableSelectionCalculator.CABLE_SIZES) {
      if (table[size] && table[size] >= requiredCCC) {
        return {
          requiredCCC: Math.round(requiredCCC),
          selectedSize: size,
          cccRating: table[size],
          deRatedCCC: parseFloat((table[size] * combinedDerating).toFixed(1)),
        };
      }
    }
    const maxSize = CableSelectionCalculator.CABLE_SIZES[CableSelectionCalculator.CABLE_SIZES.length - 1];
    return {
      requiredCCC: Math.round(requiredCCC),
      selectedSize: maxSize,
      cccRating: table[maxSize] || 0,
      deRatedCCC: parseFloat(((table[maxSize] || 0) * combinedDerating).toFixed(1)),
      warning: 'Parallel cables may be required',
    };
  }

  sizeByVoltageDrop(loadCurrent, cableLength, voltage, maxVDPercent, material, insulation, phases) {
    const maxVD = (voltage * maxVDPercent) / 100;
    const vdTable = CableSelectionCalculator.VD_FACTORS_XLPE_CU; // Simplified: using copper XLPE for all

    for (const size of CableSelectionCalculator.CABLE_SIZES) {
      if (!vdTable[size]) continue;
      const vd = vdTable[size] * loadCurrent * cableLength / 1000;
      if (vd <= maxVD) {
        return {
          maxAllowableVD: parseFloat(maxVD.toFixed(2)),
          selectedSize: size,
          voltageDrop: parseFloat(vd.toFixed(2)),
          voltageDropPercent: parseFloat(((vd / voltage) * 100).toFixed(2)),
        };
      }
    }
    const maxSize = CableSelectionCalculator.CABLE_SIZES[CableSelectionCalculator.CABLE_SIZES.length - 1];
    const vd = (vdTable[maxSize] || 0.20) * loadCurrent * cableLength / 1000;
    return {
      maxAllowableVD: parseFloat(maxVD.toFixed(2)),
      selectedSize: maxSize,
      voltageDrop: parseFloat(vd.toFixed(2)),
      voltageDropPercent: parseFloat(((vd / voltage) * 100).toFixed(2)),
      warning: 'Parallel cables or higher voltage may be required',
    };
  }

  sizeByShortCircuit(faultLevel, faultDuration, material, insulation) {
    const kFactor = CableSelectionCalculator.SC_K_FACTORS[`${insulation} ${material}`] || 143;
    const faultCurrentA = faultLevel * 1000;
    // A = I × √t / k
    const requiredArea = (faultCurrentA * Math.sqrt(faultDuration)) / kFactor;
    const selectedSize = CableSelectionCalculator.CABLE_SIZES.find(s => s >= requiredArea)
      || CableSelectionCalculator.CABLE_SIZES[CableSelectionCalculator.CABLE_SIZES.length - 1];

    return {
      faultLevelKA: faultLevel,
      faultDuration,
      kFactor,
      requiredArea: parseFloat(requiredArea.toFixed(1)),
      selectedSize,
    };
  }

  getCableDiameter(size, phases) {
    // Approximate outside diameter (mm) of XLPE cable
    const diameters = {
      1.5: 10, 2.5: 11, 4: 12, 6: 13, 10: 16, 16: 18,
      25: 22, 35: 25, 50: 29, 70: 33, 95: 38, 120: 42,
      150: 46, 185: 51, 240: 57, 300: 62, 400: 70, 500: 78,
    };
    return diameters[size] || 30;
  }

  calculateTrayFill(cableDiaMM, numberOfCircuits) {
    const cableArea = Math.PI * Math.pow(cableDiaMM / 2, 2) * numberOfCircuits;
    // Standard tray widths (mm)
    const trayWidths = [150, 200, 300, 450, 600, 750, 900];
    const trayDepth = 75; // mm
    const maxFillPercent = 40; // NFPA 70: max 40% fill for cable tray

    for (const width of trayWidths) {
      const trayArea = width * trayDepth;
      const fillPercent = (cableArea / trayArea) * 100;
      if (fillPercent <= maxFillPercent) {
        return {
          cableOD: cableDiaMM,
          numberOfCables: numberOfCircuits,
          totalCableArea: Math.round(cableArea),
          trayWidth: width,
          trayDepth,
          trayArea,
          fillPercent: parseFloat(fillPercent.toFixed(1)),
          compliant: true,
        };
      }
    }

    return {
      cableOD: cableDiaMM,
      numberOfCables: numberOfCircuits,
      totalCableArea: Math.round(cableArea),
      trayWidth: 900,
      trayDepth,
      fillPercent: parseFloat((cableArea / (900 * trayDepth) * 100).toFixed(1)),
      compliant: false,
      recommendation: 'Use multiple cable trays or larger tray size',
    };
  }
}

export default CableSelectionCalculator;
