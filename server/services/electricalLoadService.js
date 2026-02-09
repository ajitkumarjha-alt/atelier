/**
 * Electrical Load Calculation Service
 * 
 * Performs electrical load calculations for buildings and societies
 * Based on MSEDCL requirements and NBC/EcoNiwas Samhita standards
 */

class ElectricalLoadCalculator {
  constructor(db) {
    this.db = db;
  }

  /**
   * Main calculation function
   * @param {Object} inputs - All input parameters (~100 fields)
   * @param {Array} selectedBuildings - Array of building objects
   * @returns {Object} - Complete calculation results
   */
  async calculate(inputs, selectedBuildings) {
    try {
      // Validate inputs
      this.validateInputs(inputs);

      const buildingsList = Array.isArray(selectedBuildings) ? selectedBuildings : [];

      // Calculate Society Common Area Loads
      const societyLoads = await this.calculateSocietyCALoads(inputs);

      const hasBuildingMetadata = buildingsList.some(building => (
        building && (building.floor_count || building.total_height_m)
      ));

      if (hasBuildingMetadata && buildingsList.length > 0) {
        const buildingBreakdowns = [];
        let allFlatLoads = [];

        for (const building of buildingsList) {
          const buildingHeight = Number(building.total_height_m) || inputs.buildingHeight;
          const numberOfFloors = Number(building.floor_count) || inputs.numberOfFloors;
          const gfEntranceLobby = Number(building.gf_entrance_lobby || building.gfEntranceLobby) || inputs.gfEntranceLobby;
          const typicalFloorLobby = Number(building.avg_typical_lobby_area || building.typical_lobby_area || building.typicalLobbyArea) || inputs.typicalFloorLobby;
          const buildingInputs = {
            ...inputs,
            buildingHeight,
            numberOfFloors,
            gfEntranceLobby,
            typicalFloorLobby
          };

          const buildingLoads = await this.calculateBuildingCALoads(buildingInputs);
          
          // Calculate flat loads for this building
          const flatLoads = this.calculateFlatLoads(building.flats || []);
          const flatLoadsWithDF = this.applyDemandFactors(flatLoads);
          
          const buildingTotals = this.getBuildingTotals(buildingLoads);
          const flatTotals = this.getCategoryTotals(flatLoadsWithDF);
          
          // Combine totals
          const combinedTotals = {
            tcl: buildingTotals.tcl + flatTotals.tcl,
            maxDemand: buildingTotals.maxDemand + flatTotals.maxDemand,
            essential: buildingTotals.essential + flatTotals.essential,
            fire: buildingTotals.fire + flatTotals.fire
          };

          buildingBreakdowns.push({
            buildingId: building.id,
            buildingName: building.name,
            buildingHeight,
            numberOfFloors,
            buildingCALoads: buildingLoads,
            flatLoads: flatLoadsWithDF,
            totals: combinedTotals,
            isTwin: building.is_twin || !!building.twin_of_building_id,
            twinOfBuildingId: building.twin_of_building_id
          });
          
          allFlatLoads.push(flatLoadsWithDF);
        }

        const mergedBuildingLoads = this.mergeBuildingLoadGroups(
          buildingBreakdowns.map(breakdown => breakdown.buildingCALoads)
        );
        
        const mergedFlatLoads = this.mergeFlatLoads(allFlatLoads);

        const totals = this.aggregateLoadsFromTotals(
          buildingBreakdowns.map(breakdown => breakdown.totals),
          societyLoads,
          buildingsList.length
        );

        return {
          buildingCALoads: mergedBuildingLoads,
          flatLoads: mergedFlatLoads,
          societyCALoads: societyLoads,
          totals: totals,
          selectedBuildings: buildingsList,
          buildingBreakdowns: buildingBreakdowns
        };
      }

      // Fallback: single-building assumption
      const buildingLoads = await this.calculateBuildingCALoads(inputs);
      const totals = this.aggregateLoads(
        buildingLoads,
        societyLoads,
        buildingsList.length
      );

      return {
        buildingCALoads: buildingLoads,
        societyCALoads: societyLoads,
        totals: totals,
        selectedBuildings: buildingsList
      };
    } catch (error) {
      console.error('Calculation error:', error);
      throw new Error(`Calculation failed: ${error.message}`);
    }
  }

  /**
   * Validate input parameters
   */
  validateInputs(inputs) {
    const required = ['buildingHeight', 'numberOfFloors', 'passengerLifts'];
    for (const field of required) {
      if (!inputs[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Calculate Building Common Area Loads
   * Mirrors "Building CA LOAD" Excel sheet
   */
  async calculateBuildingCALoads(inputs) {
    const loads = [];

    // 1. Lighting & Small Power
    loads.push(this.calculateLighting(inputs));

    // 2. Lifts
    loads.push(await this.calculateLifts(inputs));

    // 3. HVAC & Ventilation
    loads.push(await this.calculateHVAC(inputs));

    // 4. Staircase & Lobby Pressurization
    loads.push(await this.calculatePressurization(inputs));

    // 5. PHE (Building level)
    loads.push(await this.calculateBuildingPHE(inputs));

    // 6. Fire Fighting (Building level)
    loads.push(this.calculateBuildingFF(inputs));

    // 7. Other Building Loads
    loads.push(this.calculateOtherBuildingLoads(inputs));

    // Apply demand factors to each category
    return loads.map(load => this.applyDemandFactors(load));
  }

  /**
   * Calculate Residential Flat Loads
   * Based on NBC and EcoNiwas Samhita standards
   */
  calculateFlatLoads(flats) {
    if (!flats || flats.length === 0) {
      return {
        category: 'Residential Flat Loads',
        items: []
      };
    }

    const items = [];

    for (const flat of flats) {
      const flatType = flat.flat_type || 'Unknown';
      const areaSqft = parseFloat(flat.area_sqft) || 0;
      const areaSqm = areaSqft * 0.092903; // Convert sqft to sqm
      const count = parseInt(flat.total_count) || 0;

      if (count === 0 || areaSqm === 0) continue;

      // Calculate connected load per flat based on area
      // NBC 2016 / EcoNiwas Samhita: 20-25 W/sqm for residential
      const wattPerSqm = 25; // Conservative estimate
      const loadPerFlatKW = (areaSqm * wattPerSqm) / 1000;
      
      // Total connected load for all flats of this type
      const totalTCL = loadPerFlatKW * count;

      items.push({
        description: `${flatType} (${areaSqft.toFixed(0)} sqft)`,
        areaSqm: areaSqm.toFixed(1),
        wattPerSqm: wattPerSqm,
        loadPerUnit: loadPerFlatKW.toFixed(2),
        nos: count,
        tcl: totalTCL,
        // Residential demand factors
        // MDF: Lower for residential due to diversity
        // EDF: Minimal essential loads for flats
        // FDF: No fire loads for individual flats
        mdf: 0.4, // 40% diversity factor for multiple flats
        edf: 0.1, // 10% essential (minimal emergency lighting)
        fdf: 0.0  // No fire loads
      });
    }

    return {
      category: 'Residential Flat Loads',
      items: items
    };
  }

  /**
   * Lighting Calculations
   */
  calculateLighting(inputs) {
    const items = [];

    // GF Entrance Lobby
    const gfLobby = {
      description: 'GF Entrance Lobby',
      areaSqm: inputs.gfEntranceLobby || 100,
      wattPerSqm: 3.0, // EcoNiwas Samhita
      nos: 1,
      tcl: 0,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25
    };
    gfLobby.tcl = (gfLobby.wattPerSqm * gfLobby.areaSqm) / 1000;
    items.push(gfLobby);

    // Typical Floor Lobby
    const typicalLobby = {
      description: 'Typical Floor Lobby',
      areaSqm: inputs.typicalFloorLobby || 30,
      wattPerSqm: 3.0,
      nos: inputs.numberOfFloors || 38,
      tcl: 0,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25
    };
    typicalLobby.tcl = (typicalLobby.wattPerSqm * typicalLobby.areaSqm * typicalLobby.nos) / 1000;
    items.push(typicalLobby);

    // Staircases
    const staircases = {
      description: 'Staircases & Landings',
      nos: (inputs.numberOfFloors || 38) * 2 * 2, // floors × 2 stairs × 2 landings
      wattPerFixture: 20, // 20W LED per landing
      tcl: 0,
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0 // Full load during fire
    };
    staircases.tcl = (staircases.wattPerFixture * staircases.nos) / 1000;
    items.push(staircases);

    // Terrace Lighting
    if (inputs.terraceLighting) {
      const terrace = {
        description: 'Terrace Lighting',
        areaSqm: inputs.terraceArea || 200,
        wattPerSqm: 2.0,
        nos: 1,
        tcl: 0,
        mdf: 0.6,
        edf: 0.6,
        fdf: 0.25
      };
      terrace.tcl = (terrace.wattPerSqm * terrace.areaSqm) / 1000;
      items.push(terrace);
    }

    // External & Landscape Lighting
    if (inputs.landscapeLighting) {
      const landscape = {
        description: 'Landscape & External Lighting',
        totalLoad: inputs.landscapeLightingLoad || 10,
        nos: 1,
        tcl: inputs.landscapeLightingLoad || 10,
        mdf: 0.8,
        edf: 0.6,
        fdf: 0.0
      };
      items.push(landscape);
    }

    return {
      category: 'Lighting & Small Power',
      items: items
    };
  }

  /**
   * Lift Calculations with lookup
   */
  async calculateLifts(inputs) {
    const buildingHeight = inputs.buildingHeight || 90;
    
    // Lookup lift power from database
    const liftPowerKW = await this.lookupValue('lift_power', 'building_height', buildingHeight);

    const items = [];

    // Passenger Lifts
    if (inputs.passengerLifts > 0) {
      items.push({
        description: 'Passenger Lifts',
        nos: inputs.passengerLifts,
        kwPerUnit: liftPowerKW,
        tcl: inputs.passengerLifts * liftPowerKW,
        mdf: 0.6,
        edf: 0.6,
        fdf: 0.0 // Not used during fire
      });
    }

    // Passenger + Fire Lift
    if (inputs.passengerFireLifts > 0) {
      items.push({
        description: 'Passenger + Fire Lift',
        nos: inputs.passengerFireLifts,
        kwPerUnit: liftPowerKW,
        tcl: inputs.passengerFireLifts * liftPowerKW,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0 // Full load during fire
      });
    }

    // Firemen Evacuation Lift
    if (inputs.firemenLifts > 0) {
      items.push({
        description: 'Firemen Evac/Service Lift',
        nos: inputs.firemenLifts,
        kwPerUnit: liftPowerKW,
        tcl: inputs.firemenLifts * liftPowerKW,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0
      });
    }

    return {
      category: 'Lifts',
      items: items
    };
  }

  /**
   * HVAC & Ventilation Calculations
   */
  async calculateHVAC(inputs) {
    const items = [];

    // Lobby AC (if applicable)
    if (inputs.lobbyType === 'AC') {
      const lobbyArea = (inputs.gfEntranceLobby || 100) + (inputs.typicalFloorLobby || 30) * (inputs.numberOfFloors || 38);
      const lobbyAreaSqft = lobbyArea * 10.76;
      const tonnage = Math.ceil(lobbyAreaSqft / 200); // 1 TR per 200 sqft
      const acPower = await this.lookupValue('ac_power', 'tonnage', tonnage > 3 ? 3 : tonnage);

      items.push({
        description: 'Lobby Air Conditioning',
        tonnage: tonnage,
        kwPerTR: acPower,
        tcl: tonnage * acPower,
        mdf: 0.8,
        edf: 0.0, // Not essential
        fdf: 0.0
      });
    }

    // Mechanical Ventilation
    if (inputs.lobbyType === 'Mech. Vent' || inputs.mechanicalVentilation) {
      const ventPower = await this.lookupValue('ventilation_fan', 'cfm', inputs.ventilationCFM || 5000);
      const numFans = inputs.ventilationFans || 4;

      items.push({
        description: 'Mechanical Ventilation Fans',
        nos: numFans,
        kwPerUnit: ventPower,
        tcl: numFans * ventPower,
        mdf: 0.7,
        edf: 0.7,
        fdf: 0.0
      });
    }

    return {
      category: 'HVAC & Ventilation',
      items: items
    };
  }

  /**
   * Pressurization Systems
   */
  async calculatePressurization(inputs) {
    const items = [];

    // Staircase Pressurization
    const staircaseFanPower = await this.lookupValue('pressurization_fan', 'staircase', 'standard');
    const numStaircases = inputs.numberOfStaircases || 2;

    items.push({
      description: 'Staircase Pressurization Fans',
      nos: numStaircases,
      kwPerUnit: staircaseFanPower,
      tcl: numStaircases * staircaseFanPower,
      mdf: 0.6,
      edf: 0.6,
      fdf: 1.0 // Full during fire
    });

    // Fire Lift Lobby Pressurization
    if (inputs.passengerFireLifts > 0 || inputs.firemenLifts > 0) {
      const lobbyFanPower = await this.lookupValue('pressurization_fan', 'lobby', 'standard');
      const numLobbies = inputs.numberOfFloors || 38;

      items.push({
        description: 'Fire Lift Lobby Pressurization',
        nos: numLobbies,
        kwPerUnit: lobbyFanPower,
        tcl: numLobbies * lobbyFanPower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0
      });
    }

    return {
      category: 'Pressurization Systems',
      items: items
    };
  }

  /**
   * Building PHE (Plumbing & Hydraulic Equipment)
   */
  async calculateBuildingPHE(inputs) {
    const items = [];

    // Booster Pumps
    if (inputs.boosterPumpFlow) {
      const pumpPower = await this.lookupValue('phe_pump', 'flow_lpm', inputs.boosterPumpFlow);
      const pumpConfig = inputs.boosterPumpSet || '1W+1S'; // Working + Standby
      const numPumps = pumpConfig.includes('2W') ? 2 : 1;

      items.push({
        description: 'PHE Booster Pumps',
        config: pumpConfig,
        flowLPM: inputs.boosterPumpFlow,
        nos: numPumps,
        kwPerUnit: pumpPower,
        tcl: numPumps * pumpPower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0
      });
    }

    // Sewage Pumps
    if (inputs.sewagePumpCapacity) {
      const sewagePower = await this.lookupValue('sewage_pump', 'capacity_lpm', inputs.sewagePumpCapacity);
      const numSewagePumps = inputs.sewagePumpSet || 2;

      items.push({
        description: 'Sewage Pumps',
        capacityLPM: inputs.sewagePumpCapacity,
        nos: numSewagePumps,
        kwPerUnit: sewagePower,
        tcl: numSewagePumps * sewagePower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 0.0
      });
    }

    return {
      category: 'PHE (Building Level)',
      items: items
    };
  }

  /**
   * Building Fire Fighting Equipment
   */
  calculateBuildingFF(inputs) {
    const items = [];

    // Wet Riser Pump (if separate from main system)
    if (inputs.wetRiserPump) {
      items.push({
        description: 'Wet Riser Pump',
        kwPerUnit: inputs.wetRiserPumpPower || 11,
        nos: 1,
        tcl: inputs.wetRiserPumpPower || 11,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0
      });
    }

    return {
      category: 'Fire Fighting (Building)',
      items: items
    };
  }

  /**
   * Other Building Loads
   */
  calculateOtherBuildingLoads(inputs) {
    const items = [];

    // Security Systems
    items.push({
      description: 'Security & CCTV',
      tcl: inputs.securitySystemLoad || 2,
      nos: 1,
      mdf: 1.0,
      edf: 1.0,
      fdf: 0.0
    });

    // Common Area Small Power
    items.push({
      description: 'Common Area Power Sockets',
      tcl: inputs.smallPowerLoad || 5,
      nos: 1,
      mdf: 0.5,
      edf: 0.5,
      fdf: 0.0
    });

    return {
      category: 'Other Building Loads',
      items: items
    };
  }

  /**
   * Calculate Society-Level Loads
   */
  async calculateSocietyCALoads(inputs) {
    const loads = [];

    // Main Fire Fighting System
    loads.push(await this.calculateFFPumps(inputs));

    // PHE Transfer Pumps
    loads.push(await this.calculatePHETransferPumps(inputs));

    // Society Infrastructure
    loads.push(await this.calculateSocietyInfrastructure(inputs));

    return loads.map(load => this.applyDemandFactors(load));
  }

  /**
   * Main Fire Fighting Pumps
   */
  async calculateFFPumps(inputs) {
    const items = [];

    // Main Hydrant Pump
    const mainFlow = inputs.mainPumpFlow || 2850;
    const mainPumpPower = await this.lookupValue('ff_main_pump', 'flow_lpm', mainFlow);
    const pumpConfig = inputs.fbtPumpSetType || 'Main+SBY+Jky';
    const mainPumpCount = pumpConfig.includes('2 Main') ? 2 : 1;

    items.push({
      description: 'Main Hydrant Pump',
      flowLPM: mainFlow,
      nos: mainPumpCount,
      kwPerUnit: mainPumpPower,
      tcl: mainPumpCount * mainPumpPower,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25 // Jockey only, main during fire
    });

    // Jockey Pump
    const jockeyPower = await this.lookupValue('ff_jockey_pump', 'standard', '180');
    items.push({
      description: 'Hydrant Jockey Pump',
      flowLPM: 180,
      nos: mainPumpCount,
      kwPerUnit: jockeyPower,
      tcl: mainPumpCount * jockeyPower,
      mdf: 0.6,
      edf: 0.6,
      fdf: 0.25
    });

    // Sprinkler System
    if (inputs.sprinklerPumpFlow) {
      const sprinklerPower = await this.lookupValue('ff_sprinkler_pump', 'flow_lpm', inputs.sprinklerPumpFlow);
      const sprinklerConfig = inputs.sprinklerPumpSet || 'Main+SBY+Jky';
      const sprinklerCount = sprinklerConfig.includes('2 Main') ? 2 : 1;

      items.push({
        description: 'Sprinkler Main Pump',
        flowLPM: inputs.sprinklerPumpFlow,
        nos: sprinklerCount,
        kwPerUnit: sprinklerPower,
        tcl: sprinklerCount * sprinklerPower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 0.25
      });

      items.push({
        description: 'Sprinkler Jockey Pump',
        flowLPM: 180,
        nos: sprinklerCount,
        kwPerUnit: jockeyPower,
        tcl: sprinklerCount * jockeyPower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 0.25
      });
    }

    return {
      category: 'Fire Fighting System',
      items: items
    };
  }

  /**
   * PHE Transfer Pumps (Society Level)
   */
  async calculatePHETransferPumps(inputs) {
    const items = [];

    // Domestic Transfer Pumps
    if (inputs.domTransferFlow) {
      const transferPower = await this.lookupValue('phe_pump', 'flow_lpm', inputs.domTransferFlow);
      const transferConfig = inputs.domTransferConfig || '1W+1S';
      const transferCount = transferConfig.includes('2W') ? 2 : (transferConfig.includes('3W') ? 3 : 1);

      items.push({
        description: 'Domestic Transfer Pumps',
        config: transferConfig,
        flowLPM: inputs.domTransferFlow,
        nos: transferCount,
        kwPerUnit: transferPower,
        tcl: transferCount * transferPower,
        mdf: 0.6,
        edf: 0.6,
        fdf: 1.0
      });
    }

    return {
      category: 'PHE Transfer Pumps',
      items: items
    };
  }

  /**
   * Society Infrastructure
   */
  async calculateSocietyInfrastructure(inputs) {
    const items = [];

    // STP/WTP
    if (inputs.stpCapacity) {
      const stpPower = await this.lookupValue('stp_power', 'capacity_kld', inputs.stpCapacity);
      items.push({
        description: 'STP/WTP Plant',
        capacityKLD: inputs.stpCapacity,
        nos: 1,
        kwPerUnit: stpPower,
        tcl: stpPower,
        mdf: 0.8,
        edf: 0.0,
        fdf: 0.0
      });
    }

    // Clubhouse / Amenities
    if (inputs.clubhouseLoad) {
      items.push({
        description: 'Clubhouse & Amenities',
        tcl: inputs.clubhouseLoad,
        nos: 1,
        mdf: 0.5,
        edf: 0.0,
        fdf: 0.0
      });
    }

    // EV Charging Stations
    if (inputs.evChargerCount > 0) {
      const evPower = await this.lookupValue('ev_charger', 'type', inputs.evChargerType || 'fast');
      items.push({
        description: `EV Charging Stations (${inputs.evChargerType || 'fast'})`,
        nos: inputs.evChargerCount,
        kwPerUnit: evPower,
        tcl: inputs.evChargerCount * evPower,
        mdf: 0.4,
        edf: 0.0,
        fdf: 0.0
      });
    }

    // Street Lighting
    if (inputs.streetLightingLoad) {
      items.push({
        description: 'Street & Common Area Lighting',
        tcl: inputs.streetLightingLoad,
        nos: 1,
        mdf: 1.0,
        edf: 0.6,
        fdf: 0.0
      });
    }

    return {
      category: 'Society Infrastructure',
      items: items
    };
  }

  /**
   * Apply Demand Factors to load group
   */
  applyDemandFactors(loadGroup) {
    loadGroup.items = loadGroup.items.map(item => {
      item.maxDemandKW = item.tcl * (item.mdf || 0.6);
      item.essentialKW = item.tcl * (item.edf || 0.6);
      item.fireKW = item.tcl * (item.fdf || 0.0);
      return item;
    });

    // Calculate category totals
    loadGroup.totalTCL = loadGroup.items.reduce((sum, item) => sum + (item.tcl || 0), 0);
    loadGroup.totalMaxDemand = loadGroup.items.reduce((sum, item) => sum + (item.maxDemandKW || 0), 0);
    loadGroup.totalEssential = loadGroup.items.reduce((sum, item) => sum + (item.essentialKW || 0), 0);
    loadGroup.totalFire = loadGroup.items.reduce((sum, item) => sum + (item.fireKW || 0), 0);

    return loadGroup;
  }

  getBuildingTotals(buildingLoads) {
    return {
      tcl: buildingLoads.reduce((sum, cat) => sum + cat.totalTCL, 0),
      maxDemand: buildingLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0),
      essential: buildingLoads.reduce((sum, cat) => sum + cat.totalEssential, 0),
      fire: buildingLoads.reduce((sum, cat) => sum + cat.totalFire, 0)
    };
  }

  getCategoryTotals(category) {
    return {
      tcl: category.totalTCL || 0,
      maxDemand: category.totalMaxDemand || 0,
      essential: category.totalEssential || 0,
      fire: category.totalFire || 0
    };
  }

  mergeFlatLoads(flatLoadsList) {
    if (!flatLoadsList.length) return { category: 'Residential Flat Loads', items: [], totalTCL: 0, totalMaxDemand: 0, totalEssential: 0, totalFire: 0 };

    const merged = {
      category: 'Residential Flat Loads',
      items: [],
      totalTCL: 0,
      totalMaxDemand: 0,
      totalEssential: 0,
      totalFire: 0
    };

    const itemMap = new Map();

    flatLoadsList.forEach(flatLoads => {
      if (!flatLoads || !flatLoads.items) return;
      
      flatLoads.items.forEach(item => {
        const key = item.description;
        const existing = itemMap.get(key);
        
        if (!existing) {
          itemMap.set(key, { ...item });
        } else {
          existing.nos = (existing.nos || 0) + (item.nos || 0);
          existing.tcl = (existing.tcl || 0) + (item.tcl || 0);
          existing.maxDemandKW = (existing.maxDemandKW || 0) + (item.maxDemandKW || 0);
          existing.essentialKW = (existing.essentialKW || 0) + (item.essentialKW || 0);
          existing.fireKW = (existing.fireKW || 0) + (item.fireKW || 0);
        }
      });
    });

    merged.items = Array.from(itemMap.values());
    merged.totalTCL = merged.items.reduce((sum, item) => sum + (item.tcl || 0), 0);
    merged.totalMaxDemand = merged.items.reduce((sum, item) => sum + (item.maxDemandKW || 0), 0);
    merged.totalEssential = merged.items.reduce((sum, item) => sum + (item.essentialKW || 0), 0);
    merged.totalFire = merged.items.reduce((sum, item) => sum + (item.fireKW || 0), 0);

    return merged;
  }

  mergeBuildingLoadGroups(buildingLoadsByBuilding) {
    if (!buildingLoadsByBuilding.length) return [];

    const mergedGroups = buildingLoadsByBuilding[0].map(group => ({
      category: group.category,
      items: group.items.map(item => ({ ...item })),
      totalTCL: group.totalTCL,
      totalMaxDemand: group.totalMaxDemand,
      totalEssential: group.totalEssential,
      totalFire: group.totalFire
    }));

    for (let i = 1; i < buildingLoadsByBuilding.length; i++) {
      const buildingGroups = buildingLoadsByBuilding[i];
      buildingGroups.forEach((group, index) => {
        const targetGroup = mergedGroups[index];
        if (!targetGroup) {
          mergedGroups.push({
            category: group.category,
            items: group.items.map(item => ({ ...item })),
            totalTCL: group.totalTCL,
            totalMaxDemand: group.totalMaxDemand,
            totalEssential: group.totalEssential,
            totalFire: group.totalFire
          });
          return;
        }

        const itemMap = new Map(targetGroup.items.map(item => [item.description, item]));
        group.items.forEach(item => {
          const existing = itemMap.get(item.description);
          if (!existing) {
            targetGroup.items.push({ ...item });
            itemMap.set(item.description, targetGroup.items[targetGroup.items.length - 1]);
            return;
          }
          existing.nos = (existing.nos || 0) + (item.nos || 0);
          existing.tcl = (existing.tcl || 0) + (item.tcl || 0);
          existing.maxDemandKW = (existing.maxDemandKW || 0) + (item.maxDemandKW || 0);
          existing.essentialKW = (existing.essentialKW || 0) + (item.essentialKW || 0);
          existing.fireKW = (existing.fireKW || 0) + (item.fireKW || 0);
        });

        targetGroup.totalTCL = targetGroup.items.reduce((sum, item) => sum + (item.tcl || 0), 0);
        targetGroup.totalMaxDemand = targetGroup.items.reduce((sum, item) => sum + (item.maxDemandKW || 0), 0);
        targetGroup.totalEssential = targetGroup.items.reduce((sum, item) => sum + (item.essentialKW || 0), 0);
        targetGroup.totalFire = targetGroup.items.reduce((sum, item) => sum + (item.fireKW || 0), 0);
      });
    }

    return mergedGroups;
  }

  aggregateLoadsFromTotals(buildingTotalsList, societyLoads, numberOfBuildings) {
    const totalBuildingTCL = buildingTotalsList.reduce((sum, totals) => sum + (totals.tcl || 0), 0);
    const totalBuildingMaxDemand = buildingTotalsList.reduce((sum, totals) => sum + (totals.maxDemand || 0), 0);
    const totalBuildingEssential = buildingTotalsList.reduce((sum, totals) => sum + (totals.essential || 0), 0);
    const totalBuildingFire = buildingTotalsList.reduce((sum, totals) => sum + (totals.fire || 0), 0);

    const totalSocietyTCL = societyLoads.reduce((sum, cat) => sum + cat.totalTCL, 0);
    const totalSocietyMaxDemand = societyLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0);
    const totalSocietyEssential = societyLoads.reduce((sum, cat) => sum + cat.totalEssential, 0);
    const totalSocietyFire = societyLoads.reduce((sum, cat) => sum + cat.totalFire, 0);

    const grandTotalTCL = totalBuildingTCL + totalSocietyTCL;
    const grandMaxDemand = totalBuildingMaxDemand + totalSocietyMaxDemand;
    const grandEssential = totalBuildingEssential + totalSocietyEssential;
    const grandFire = totalBuildingFire + totalSocietyFire;

    const transformerSizeKVA = Math.ceil(grandMaxDemand / 0.9 / 100) * 100;

    return {
      perBuilding: {
        tcl: totalBuildingTCL,
        maxDemand: totalBuildingMaxDemand,
        essential: totalBuildingEssential,
        fire: totalBuildingFire
      },
      society: {
        tcl: totalSocietyTCL,
        maxDemand: totalSocietyMaxDemand,
        essential: totalSocietyEssential,
        fire: totalSocietyFire
      },
      grandTotalTCL: grandTotalTCL,
      totalMaxDemand: grandMaxDemand,
      totalEssential: grandEssential,
      totalFire: grandFire,
      transformerSizeKVA: transformerSizeKVA,
      numberOfBuildings: numberOfBuildings
    };
  }

  /**
   * Aggregate all loads across buildings and society
   */
  aggregateLoads(buildingLoads, societyLoads, numberOfBuildings) {
    const totalBuildingTCL = buildingLoads.reduce((sum, cat) => sum + cat.totalTCL, 0);
    const totalBuildingMaxDemand = buildingLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0);
    const totalBuildingEssential = buildingLoads.reduce((sum, cat) => sum + cat.totalEssential, 0);
    const totalBuildingFire = buildingLoads.reduce((sum, cat) => sum + cat.totalFire, 0);

    const totalSocietyTCL = societyLoads.reduce((sum, cat) => sum + cat.totalTCL, 0);
    const totalSocietyMaxDemand = societyLoads.reduce((sum, cat) => sum + cat.totalMaxDemand, 0);
    const totalSocietyEssential = societyLoads.reduce((sum, cat) => sum + cat.totalEssential, 0);
    const totalSocietyFire = societyLoads.reduce((sum, cat) => sum + cat.totalFire, 0);

    const grandTotalTCL = (totalBuildingTCL * numberOfBuildings) + totalSocietyTCL;
    const grandMaxDemand = (totalBuildingMaxDemand * numberOfBuildings) + totalSocietyMaxDemand;
    const grandEssential = (totalBuildingEssential * numberOfBuildings) + totalSocietyEssential;
    const grandFire = (totalBuildingFire * numberOfBuildings) + totalSocietyFire;

    // Transformer sizing (kVA at 0.9 PF)
    const transformerSizeKVA = Math.ceil(grandMaxDemand / 0.9 / 100) * 100; // Round up to nearest 100

    return {
      perBuilding: {
        tcl: totalBuildingTCL,
        maxDemand: totalBuildingMaxDemand,
        essential: totalBuildingEssential,
        fire: totalBuildingFire
      },
      society: {
        tcl: totalSocietyTCL,
        maxDemand: totalSocietyMaxDemand,
        essential: totalSocietyEssential,
        fire: totalSocietyFire
      },
      grandTotalTCL: grandTotalTCL,
      totalMaxDemand: grandMaxDemand,
      totalEssential: grandEssential,
      totalFire: grandFire,
      transformerSizeKVA: transformerSizeKVA,
      numberOfBuildings: numberOfBuildings
    };
  }

  /**
   * Lookup value from database tables
   */
  async lookupValue(category, lookupKey, lookupValue) {
    try {
      const result = await this.db.query(
        `SELECT result_value 
         FROM electrical_load_lookup_tables 
         WHERE category = $1 
           AND lookup_key = $2 
           AND lookup_value = $3`,
        [category, lookupKey, lookupValue.toString()]
      );

      if (result.rows.length === 0) {
        console.warn(`Lookup not found: ${category}, ${lookupKey}, ${lookupValue}. Using default.`);
        return this.getDefaultValue(category);
      }

      return parseFloat(result.rows[0].result_value);
    } catch (error) {
      console.error('Lookup error:', error);
      return this.getDefaultValue(category);
    }
  }

  /**
   * Get default value for category (fallback)
   */
  getDefaultValue(category) {
    const defaults = {
      'lift_power': 15,
      'phe_pump': 2.2,
      'ff_main_pump': 112,
      'ff_jockey_pump': 9.33,
      'ff_sprinkler_pump': 56,
      'ac_power': 1.2,
      'ventilation_fan': 1.5,
      'pressurization_fan': 5.5,
      'sewage_pump': 3.0,
      'stp_power': 30,
      'ev_charger': 7.4
    };
    return defaults[category] || 10;
  }
}

export default ElectricalLoadCalculator;
