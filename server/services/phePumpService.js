/**
 * PHE Pump Selection Service
 * 
 * Performs pump sizing calculations for plumbing systems per IS 2065,
 * including booster pumps, transfer pumps, and sewage/drainage pumps.
 * Calculates total head, selects pump type, and verifies NPSH.
 */

class PHEPumpCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Pipe friction factor data (Hazen-Williams C values) ───────────────
  static PIPE_C_VALUES = {
    'GI (new)': 120, 'GI (old/corroded)': 80, 'CI (new/lined)': 130,
    'CI (unlined)': 100, 'UPVC': 150, 'CPVC': 150, 'HDPE': 150,
    'PPR': 150, 'SS 304': 140, 'SS 316': 140, 'Copper': 140, 'MS (new)': 120,
  };

  // ─── Standard pipe sizes (mm) ──────────────────────────────────────────
  static PIPE_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];

  // ─── Standard pump sizes (kW) ─────────────────────────────────────────
  static PUMP_SIZES = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110];

  // ─── Fitting equivalent lengths (in pipe diameters) ────────────────────
  static FITTING_EQUIV = {
    'Elbow 90°': 30, 'Elbow 45°': 16, 'Tee (through run)': 20,
    'Tee (branch)': 60, 'Gate Valve': 8, 'Globe Valve': 340,
    'Check Valve (swing)': 100, 'Check Valve (spring)': 200,
    'Butterfly Valve': 20, 'Ball Valve': 3, 'Strainer': 100,
    'Reducer': 10, 'Bend (long radius)': 20,
  };

  // ─── Pump Types ────────────────────────────────────────────────────────
  static PUMP_TYPES = {
    'Centrifugal End Suction': { maxFlowLPM: 3000, maxHeadM: 80, effRange: [0.55, 0.80] },
    'Centrifugal Split Case': { maxFlowLPM: 10000, maxHeadM: 120, effRange: [0.70, 0.88] },
    'Vertical Multistage': { maxFlowLPM: 500, maxHeadM: 200, effRange: [0.60, 0.78] },
    'Vertical Inline': { maxFlowLPM: 2000, maxHeadM: 50, effRange: [0.50, 0.75] },
    'Submersible': { maxFlowLPM: 5000, maxHeadM: 80, effRange: [0.50, 0.70] },
    'Self-Priming': { maxFlowLPM: 500, maxHeadM: 40, effRange: [0.40, 0.65] },
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      pumpApplication = 'Domestic Booster',   // Domestic Booster | Transfer | Sewage | Drainage
      flowRateLPM = 300,
      suctionLevel = 0,                        // m (negative if below pump)
      dischargeLevel = 30,                     // m (height of topmost outlet)
      residualPressureM = 7,                   // m (min 0.7 bar at topmost outlet)
      pipeMaterial = 'GI (new)',
      pipeLength = 100,                        // m (total pipe run)
      fittings = [],                           // [{ type, count }]
      staticSuctionHead = 3,                   // m (water level above/below pump centerline)
      suctionPipeLength = 10,                  // m
      suctionPipeDia = 80,                     // mm
      atmosphericPressureM = 10.3,             // m (varies with altitude)
      waterTemperature = 25,                   // °C
      numberOfPumps = 2,                       // working pumps
      standbyPumps = 1,
      hasVFD = false,
      operatingHoursPerDay = 8,
    } = params;

    // 1. Pipe sizing
    const pipeSizing = this.sizePipe(flowRateLPM, pipeMaterial);

    // 2. Friction losses
    const frictionLoss = this.calculateFrictionLoss(
      flowRateLPM, pipeSizing.selectedSize, pipeMaterial, pipeLength, fittings
    );

    // 3. Total head calculation
    const totalHead = this.calculateTotalHead(
      suctionLevel, dischargeLevel, residualPressureM, frictionLoss.totalLoss
    );

    // 4. Pump selection
    const pumpSelection = this.selectPump(
      pumpApplication, flowRateLPM, totalHead.totalDynamicHead
    );

    // 5. NPSH verification
    const npshCheck = this.checkNPSH(
      atmosphericPressureM, staticSuctionHead, waterTemperature,
      suctionPipeLength, suctionPipeDia, flowRateLPM, pipeMaterial
    );

    // 6. Energy analysis
    const energyAnalysis = this.calculateEnergy(
      pumpSelection.motorPowerKW, numberOfPumps, operatingHoursPerDay, hasVFD
    );

    return {
      application: pumpApplication,
      designFlow: {
        flowRateLPM,
        flowRateM3h: parseFloat((flowRateLPM * 0.06).toFixed(2)),
        flowRateLPS: parseFloat((flowRateLPM / 60).toFixed(2)),
      },
      pipeSizing,
      frictionLoss,
      totalHead,
      pumpSelection,
      npshCheck,
      pumpConfiguration: {
        workingPumps: numberOfPumps,
        standbyPumps,
        totalPumps: numberOfPumps + standbyPumps,
        configuration: `${numberOfPumps}W + ${standbyPumps}S`,
        hasVFD,
        flowPerPump: parseFloat((flowRateLPM / numberOfPumps).toFixed(0)),
      },
      energyAnalysis,
    };
  }

  /**
   * Size discharge pipe based on flow velocity limits
   */
  sizePipe(flowLPM, material) {
    const flowM3s = flowLPM / 60000;
    // Target velocity: 1.5-2.5 m/s for pressure pipes, 0.6-1.2 m/s for gravity
    const targetVelocity = 2.0;
    const requiredAreaM2 = flowM3s / targetVelocity;
    const requiredDiaMM = Math.sqrt(requiredAreaM2 * 4 / Math.PI) * 1000;

    const selectedSize = PHEPumpCalculator.PIPE_SIZES.find(s => s >= requiredDiaMM) || 150;
    const actualArea = Math.PI * Math.pow(selectedSize / 2000, 2);
    const actualVelocity = flowM3s / actualArea;

    return {
      requiredDiaMM: parseFloat(requiredDiaMM.toFixed(0)),
      selectedSize,
      actualVelocityMs: parseFloat(actualVelocity.toFixed(2)),
      velocityCompliant: actualVelocity >= 0.6 && actualVelocity <= 3.0,
      velocityRange: '0.6 - 3.0 m/s',
    };
  }

  /**
   * Calculate friction losses (Hazen-Williams method)
   */
  calculateFrictionLoss(flowLPM, pipeDiaMM, material, pipeLength, fittings) {
    const C = PHEPumpCalculator.PIPE_C_VALUES[material] || 120;
    const Q = flowLPM / 60; // L/s
    const d = pipeDiaMM;

    // Hazen-Williams: hf = (10.67 × Q^1.852) / (C^1.852 × d^4.87) × L
    // Q in m³/s, d in m
    const Qm3s = Q / 1000;
    const dm = d / 1000;
    const frictionPerMeter = (10.67 * Math.pow(Qm3s, 1.852)) / (Math.pow(C, 1.852) * Math.pow(dm, 4.87));
    const pipeFrictionM = frictionPerMeter * pipeLength;

    // Fitting losses (equivalent length method)
    let totalEquivLength = 0;
    const fittingDetails = [];
    for (const fitting of fittings) {
      const equivDiameters = PHEPumpCalculator.FITTING_EQUIV[fitting.type] || 30;
      const equivLength = (equivDiameters * pipeDiaMM / 1000) * fitting.count;
      totalEquivLength += equivLength;
      fittingDetails.push({ ...fitting, equivLengthM: parseFloat(equivLength.toFixed(2)) });
    }
    const fittingFrictionM = frictionPerMeter * totalEquivLength;

    return {
      frictionPerMeterM: parseFloat(frictionPerMeter.toFixed(4)),
      pipeFrictionM: parseFloat(pipeFrictionM.toFixed(2)),
      fittingEquivLengthM: parseFloat(totalEquivLength.toFixed(2)),
      fittingFrictionM: parseFloat(fittingFrictionM.toFixed(2)),
      totalLoss: parseFloat((pipeFrictionM + fittingFrictionM).toFixed(2)),
      fittingDetails,
    };
  }

  /**
   * Calculate total dynamic head
   */
  calculateTotalHead(suctionLevel, dischargeLevel, residualPressureM, frictionLossM) {
    const staticHead = dischargeLevel - suctionLevel;
    const totalDynamicHead = staticHead + frictionLossM + residualPressureM;

    return {
      staticHeadM: parseFloat(staticHead.toFixed(2)),
      frictionLossM: parseFloat(frictionLossM.toFixed(2)),
      residualPressureM,
      totalDynamicHead: parseFloat(totalDynamicHead.toFixed(2)),
      totalDynamicHeadBar: parseFloat((totalDynamicHead / 10.2).toFixed(2)),
    };
  }

  /**
   * Select pump type and calculate motor power
   */
  selectPump(application, flowLPM, tdh) {
    // Select pump type based on application and duty
    let pumpType;
    if (application === 'Sewage' || application === 'Drainage') {
      pumpType = tdh > 20 ? 'Submersible' : 'Submersible';
    } else if (tdh > 80) {
      pumpType = 'Vertical Multistage';
    } else if (flowLPM > 2000) {
      pumpType = 'Centrifugal Split Case';
    } else if (tdh > 50) {
      pumpType = 'Centrifugal End Suction';
    } else {
      pumpType = 'Centrifugal End Suction';
    }

    const pumpSpec = PHEPumpCalculator.PUMP_TYPES[pumpType];
    const efficiency = (pumpSpec.effRange[0] + pumpSpec.effRange[1]) / 2;

    // P = ρ × g × Q × H / (η × 1000)
    const flowM3s = flowLPM / 60000;
    const hydraulicPowerKW = (1000 * 9.81 * flowM3s * tdh) / 1000;
    const pumpPowerKW = hydraulicPowerKW / efficiency;

    // Motor sizing (next standard size with SF = 1.15)
    const motorPowerKW = pumpPowerKW * 1.15;
    const selectedMotor = PHEPumpCalculator.PUMP_SIZES.find(s => s >= motorPowerKW)
      || PHEPumpCalculator.PUMP_SIZES[PHEPumpCalculator.PUMP_SIZES.length - 1];

    return {
      pumpType,
      efficiency: parseFloat(efficiency.toFixed(2)),
      hydraulicPowerKW: parseFloat(hydraulicPowerKW.toFixed(2)),
      calculatedPowerKW: parseFloat(pumpPowerKW.toFixed(2)),
      motorPowerKW: selectedMotor,
      motorVoltage: selectedMotor > 5.5 ? '415V 3-phase' : '230V 1-phase',
      motorSpeed: 2900, // RPM at 50Hz
      impellerType: application === 'Sewage' ? 'Open / Channel' : 'Closed',
    };
  }

  /**
   * NPSH (Net Positive Suction Head) verification
   */
  checkNPSH(atmosphericPressure, staticSuctionHead, waterTemp, suctionPipeLength, suctionPipeDia, flowLPM, pipeMaterial) {
    // Vapour pressure of water at temperature
    const vapourPressureTable = {
      10: 0.12, 15: 0.17, 20: 0.24, 25: 0.33, 30: 0.43, 35: 0.57,
      40: 0.74, 45: 0.96, 50: 1.25, 60: 2.03, 70: 3.17, 80: 4.83,
    };
    const tempKeys = Object.keys(vapourPressureTable).map(Number);
    const closestTemp = tempKeys.reduce((p, c) => Math.abs(c - waterTemp) < Math.abs(p - waterTemp) ? c : p);
    const vapourPressureM = vapourPressureTable[closestTemp] || 0.33;

    // Suction friction loss
    const C = PHEPumpCalculator.PIPE_C_VALUES[pipeMaterial] || 120;
    const Qm3s = flowLPM / 60000;
    const dm = suctionPipeDia / 1000;
    const suctionFriction = (10.67 * Math.pow(Qm3s, 1.852)) / (Math.pow(C, 1.852) * Math.pow(dm, 4.87)) * suctionPipeLength;

    // NPSH Available = Pa - Pvp + Hs - Hfs
    const npshA = atmosphericPressure - vapourPressureM + staticSuctionHead - suctionFriction;

    // Typical NPSH Required for centrifugal pumps: 2-5m
    const npshR = 3.0; // conservative estimate, should come from pump curve

    return {
      atmosphericPressureM: atmosphericPressure,
      vapourPressureM: parseFloat(vapourPressureM.toFixed(2)),
      staticSuctionHeadM: staticSuctionHead,
      suctionFrictionLossM: parseFloat(suctionFriction.toFixed(2)),
      npshAvailable: parseFloat(npshA.toFixed(2)),
      npshRequired: npshR,
      margin: parseFloat((npshA - npshR).toFixed(2)),
      adequate: npshA >= npshR * 1.3, // 30% safety margin
      recommendation: npshA < npshR * 1.3 ? 'Consider: flooded suction, larger suction pipe, or lower pump position' : 'NPSH adequate',
    };
  }

  /**
   * Energy consumption analysis
   */
  calculateEnergy(motorKW, numberOfPumps, hoursPerDay, hasVFD) {
    const vfdSavings = hasVFD ? 0.70 : 1.0; // VFD typically saves ~30% energy
    const dailyKWh = motorKW * numberOfPumps * hoursPerDay * vfdSavings;
    const monthlyKWh = dailyKWh * 30;
    const annualKWh = dailyKWh * 365;
    const electricityRate = 9.0; // ₹/kWh (average commercial rate)

    return {
      dailyKWh: Math.round(dailyKWh),
      monthlyKWh: Math.round(monthlyKWh),
      annualKWh: Math.round(annualKWh),
      annualCostINR: Math.round(annualKWh * electricityRate),
      vfdSavingsPercent: hasVFD ? 30 : 0,
      annualSavingsWithVFD: hasVFD ? 0 : Math.round(annualKWh * 0.30 * electricityRate),
    };
  }
}

export default PHEPumpCalculator;
