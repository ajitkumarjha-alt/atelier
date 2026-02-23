/**
 * Lighting Design Calculation Service
 * 
 * Performs interior lighting design per IS 3646 (Part 1 & 2), NBC 2016,
 * and ECBC 2017 for energy compliance.
 * Calculates lux levels, luminaire count, LENI values, and LPD compliance.
 */

class LightingDesignCalculator {
  constructor(db) {
    this.db = db;
  }

  // ─── Recommended Lux Levels per IS 3646 / NBC 2016 ─────────────────────
  static LUX_REQUIREMENTS = {
    // Residential
    'Living Room': 150, 'Bedroom': 100, 'Kitchen': 200, 'Bathroom': 100,
    'Dining Room': 150, 'Study Room': 300, 'Entrance Lobby': 100,
    // Common Areas
    'Corridor': 100, 'Staircase': 100, 'Lift Lobby': 150, 'Parking': 75,
    'Basement Parking': 75, 'Landscape/Garden': 50, 'Terrace': 50,
    'Security Cabin': 200, 'Pump Room': 150, 'Electrical Room': 200,
    // Office
    'General Office': 300, 'Conference Room': 300, 'Reception': 200,
    'Computer Room': 500, 'Drawing Office': 500, 'Filing/Storage': 150,
    // Retail
    'Showroom': 500, 'Shop Floor': 300, 'Mall Atrium': 200,
    // Others
    'Gymnasium': 300, 'Indoor Pool': 200, 'Restaurant': 200,
    'Clubhouse': 200, 'Library': 300, 'Workshop': 300,
  };

  // ─── ECBC 2017 Maximum LPD (W/m²) by space type ──────────────────────
  static ECBC_MAX_LPD = {
    RESIDENTIAL: 7.0, OFFICE: 9.0, RETAIL: 14.0, HOSPITALITY: 10.5,
    HEALTHCARE: 10.0, EDUCATIONAL: 8.5, PARKING: 3.0, CORRIDOR: 5.0,
    LOBBY: 10.0, STAIRCASE: 5.5, LANDSCAPE: 1.5,
  };

  // ─── Common Luminaire Types with efficacy (lm/W) ──────────────────────
  static LUMINAIRE_TYPES = {
    'LED Panel 2x2 (40W)': { wattage: 40, lumens: 4000, efficacy: 100, type: 'Recessed', beamAngle: 120, lifeHours: 50000 },
    'LED Panel 1x4 (36W)': { wattage: 36, lumens: 3600, efficacy: 100, type: 'Recessed', beamAngle: 120, lifeHours: 50000 },
    'LED Downlight 15W': { wattage: 15, lumens: 1500, efficacy: 100, type: 'Recessed', beamAngle: 60, lifeHours: 50000 },
    'LED Downlight 18W': { wattage: 18, lumens: 1800, efficacy: 100, type: 'Recessed', beamAngle: 90, lifeHours: 50000 },
    'LED Downlight 24W': { wattage: 24, lumens: 2400, efficacy: 100, type: 'Recessed', beamAngle: 90, lifeHours: 50000 },
    'LED Batten 20W (4ft)': { wattage: 20, lumens: 2200, efficacy: 110, type: 'Surface', beamAngle: 120, lifeHours: 40000 },
    'LED Batten 36W (4ft)': { wattage: 36, lumens: 3600, efficacy: 100, type: 'Surface', beamAngle: 120, lifeHours: 40000 },
    'LED Bulkhead 10W': { wattage: 10, lumens: 800, efficacy: 80, type: 'Wall-mount', beamAngle: 180, lifeHours: 40000 },
    'LED High Bay 100W': { wattage: 100, lumens: 14000, efficacy: 140, type: 'Suspended', beamAngle: 120, lifeHours: 50000 },
    'LED High Bay 150W': { wattage: 150, lumens: 22500, efficacy: 150, type: 'Suspended', beamAngle: 120, lifeHours: 50000 },
    'LED Street Light 60W': { wattage: 60, lumens: 7200, efficacy: 120, type: 'Pole-mount', beamAngle: 140, lifeHours: 50000 },
    'LED Flood Light 50W': { wattage: 50, lumens: 5000, efficacy: 100, type: 'External', beamAngle: 120, lifeHours: 40000 },
    'LED Flood Light 100W': { wattage: 100, lumens: 12000, efficacy: 120, type: 'External', beamAngle: 120, lifeHours: 40000 },
  };

  // ─── Reflectance values ────────────────────────────────────────────────
  static REFLECTANCES = {
    'White ceiling': 0.80,
    'Light ceiling': 0.70,
    'Medium ceiling': 0.50,
    'White walls': 0.70,
    'Light walls': 0.50,
    'Medium walls': 0.30,
    'Dark walls': 0.10,
    'Light floor': 0.30,
    'Medium floor': 0.20,
    'Dark floor': 0.10,
  };

  /**
   * Main calculation entry point
   */
  async calculate(params) {
    const { rooms = [], buildingType = 'RESIDENTIAL' } = params;

    const roomResults = [];
    let totalWattage = 0;
    let totalArea = 0;
    let totalLuminaires = 0;

    for (const room of rooms) {
      const result = this.calculateRoom(room);
      roomResults.push(result);
      totalWattage += result.totalWattage;
      totalArea += result.area;
      totalLuminaires += result.luminaireCount;
    }

    // ECBC compliance check
    const overallLPD = totalArea > 0 ? totalWattage / totalArea : 0;
    const ecbcLimit = LightingDesignCalculator.ECBC_MAX_LPD[buildingType] || 9.0;

    // LENI calculation (Lighting Energy Numeric Indicator) kWh/m²/year
    const operatingHoursPerDay = buildingType === 'OFFICE' ? 10 : buildingType === 'RETAIL' ? 12 : 6;
    const operatingDaysPerYear = buildingType === 'OFFICE' ? 260 : buildingType === 'RETAIL' ? 330 : 365;
    const annualEnergy = totalWattage * operatingHoursPerDay * operatingDaysPerYear / 1000;
    const leni = totalArea > 0 ? annualEnergy / totalArea : 0;

    return {
      roomResults,
      summary: {
        totalRooms: rooms.length,
        totalArea: Math.round(totalArea),
        totalLuminaires,
        totalWattage: Math.round(totalWattage),
        overallLPD: parseFloat(overallLPD.toFixed(2)),
        ecbcMaxLPD: ecbcLimit,
        ecbcCompliant: overallLPD <= ecbcLimit,
        annualEnergyKWh: Math.round(annualEnergy),
        leniKWhPerM2Year: parseFloat(leni.toFixed(2)),
      },
    };
  }

  /**
   * Calculate lighting for a single room
   */
  calculateRoom(room) {
    const {
      name,
      spaceType = 'Living Room',
      area = 20,                           // m²
      length = 5,                          // m
      width = 4,                           // m
      height = 3.0,                        // m
      workPlaneHeight = 0.8,               // m
      luminaireType = 'LED Panel 2x2 (40W)',
      ceilingReflectance = 'White ceiling',
      wallReflectance = 'Light walls',
      floorReflectance = 'Medium floor',
      maintenanceFactor = 0.8,             // Clean environment
      targetLux = null,                    // Override; otherwise auto from IS 3646
    } = room;

    const luminaire = LightingDesignCalculator.LUMINAIRE_TYPES[luminaireType]
      || LightingDesignCalculator.LUMINAIRE_TYPES['LED Panel 2x2 (40W)'];

    const requiredLux = targetLux || LightingDesignCalculator.LUX_REQUIREMENTS[spaceType]
      || LightingDesignCalculator.LUX_REQUIREMENTS['General Office'];

    // Room Index (K) = L × W / (Hm × (L + W))
    const mountingHeight = height - workPlaneHeight;
    const roomIndex = (length * width) / (mountingHeight * (length + width));

    // Utilization Factor (UF) from room index and reflectances
    const rhoC = LightingDesignCalculator.REFLECTANCES[ceilingReflectance] || 0.70;
    const rhoW = LightingDesignCalculator.REFLECTANCES[wallReflectance] || 0.50;
    const utilizationFactor = this.getUtilizationFactor(roomIndex, rhoC, rhoW);

    // Number of luminaires = (E × A) / (n × Φ × UF × MF)
    // E = required lux, A = area, n = lamps per luminaire (1), Φ = lumens per luminaire
    const numberOfLuminaires = Math.ceil(
      (requiredLux * area) / (luminaire.lumens * utilizationFactor * maintenanceFactor)
    );

    // Achieved lux
    const achievedLux = (numberOfLuminaires * luminaire.lumens * utilizationFactor * maintenanceFactor) / area;

    // Spacing
    const spacingRatio = mountingHeight * 1.5; // max spacing to mounting height ratio
    const gridCols = Math.ceil(Math.sqrt(numberOfLuminaires * (length / width)));
    const gridRows = Math.ceil(numberOfLuminaires / gridCols);
    const spacingX = length / gridCols;
    const spacingY = width / gridRows;

    // LPD
    const totalWattage = numberOfLuminaires * luminaire.wattage;
    const lpd = totalWattage / area;

    return {
      name,
      spaceType,
      area,
      dimensions: `${length}m × ${width}m × ${height}m`,
      requiredLux,
      luminaireType,
      luminaireWattage: luminaire.wattage,
      luminaireLumens: luminaire.lumens,
      luminaireEfficacy: luminaire.efficacy,
      roomIndex: parseFloat(roomIndex.toFixed(2)),
      utilizationFactor: parseFloat(utilizationFactor.toFixed(3)),
      maintenanceFactor,
      luminaireCount: numberOfLuminaires,
      layout: { rows: gridRows, columns: gridCols, spacingX: parseFloat(spacingX.toFixed(2)), spacingY: parseFloat(spacingY.toFixed(2)) },
      achievedLux: Math.round(achievedLux),
      luxCompliant: achievedLux >= requiredLux,
      totalWattage,
      lpdWPerM2: parseFloat(lpd.toFixed(2)),
    };
  }

  /**
   * Simplified UF lookup based on room index and reflectances
   * Real-world: use manufacturer's UF table. This is an approximation.
   */
  getUtilizationFactor(roomIndex, rhoC, rhoW) {
    // Simplified UF = f(RI, ceiling reflectance, wall reflectance)
    const baseUF = Math.min(0.85, 0.20 + roomIndex * 0.15);
    const reflectanceBoost = (rhoC * 0.3 + rhoW * 0.2);
    return Math.min(0.85, Math.max(0.25, baseUF + reflectanceBoost - 0.3));
  }
}

export default LightingDesignCalculator;
