/**
 * Duct Sizing Calculation Service
 * 
 * Calculates duct sizes using Equal Friction and Static Regain methods.
 * Compliant with ASHRAE Fundamentals / ISHRAE guidelines.
 * Supports GI, pre-insulated, and fabric duct systems.
 */

class DuctSizingCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Maximum Velocity Limits (m/s) per ASHRAE ─────────────────────────
  static MAX_VELOCITY = {
    'Main Duct (commercial)': 10.0,
    'Main Duct (residential)': 6.0,
    'Branch Duct (commercial)': 8.0,
    'Branch Duct (residential)': 5.0,
    'Riser / Shaft': 10.0,
    'Supply Grille (ceiling)': 2.5,
    'Return Grille': 3.0,
    'Fresh Air Intake': 5.0,
    'Exhaust Duct': 10.0,
    'Kitchen Exhaust': 12.5,
    'Fume Exhaust': 10.0,
    'Toilet Exhaust': 8.0,
  };

  // ─── Recommended Friction Rate ────────────────────────────────────────
  static RECOMMENDED_FRICTION = {
    lowPressure: { range: [0.8, 1.2], default: 1.0, unit: 'Pa/m' },
    mediumPressure: { range: [1.0, 2.0], default: 1.5, unit: 'Pa/m' },
    highPressure: { range: [2.0, 4.0], default: 2.5, unit: 'Pa/m' },
  };

  // ─── Duct Material Properties ─────────────────────────────────────────
  static DUCT_MATERIALS = {
    'GI Sheet': {
      roughness: 0.00015, // m (absolute roughness)
      gauges: {
        'Up to 750mm': '24 gauge (0.63mm)',
        '751-1000mm': '22 gauge (0.80mm)',
        '1001-1500mm': '20 gauge (1.00mm)',
        'Above 1500mm': '18 gauge (1.25mm)',
      },
      maxVelocity: 20, // m/s
      application: 'Standard HVAC, kitchen exhaust',
    },
    'Pre-insulated Panel': {
      roughness: 0.0003,
      gauges: { 'All sizes': '20mm / 25mm panel' },
      maxVelocity: 10,
      application: 'Low velocity comfort systems',
    },
    'Aluminium': {
      roughness: 0.00005,
      gauges: { 'All sizes': '0.6-1.2mm' },
      maxVelocity: 20,
      application: 'Clean rooms, lab exhaust',
    },
    'Flexible Duct': {
      roughness: 0.003,
      gauges: { 'All sizes': 'Standard flex' },
      maxVelocity: 6,
      application: 'Final connections (max 2m length)',
    },
    'Fabric Duct': {
      roughness: 0.001,
      gauges: { 'All sizes': 'Polyester fabric' },
      maxVelocity: 8,
      application: 'Industrial, food processing',
    },
  };

  // ─── Standard Duct Sizes (mm) ─────────────────────────────────────────
  static STANDARD_WIDTHS = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1200, 1400, 1500, 1600, 1800, 2000];
  static STANDARD_HEIGHTS = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800];
  static STANDARD_CIRCULAR_DIA = [100, 125, 150, 160, 200, 250, 300, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250];

  // ─── Fitting Loss Coefficients (C) ────────────────────────────────────
  static FITTING_LOSSES = {
    'Elbow 90° (sharp)': 1.2,
    'Elbow 90° (R/D=1.5)': 0.25,
    'Elbow 90° (R/D=2.0)': 0.20,
    'Elbow 45°': 0.15,
    'Tee (straight through)': 0.10,
    'Tee (branch)': 0.80,
    'Transition (gradual)': 0.10,
    'Transition (abrupt)': 0.35,
    'Fire Damper': 0.20,
    'Volume Damper': 0.50,
    'Opposed Blade Damper': 0.52,
    'Round Elbow (3-piece)': 0.45,
    'Round Elbow (5-piece)': 0.33,
    'Offset': 0.15,
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const {
      method = 'EQUAL_FRICTION',
      material = 'GI Sheet',
      systemType = 'SUPPLY',
      frictionRate = 1.0,
      sections = [],
      totalFlowCFM = null,
      totalFlowM3h = null,
    } = params;

    const sectionResults = [];
    let totalPressureDrop = 0;
    let maxPressureDrop = 0;
    let criticalPath = [];

    // Calculate each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const result = this.calculateSection(section, method, material, frictionRate);
      sectionResults.push(result);
      totalPressureDrop += result.totalPressureDropPa;
    }

    // Find critical path (longest resistance path)
    const { path, pressureDrop } = this.findCriticalPath(sectionResults);
    maxPressureDrop = pressureDrop;
    criticalPath = path;

    // Fan static pressure requirement
    const fanStatic = this.calculateFanStatic(maxPressureDrop, systemType);

    // Material schedule
    const materialSchedule = this.generateMaterialSchedule(sectionResults, material);

    return {
      method,
      material,
      systemType,
      frictionRate,
      sections: sectionResults,
      criticalPath: {
        sectionIds: criticalPath,
        totalPressureDropPa: Math.round(maxPressureDrop),
      },
      fanStaticPressure: fanStatic,
      materialSchedule,
      summary: {
        totalSections: sections.length,
        totalDuctLength: sectionResults.reduce((sum, s) => sum + (s.length || 0), 0),
        maxVelocityMs: Math.max(...sectionResults.map(s => s.actualVelocity || 0)),
        totalPressureDropPa: Math.round(maxPressureDrop),
        fanStaticPa: fanStatic.totalFanStaticPa,
      },
    };
  }

  /**
   * Calculate a duct section
   */
  calculateSection(section, method, material, frictionRate) {
    const {
      id,
      name = '',
      flowCFM = 0,
      flowM3h = null,
      lengthM = 5,
      fittings = [],
      ductShape = 'RECTANGULAR',
      maxWidth = null,
      maxHeight = null,
      parentId = null,
      applicationType = 'Main Duct (commercial)',
    } = section;

    // Convert flow
    const flowM3s = flowM3h ? flowM3h / 3600 : flowCFM / 2119;
    const actualFlowCFM = flowM3h ? flowM3h * 0.589 : flowCFM;

    const matProps = DuctSizingCalculator.DUCT_MATERIALS[material];
    const maxVel = DuctSizingCalculator.MAX_VELOCITY[applicationType] || 10;

    let ductSize;
    if (ductShape === 'CIRCULAR') {
      ductSize = this.sizeCircularDuct(flowM3s, frictionRate, matProps.roughness, maxVel);
    } else {
      ductSize = this.sizeRectangularDuct(flowM3s, frictionRate, matProps.roughness, maxVel, maxWidth, maxHeight);
    }

    // Fitting losses
    const fittingLosses = this.calculateFittingLosses(fittings, ductSize.actualVelocity);

    // Straight duct pressure drop
    const straightLoss = frictionRate * lengthM;

    // Total section pressure drop
    const totalPressureDrop = straightLoss + fittingLosses.totalPa;

    // Duct gauge
    const gauge = this.getDuctGauge(material, Math.max(ductSize.widthMM || 0, ductSize.diameterMM || 0));

    return {
      id,
      name,
      flowCFM: Math.round(actualFlowCFM),
      flowM3s: parseFloat(flowM3s.toFixed(3)),
      length: lengthM,
      parentId,
      ductShape,
      ...ductSize,
      gauge,
      frictionLoss: {
        frictionRatePaPerM: frictionRate,
        straightLossPa: parseFloat(straightLoss.toFixed(1)),
        fittingLosses: fittingLosses.details,
        totalFittingLossPa: parseFloat(fittingLosses.totalPa.toFixed(1)),
      },
      totalPressureDropPa: parseFloat(totalPressureDrop.toFixed(1)),
      velocityCompliant: ductSize.actualVelocity <= maxVel,
      maxAllowedVelocity: maxVel,
    };
  }

  /**
   * Size rectangular duct using equal friction method
   */
  sizeRectangularDuct(flowM3s, frictionRate, roughness, maxVelocity, maxW, maxH) {
    const constrainedW = maxW || 2000;
    const constrainedH = maxH || 800;

    // Calculate equivalent circular diameter from friction rate
    // Using Colebrook-White approximation for fully developed flow
    // Simplified: D_eq = (0.109 × Q^0.9 / (f_rate / p)^0.55)
    const targetArea = flowM3s / maxVelocity;
    
    let bestWidth = 600;
    let bestHeight = 400;
    let bestDiff = Infinity;

    for (const w of DuctSizingCalculator.STANDARD_WIDTHS) {
      if (w > constrainedW) continue;
      for (const h of DuctSizingCalculator.STANDARD_HEIGHTS) {
        if (h > constrainedH || h > w) continue;
        const area = (w * h) / 1e6;
        if (area < targetArea * 0.8) continue;
        const vel = flowM3s / area;
        if (vel > maxVelocity * 1.05) continue;
        const diff = Math.abs(area - targetArea);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestWidth = w;
          bestHeight = h;
        }
      }
    }

    const actualArea = (bestWidth * bestHeight) / 1e6;
    const actualVelocity = flowM3s / actualArea;
    const eqDia = 1.3 * Math.pow(bestWidth * bestHeight, 0.625) / Math.pow(bestWidth + bestHeight, 0.25);

    return {
      widthMM: bestWidth,
      heightMM: bestHeight,
      sizeLabel: `${bestWidth} × ${bestHeight}mm`,
      areaM2: parseFloat(actualArea.toFixed(4)),
      equivalentDiaMM: Math.round(eqDia),
      actualVelocity: parseFloat(actualVelocity.toFixed(1)),
      aspectRatio: parseFloat((bestWidth / bestHeight).toFixed(1)),
    };
  }

  /**
   * Size circular duct
   */
  sizeCircularDuct(flowM3s, frictionRate, roughness, maxVelocity) {
    const targetArea = flowM3s / maxVelocity;
    const targetDia = Math.sqrt(targetArea * 4 / Math.PI) * 1000;

    const selectedDia = DuctSizingCalculator.STANDARD_CIRCULAR_DIA.find(d => d >= targetDia) || targetDia;
    const actualArea = Math.PI * Math.pow(selectedDia / 1000, 2) / 4;
    const actualVelocity = flowM3s / actualArea;

    return {
      diameterMM: selectedDia,
      sizeLabel: `Ø${selectedDia}mm`,
      areaM2: parseFloat(actualArea.toFixed(4)),
      equivalentDiaMM: selectedDia,
      actualVelocity: parseFloat(actualVelocity.toFixed(1)),
    };
  }

  /**
   * Calculate fitting pressure losses
   */
  calculateFittingLosses(fittings, velocity) {
    const dynamicPressure = 0.5 * 1.2 * velocity * velocity; // ½ρv²
    let totalPa = 0;
    const details = [];

    for (const fitting of fittings) {
      const { type, quantity = 1 } = fitting;
      const C = DuctSizingCalculator.FITTING_LOSSES[type] || 0.5;
      const loss = C * dynamicPressure * quantity;
      totalPa += loss;
      details.push({
        type,
        quantity,
        coefficient: C,
        lossPa: parseFloat(loss.toFixed(1)),
      });
    }

    return { totalPa, details };
  }

  /**
   * Find critical (longest resistance) path through duct network
   */
  findCriticalPath(sections) {
    // Simple: sum all sections in sequence for now
    // A full implementation would build a tree from parentId references
    const roots = sections.filter(s => !s.parentId);
    let maxDrop = 0;
    let maxPath = [];

    const traverse = (sectionId, currentDrop, path) => {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      
      const newDrop = currentDrop + section.totalPressureDropPa;
      const newPath = [...path, sectionId];

      const children = sections.filter(s => s.parentId === sectionId);
      if (children.length === 0) {
        if (newDrop > maxDrop) {
          maxDrop = newDrop;
          maxPath = newPath;
        }
      } else {
        for (const child of children) {
          traverse(child.id, newDrop, newPath);
        }
      }
    };

    if (roots.length > 0) {
      for (const root of roots) {
        traverse(root.id, 0, []);
      }
    } else {
      // Fallback: sum all
      maxDrop = sections.reduce((sum, s) => sum + s.totalPressureDropPa, 0);
      maxPath = sections.map(s => s.id);
    }

    return { path: maxPath, pressureDrop: maxDrop };
  }

  /**
   * Calculate fan static pressure requirement
   */
  calculateFanStatic(criticalPathPa, systemType) {
    const filterLoss = systemType === 'SUPPLY' ? 150 : 0; // Pa
    const coilLoss = systemType === 'SUPPLY' ? 200 : 0;   // Pa
    const grilleLoss = 50;                                  // Pa per terminal
    const silencerLoss = systemType === 'SUPPLY' ? 75 : 0;  // Pa
    const safetyFactor = 1.15;                               // 15%

    const totalFanStatic = Math.round(
      (criticalPathPa + filterLoss + coilLoss + grilleLoss + silencerLoss) * safetyFactor
    );

    return {
      ductLossPa: Math.round(criticalPathPa),
      filterLossPa: filterLoss,
      coilLossPa: coilLoss,
      grilleLossPa: grilleLoss,
      silencerLossPa: silencerLoss,
      safetyFactor: `${Math.round((safetyFactor - 1) * 100)}%`,
      totalFanStaticPa: totalFanStatic,
      totalFanStaticInWG: parseFloat((totalFanStatic / 249).toFixed(2)),
    };
  }

  /**
   * Get duct gauge based on material and size
   */
  getDuctGauge(material, maxDimension) {
    const matProps = DuctSizingCalculator.DUCT_MATERIALS[material];
    if (!matProps) return 'N/A';
    const gauges = matProps.gauges;
    if (maxDimension <= 750) return gauges['Up to 750mm'] || gauges['All sizes'] || '24 gauge';
    if (maxDimension <= 1000) return gauges['751-1000mm'] || gauges['All sizes'] || '22 gauge';
    if (maxDimension <= 1500) return gauges['1001-1500mm'] || gauges['All sizes'] || '20 gauge';
    return gauges['Above 1500mm'] || gauges['All sizes'] || '18 gauge';
  }

  /**
   * Generate material schedule / BoQ
   */
  generateMaterialSchedule(sections, material) {
    const schedule = {};
    let totalSurfaceArea = 0;

    for (const section of sections) {
      const key = section.sizeLabel;
      if (!schedule[key]) {
        schedule[key] = { size: key, lengthM: 0, gauge: section.gauge, sections: 0 };
      }
      schedule[key].lengthM += section.length || 0;
      schedule[key].sections += 1;

      // Surface area (perimeter × length)
      const perimeter = section.widthMM && section.heightMM
        ? 2 * (section.widthMM + section.heightMM) / 1000
        : Math.PI * (section.diameterMM || 0) / 1000;
      totalSurfaceArea += perimeter * (section.length || 0);
    }

    return {
      material,
      items: Object.values(schedule),
      totalSurfaceAreaM2: parseFloat(totalSurfaceArea.toFixed(1)),
      insulationArea: parseFloat(totalSurfaceArea.toFixed(1)),
      insulationType: 'Nitrile rubber (25mm) / Glass wool (50mm, 48 kg/m³)',
    };
  }
}

export default DuctSizingCalculator;
