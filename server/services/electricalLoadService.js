/**
 * Electrical Load Calculation Service
 * 
 * Performs electrical load calculations for buildings and societies
 * Based on regulatory frameworks (MSEDCL, NBC, etc.) loaded from database
 * All factors and regulations are database-driven and configurable by L0 users
 * Supports multiple regulatory frameworks - user can select which to apply
 */

class ElectricalLoadCalculator {
  constructor(db) {
    this.db = db;
    this.factors = null; // Cache for electrical load factors
    this.regulations = null; // Cache for regulatory framework data
  }

  /**
   * Load electrical load factors from database
   * Factors are configurable by L0 users
   */
  async loadFactors() {
    if (this.factors) {
      return this.factors; // Return cached factors
    }

    const result = await this.db.query(
      'SELECT * FROM electrical_load_factors WHERE is_active = true ORDER BY category, sub_category'
    );

    // Organize factors by category and sub_category for easy lookup
    this.factors = {};
    for (const row of result.rows) {
      const key = `${row.category}/${row.sub_category || 'default'}/${row.description}`;
      this.factors[key] = {
        wattPerSqm: parseFloat(row.watt_per_sqm) ||null,
        mdf: parseFloat(row.mdf) || 0,
        edf: parseFloat(row.edf) || 0,
        fdf: parseFloat(row.fdf) || 0,
        notes: row.notes
      };
    }

    return this.factors;
  }

  /**
   * Get specific factor from loaded factors
   */
  getFactor(category, subCategory, description) {
    const key = `${category}/${subCategory || 'default'}/${description}`;
    if (this.factors && this.factors[key]) {
      return this.factors[key];
    }
    // Fallback to default values if not found
    console.warn(`Factor not found: ${key}, using defaults`);
    return { wattPerSqm: null, mdf: 0.5, edf: 0.5, fdf: 0 };
  }

  /**
   * Load regulatory framework for project
   * Loads all applicable regulations (MSEDCL, NBC, etc.) from database
   * @param {number} projectId - Project ID
   * @returns {Object} - Regulations object with all framework data
   */
  async loadRegulations(projectId) {
    if (this.regulations) {
      return this.regulations; // Return cached regulations
    }

    try {
      // Get selected frameworks for this project
      let frameworksResult = await this.db.query(`
        SELECT erf.*
        FROM project_regulation_selection prs
        JOIN electrical_regulation_frameworks erf ON prs.framework_id = erf.id
        WHERE prs.project_id = $1 AND prs.is_active = true AND erf.is_active = true
        ORDER BY erf.is_default DESC
      `, [projectId]);

      // If no selection, use default framework
      if (frameworksResult.rows.length === 0) {
        frameworksResult = await this.db.query(`
          SELECT * FROM electrical_regulation_frameworks 
          WHERE is_default = true AND is_active = true 
          LIMIT 1
        `);
      }

      if (frameworksResult.rows.length === 0) {
        console.warn('No regulatory framework found, using built-in defaults');
        this.regulations = this.getDefaultRegulations();
        return this.regulations;
      }

      const frameworkIds = frameworksResult.rows.map(r => r.id);

      // Load all regulation components
      this.regulations = {
        frameworks: frameworksResult.rows,
        primaryFramework: frameworksResult.rows[0],
        areaTypes: await this.loadRegulationTable('regulation_area_types', frameworkIds),
        loadStandards: await this.loadRegulationTable('regulation_load_standards', frameworkIds),
        dtcThresholds: await this.loadRegulationTable('regulation_dtc_thresholds', frameworkIds),
        sanctionedLimits: await this.loadRegulationTable('regulation_sanctioned_load_limits', frameworkIds),
        powerFactors: await this.loadRegulationTable('regulation_power_factors', frameworkIds),
        substationReqs: await this.loadRegulationTable('regulation_substation_requirements', frameworkIds),
        landReqs: await this.loadRegulationTable('regulation_land_requirements', frameworkIds),
        leaseTerms: await this.loadRegulationTable('regulation_lease_terms', frameworkIds),
        infraSpecs: await this.loadRegulationTable('regulation_infrastructure_specs', frameworkIds),
        definitions: await this.loadRegulationTable('regulation_definitions', frameworkIds)
      };

      return this.regulations;
    } catch (error) {
      console.error('Error loading regulations:', error);
      this.regulations = this.getDefaultRegulations();
      return this.regulations;
    }
  }

  /**
   * Load regulation table data
   * @param {string} tableName - Name of regulation table
   * @param {Array<number>} frameworkIds - Framework IDs to load
   */
  async loadRegulationTable(tableName, frameworkIds) {
    const result = await this.db.query(`
      SELECT * FROM ${tableName} 
      WHERE framework_id = ANY($1) AND is_active = true
      ORDER BY framework_id, id
    `, [frameworkIds]);
    return result.rows;
  }

  /**
   * Get default regulations (fallback when database is empty)
   */
  getDefaultRegulations() {
    return {
      frameworks: [{ framework_code: 'DEFAULT', framework_name: 'Built-in Defaults' }],
      primaryFramework: { framework_code: 'DEFAULT', framework_name: 'Built-in Defaults' },
      areaTypes: [],
      loadStandards: [
        { premise_type: 'RESIDENTIAL', area_measurement_type: 'CARPET_AREA', minimum_load_w_per_sqm: 75 }
      ],
      dtcThresholds: [
        { area_type_code: 'RURAL', threshold_kva: 25 },
        { area_type_code: 'URBAN', threshold_kva: 75 },
        { area_type_code: 'METRO', threshold_kva: 250 }
      ],
      sanctionedLimits: [
        { limit_type: 'SINGLE_CONSUMER', max_load_kw: 160, max_load_kva: 200 },
        { limit_type: 'MULTIPLE_CONSUMERS_CUMULATIVE', max_load_kw: 480, max_load_kva: 600 }
      ],
      powerFactors: [
        { load_type: 'SANCTIONED_LOAD', power_factor: 0.8 },
        { load_type: 'LOAD_AFTER_DF', power_factor: 0.9 },
        { load_type: 'TRANSFORMER_SIZING', power_factor: 0.9 }
      ],
      substationReqs: [],
      landReqs: [],
      leaseTerms: [],
      infraSpecs: [],
      definitions: []
    };
  }

  /**
   * Calculate minimum load per regulations (e.g., MSEDCL 75 W/sq.m)
   * @param {number} carpetArea - Carpet area in sq.m
   * @param {string} premiseType - RESIDENTIAL, COMMERCIAL_AC, COMMERCIAL_NO_AC
   * @param {boolean} hasAC - For commercial premises
   * @returns {number} - Minimum load in kW
   */
  calculateMinimumLoad(carpetArea, premiseType = 'RESIDENTIAL', hasAC = false) {
    if (!this.regulations || !carpetArea || carpetArea <= 0) {
      return 0;
    }

    let applicableStandard = null;

    if (premiseType === 'RESIDENTIAL') {
      applicableStandard = this.regulations.loadStandards.find(s => 
        s.premise_type === 'RESIDENTIAL'
      );
    } else if (premiseType === 'COMMERCIAL') {
      const type = hasAC ? 'COMMERCIAL_AC' : 'COMMERCIAL_NO_AC';
      applicableStandard = this.regulations.loadStandards.find(s => 
        s.premise_type === type
      );
    }

    if (!applicableStandard || !applicableStandard.minimum_load_w_per_sqm) {
      return 0;
    }

    // Convert W/sq.m to kW
    return (carpetArea * parseFloat(applicableStandard.minimum_load_w_per_sqm)) / 1000;
  }

  /**
   * Get power factor from regulations
   * @param {string} loadType - SANCTIONED_LOAD, LOAD_AFTER_DF, TRANSFORMER_SIZING
   * @returns {number} - Power factor (0.8, 0.9, etc.)
   */
  getPowerFactor(loadType) {
    if (!this.regulations) {
      return 0.9; // Default
    }

    const pf = this.regulations.powerFactors.find(p => 
      p.load_type === loadType
    );

    return pf ? parseFloat(pf.power_factor) : 0.9;
  }

  /**
   * Calculate DTC requirements based on regulations
   * @param {number} loadAfterDF_KW - Load after diversity factor in kW
   * @param {string} areaType - RURAL, URBAN, METRO, MAJOR_CITIES
   * @returns {Object} - DTC requirements
   */
  calculateDTCRequirements(loadAfterDF_KW, areaType = 'URBAN') {
    if (!this.regulations) {
      return { needed: false, reason: 'No regulations loaded' };
    }

    const pf = this.getPowerFactor('LOAD_AFTER_DF');
    const loadAfterDF_KVA = loadAfterDF_KW / pf;

    const threshold = this.regulations.dtcThresholds.find(t => 
      t.area_type_code === areaType
    );

    if (!threshold) {
      return { 
        needed: false, 
        reason: `No threshold defined for area type: ${areaType}`,
        loadAfterDF_KVA
      };
    }

    const thresholdKVA = parseFloat(threshold.threshold_kva);
    const needed = loadAfterDF_KVA > thresholdKVA;

    // Get land requirements for DTC
    const dtcLandReq = this.regulations.landReqs.find(l => 
      l.infrastructure_type === 'DTC_OUTDOOR' && 
      (!l.area_type_code || l.area_type_code === areaType)
    );

    // Calculate number of DTCs (assume 500 kVA per DTC)
    const dtcCapacity = 500; // kVA
    const dtcCount = Math.ceil(loadAfterDF_KVA / dtcCapacity);

    let totalLand = 0;
    if (dtcLandReq) {
      const baseLand = parseFloat(dtcLandReq.land_required_sqm) || 0;
      const additionalLand = parseFloat(dtcLandReq.additional_land_per_unit_sqm) || 0;
      totalLand = baseLand + ((dtcCount - 1) * additionalLand);
    }

    // Check for special requirements (Metro/Major Cities)
    const individualTransformerReq = this.regulations.infraSpecs.find(spec =>
      spec.infrastructure_type === 'INDIVIDUAL_TRANSFORMER' &&
      spec.area_type_code === areaType
    );

    const ringMainReq = this.regulations.infraSpecs.find(spec =>
      spec.infrastructure_type === 'RING_MAIN_SYSTEM' &&
      spec.area_type_code === areaType
    );

    return {
      needed,
      threshold: thresholdKVA,
      loadAfterDF_KVA: parseFloat(loadAfterDF_KVA.toFixed(2)),
      dtcCount,
      dtcCapacityPerUnit: dtcCapacity,
      totalCapacity: dtcCount * dtcCapacity,
      landRequired: totalLand,
      action: threshold.action_required,
      individualTransformerRequired: !!individualTransformerReq,
      ringMainRequired: !!ringMainReq
    };
  }

  /**
   * Calculate substation requirements based on regulations
   * @param {number} loadAfterDF_KW - Load after diversity factor in kW
   * @param {string} areaType - RURAL, URBAN, METRO, MAJOR_CITIES
   * @returns {Object} - Substation requirements
   */
  calculateSubstationRequirements(loadAfterDF_KW, areaType = 'URBAN') {
    if (!this.regulations) {
      return { needed: false, reason: 'No regulations loaded' };
    }

    const loadAfterDF_MVA = loadAfterDF_KW / 1000; // Convert to MVA

    // Find applicable substation requirement
    const substationReq = this.regulations.substationReqs.find(req => {
      if (req.area_type_code === 'ALL') return true;
      return req.area_type_code === areaType;
    });

    // Check against all applicable thresholds
    const applicableReqs = this.regulations.substationReqs.filter(req => 
      req.area_type_code === areaType || req.area_type_code === 'ALL'
    ).sort((a, b) => 
      parseFloat(a.min_load_after_df_mva) - parseFloat(b.min_load_after_df_mva)
    );

    let selectedReq = null;
    for (const req of applicableReqs) {
      const minLoad = parseFloat(req.min_load_after_df_mva);
      const maxLoad = req.max_load_after_df_mva ? parseFloat(req.max_load_after_df_mva) : Infinity;
      
      if (loadAfterDF_MVA > minLoad && loadAfterDF_MVA <= maxLoad) {
        selectedReq = req;
        break;
      }
    }

    if (!selectedReq) {
      return { 
        needed: false, 
        loadAfterDF_MVA: parseFloat(loadAfterDF_MVA.toFixed(3)),
        reason: 'Load does not require substation'
      };
    }

    // Get land requirement for this substation type
    const landReq = this.regulations.landReqs.find(l =>
      l.infrastructure_type.includes('SUBSTATION') &&
      (!l.area_type_code || l.area_type_code === areaType)
    );

    return {
      needed: true,
      loadAfterDF_MVA: parseFloat(loadAfterDF_MVA.toFixed(3)),
      substationType: selectedReq.substation_type,
      incomingFeeders: selectedReq.incoming_feeders_count,
      feederCapacity: selectedReq.feeder_capacity_mva,
      specialRequirements: selectedReq.special_requirements || [],
      landRequired: landReq ? parseFloat(landReq.land_required_sqm) : null,
      description: selectedReq.description
    };
  }

  /**
   * Validate sanctioned load against regulatory limits
   * @param {number} sanctionedLoadKW - Sanctioned load in kW
   * @param {number} sanctionedLoadKVA - Sanctioned load in kVA
   * @param {boolean} isMultipleConsumers - Whether this is for multiple consumers
   * @returns {Object} - Validation result
   */
  validateSanctionedLoad(sanctionedLoadKW, sanctionedLoadKVA, isMultipleConsumers = false) {
    if (!this.regulations) {
      return { valid: true, warnings: [] };
    }

    const limitType = isMultipleConsumers ? 'MULTIPLE_CONSUMERS_CUMULATIVE' : 'SINGLE_CONSUMER';
    const limit = this.regulations.sanctionedLimits.find(l => 
      l.limit_type === limitType
    );

    if (!limit) {
      return { valid: true, warnings: [] };
    }

    const maxKW = parseFloat(limit.max_load_kw);
    const maxKVA = parseFloat(limit.max_load_kva);
    const warnings = [];

    if (sanctionedLoadKW > maxKW) {
      warnings.push(`Sanctioned load ${sanctionedLoadKW.toFixed(2)} kW exceeds limit of ${maxKW} kW`);
    }

    if (sanctionedLoadKVA > maxKVA) {
      warnings.push(`Sanctioned load ${sanctionedLoadKVA.toFixed(2)} kVA exceeds limit of ${maxKVA} kVA`);
    }

    return {
      valid: warnings.length === 0,
      exceedsKWLimit: sanctionedLoadKW > maxKW,
      exceedsKVALimit: sanctionedLoadKVA > maxKVA,
      maxKW,
      maxKVA,
      warnings,
      description: limit.description
    };
  }

  /**
   * Main calculation function
   * @param {Object} inputs - All input parameters (~100 fields)
   * @param {Array} selectedBuildings - Array of building objects
   * @param {number} projectId - Project ID for loading regulations
   * @returns {Object} - Complete calculation results
   */
  async calculate(inputs, selectedBuildings, projectId = null) {
    try {
      // Load regulations and factors from database
      if (projectId) {
        await this.loadRegulations(projectId);
      }
      await this.loadFactors();

      // Validate inputs
      this.validateInputs(inputs);

      const buildingsList = Array.isArray(selectedBuildings) ? selectedBuildings : [];

      // Extract area type and carpet area from inputs
      const areaType = inputs.areaType || 'URBAN';
      const totalCarpetArea = parseFloat(inputs.totalCarpetArea) || 0;

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
          const buildingCarpetArea = parseFloat(building.total_carpet_area) || 0;
          
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
            carpetArea: buildingCarpetArea,
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

        // Calculate regulatory compliance (sanctioned load, DTC, substation)
        const regulatoryCompliance = this.calculateRegulatoryCompliance(
          totals,
          areaType,
          totalCarpetArea,
          buildingsList.length
        );

        return {
          buildingCALoads: mergedBuildingLoads,
          flatLoads: mergedFlatLoads,
          societyCALoads: societyLoads,
          totals: totals,
          selectedBuildings: buildingsList,
          buildingBreakdowns: buildingBreakdowns,
          regulatoryCompliance: regulatoryCompliance,
          regulatoryFramework: this.regulations?.primaryFramework || null,
          areaType: areaType
        };
      }

      // Fallback: single-building assumption
      const buildingLoads = await this.calculateBuildingCALoads(inputs);
      const totals = this.aggregateLoads(
        buildingLoads,
        societyLoads,
        buildingsList.length
      );

      // Calculate regulatory compliance
      const regulatoryCompliance = this.calculateRegulatoryCompliance(
        totals,
        areaType,
        totalCarpetArea,
        buildingsList.length
      );

      return {
        buildingCALoads: buildingLoads,
        societyCALoads: societyLoads,
        totals: totals,
        selectedBuildings: buildingsList,
        regulatoryCompliance: regulatoryCompliance,
        regulatoryFramework: this.regulations?.primaryFramework || null,
        areaType: areaType
      };
    } catch (error) {
      console.error('Calculation error:', error);
      throw new Error(`Calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate regulatory compliance
   * Includes sanctioned load, load after DF, DTC requirements, substation requirements
   * @param {Object} totals - Calculation totals
   * @param {string} areaType - RURAL, URBAN, METRO, MAJOR_CITIES
   * @param {number} totalCarpetArea - Total carpet area in sq.m
   * @param {number} buildingCount - Number of buildings
   * @returns {Object} - Regulatory compliance details
   */
  calculateRegulatoryCompliance(totals, areaType, totalCarpetArea, buildingCount) {
    if (!this.regulations) {
      return {
        note: 'Regulatory compliance not calculated - no regulations loaded'
      };
    }

    // 1. Calculate MSEDCL minimum load requirement
    const msedclMinimumKW = this.calculateMinimumLoad(totalCarpetArea, 'RESIDENTIAL');

    // 2. Sanctioned Load (WITHOUT Diversity Factor) - for billing/quotation
    const sanctionedLoadKW = Math.max(totals.grandTotalTCL, msedclMinimumKW);
    const sanctionedLoadPF = this.getPowerFactor('SANCTIONED_LOAD');
    const sanctionedLoadKVA = sanctionedLoadKW / sanctionedLoadPF;

    // 3. Load After DF (WITH Diversity Factor) - for DTC/infrastructure sizing only
    const loadAfterDF_KW = totals.totalMaxDemand;
    const loadAfterDF_PF = this.getPowerFactor('LOAD_AFTER_DF');
    const loadAfterDF_KVA = loadAfterDF_KW / loadAfterDF_PF;

    // 4. Validate sanctioned load against limits
    const isMultipleConsumers = buildingCount > 1;
    const validation = this.validateSanctionedLoad(
      sanctionedLoadKW,
      sanctionedLoadKVA,
      isMultipleConsumers
    );

    // 5. DTC requirements (based on load after DF only)
    const dtcRequirements = this.calculateDTCRequirements(loadAfterDF_KW, areaType);

    // 6. Substation requirements (based on load after DF only)
    const substationRequirements = this.calculateSubstationRequirements(loadAfterDF_KW, areaType);

    // 7. Land requirements
    const landRequirements = this.calculateLandRequirements(
      dtcRequirements,
      substationRequirements
    );

    // 8. Lease terms
    const leaseTerms = this.regulations.leaseTerms.length > 0 
      ? this.regulations.leaseTerms[0] 
      : null;

    return {
      // Minimum load per regulations
      msedclMinimum: {
        requiredKW: parseFloat(msedclMinimumKW.toFixed(2)),
        carpetArea: totalCarpetArea,
        standard: '75 W/sq.m (MSEDCL)',
        applied: sanctionedLoadKW === msedclMinimumKW
      },

      // Sanctioned Load (for billing/quotation)
      sanctionedLoad: {
        totalConnectedLoadKW: parseFloat(totals.grandTotalTCL.toFixed(2)),
        sanctionedLoadKW: parseFloat(sanctionedLoadKW.toFixed(2)),
        sanctionedLoadKVA: parseFloat(sanctionedLoadKVA.toFixed(2)),
        powerFactor: sanctionedLoadPF,
        note: 'Sanctioned Load/Contract Demand (without diversity factor) - used for quotation and billing'
      },

      // Load After DF (for infrastructure sizing)
      loadAfterDF: {
        maxDemandKW: parseFloat(loadAfterDF_KW.toFixed(2)),
        maxDemandKVA: parseFloat(loadAfterDF_KVA.toFixed(2)),
        essentialKW: parseFloat(totals.totalEssential.toFixed(2)),
        fireKW: parseFloat(totals.totalFire.toFixed(2)),
        powerFactor: loadAfterDF_PF,
        note: 'Load After Diversity Factor - ONLY for deciding DTC capacity, NOT for quotation'
      },

      // Validation against limits
      validation: validation,

      // DTC Requirements
      dtc: dtcRequirements,

      // Substation Requirements
      substation: substationRequirements,

      // Land Requirements
      land: landRequirements,

      // Lease Terms
      lease: leaseTerms ? {
        duration: `${leaseTerms.lease_duration_years} years`,
        annualRent: `Rs. ${leaseTerms.annual_rent_amount}/-`,
        upfrontPayment: `Rs. ${leaseTerms.total_upfront_payment}/-`,
        encumbranceFree: leaseTerms.encumbrance_free_required,
        registrationRequired: leaseTerms.registration_required,
        surrenderNotice: `${leaseTerms.surrender_notice_months} months`
      } : null,

      // Area classification
      areaType: areaType,

      // Warnings
      warnings: validation.warnings || []
    };
  }

  /**
   * Calculate total land requirements
   */
  calculateLandRequirements(dtcRequirements, substationRequirements) {
    let total = 0;
    const breakdown = [];

    if (dtcRequirements.needed && dtcRequirements.landRequired) {
      total += dtcRequirements.landRequired;
      breakdown.push({
        type: 'DTC',
        count: dtcRequirements.dtcCount,
        landPerUnit: dtcRequirements.landRequired / dtcRequirements.dtcCount,
        totalLand: dtcRequirements.landRequired
      });
    }

    if (substationRequirements.needed && substationRequirements.landRequired) {
      total += substationRequirements.landRequired;
      breakdown.push({
        type: 'Substation',
        substationType: substationRequirements.substationType,
        totalLand: substationRequirements.landRequired
      });
    }

    return {
      total: parseFloat(total.toFixed(2)),
      breakdown: breakdown,
      unit: 'sq.m'
    };
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

      // Get factors from database
      const factors = this.getFactor('RESIDENTIAL', 'FLAT', 'Residential Flat Load');
      const wattPerSqm = factors.wattPerSqm;
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
        // Demand factors from database
        mdf: factors.mdf,
        edf: factors.edf,
        fdf: factors.fdf
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
    const gfLobbyFactors = this.getFactor('LIGHTING', 'LOBBY', 'GF Entrance Lobby');
    const gfLobby = {
      description: 'GF Entrance Lobby',
      areaSqm: inputs.gfEntranceLobby || 100,
      wattPerSqm: gfLobbyFactors.wattPerSqm,
      nos: 1,
      tcl: 0,
      mdf: gfLobbyFactors.mdf,
      edf: gfLobbyFactors.edf,
      fdf: gfLobbyFactors.fdf
    };
    gfLobby.tcl = (gfLobby.wattPerSqm * gfLobby.areaSqm) / 1000;
    items.push(gfLobby);

    // Typical Floor Lobby
    const typicalLobbyFactors = this.getFactor('LIGHTING', 'LOBBY', 'Typical Floor Lobby');
    const typicalLobby = {
      description: 'Typical Floor Lobby',
      areaSqm: inputs.typicalFloorLobby || 30,
      wattPerSqm: typicalLobbyFactors.wattPerSqm,
      nos: inputs.numberOfFloors || 38,
      tcl: 0,
      mdf: typicalLobbyFactors.mdf,
      edf: typicalLobbyFactors.edf,
      fdf: typicalLobbyFactors.fdf
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
