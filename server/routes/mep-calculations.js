/**
 * MEP Calculations Router
 * 
 * Unified CRUD API for all MEP calculation types.
 * Each calculator type uses a shared mep_calculations table with JSONB storage.
 */
import express from 'express';
import HVACLoadCalculator from '../services/hvacLoadService.js';
import FirePumpCalculator from '../services/firePumpService.js';
import CableSelectionCalculator from '../services/cableSelectionService.js';
import LightingDesignCalculator from '../services/lightingDesignService.js';
import EarthingLightningCalculator from '../services/earthingLightningService.js';
import PHEPumpCalculator from '../services/phePumpService.js';
import PlumbingFixtureCalculator from '../services/plumbingFixtureService.js';
import VentilationPressurizationCalculator from '../services/ventilationPressurizationService.js';
import DuctSizingCalculator from '../services/ductSizingService.js';
import PanelScheduleCalculator from '../services/panelScheduleService.js';
import RisingMainCalculator from '../services/risingMainService.js';
import FireFightingSystemCalculator from '../services/fireFightingService.js';

// Map of calculator type → service class
const CALCULATOR_MAP = {
  hvac_load: HVACLoadCalculator,
  fire_pump: FirePumpCalculator,
  cable_selection: CableSelectionCalculator,
  lighting_design: LightingDesignCalculator,
  earthing_lightning: EarthingLightningCalculator,
  phe_pump: PHEPumpCalculator,
  plumbing_fixture: PlumbingFixtureCalculator,
  ventilation: VentilationPressurizationCalculator,
  duct_sizing: DuctSizingCalculator,
  panel_schedule: PanelScheduleCalculator,
  rising_main: RisingMainCalculator,
  fire_fighting: FireFightingSystemCalculator,
};

export default function createMepCalculationsRouter(queryFn, verifyToken) {
  const router = express.Router();

  /**
   * POST /api/mep-calculations/preview
   * Run calculation engine without saving — returns results for user review
   */
  router.post('/preview', verifyToken, async (req, res) => {
    try {
      const { calculationType, inputParameters } = req.body;

      if (!calculationType || !inputParameters) {
        return res.status(400).json({
          error: 'Missing required fields: calculationType, inputParameters'
        });
      }

      const CalculatorClass = CALCULATOR_MAP[calculationType];
      if (!CalculatorClass) {
        return res.status(400).json({
          error: `Unknown calculation type: ${calculationType}. Valid types: ${Object.keys(CALCULATOR_MAP).join(', ')}`
        });
      }

      const calculator = new CalculatorClass({ query: queryFn });
      const results = await calculator.calculate(inputParameters);
      const summary = extractSummary(calculationType, results);

      res.json({ results, summary });
    } catch (error) {
      console.error('Error previewing MEP calculation:', error);
      res.status(500).json({ error: error.message || 'Calculation failed' });
    }
  });

  /**
   * POST /api/mep-calculations
   * Save a calculation (after user has previewed results)
   */
  router.post('/', verifyToken, async (req, res) => {
    try {
      const {
        projectId,
        calculationType,
        calculationName,
        inputParameters,
        selectedBuildings,
        buildingId,
        status,
        remarks,
      } = req.body;

      if (!projectId || !calculationType || !calculationName || !inputParameters) {
        return res.status(400).json({ 
          error: 'Missing required fields: projectId, calculationType, calculationName, inputParameters' 
        });
      }

      const CalculatorClass = CALCULATOR_MAP[calculationType];
      if (!CalculatorClass) {
        return res.status(400).json({ 
          error: `Unknown calculation type: ${calculationType}. Valid types: ${Object.keys(CALCULATOR_MAP).join(', ')}` 
        });
      }

      // Instantiate calculator and run calculation
      const calculator = new CalculatorClass({ query: queryFn });
      const results = await calculator.calculate(inputParameters);

      // Extract key summary values for dashboard display
      const summary = extractSummary(calculationType, results);

      // Save to database
      const result = await queryFn(
        `INSERT INTO mep_calculations (
          project_id, calculation_type, calculation_name,
          input_parameters, results, selected_buildings, building_id,
          summary, status, calculated_by, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          projectId,
          calculationType,
          calculationName,
          JSON.stringify(inputParameters),
          JSON.stringify(results),
          selectedBuildings ? JSON.stringify(selectedBuildings) : null,
          buildingId || null,
          JSON.stringify(summary),
          status || 'Draft',
          req.user.email,
          remarks || null,
          req.user.email,
        ]
      );

      const saved = result.rows[0];
      res.status(201).json({
        ...saved,
        input_parameters: inputParameters,
        results,
        summary,
      });
    } catch (error) {
      console.error(`Error creating MEP calculation:`, error);
      res.status(500).json({ error: error.message || 'Failed to create calculation' });
    }
  });

  /**
   * GET /api/mep-calculations
   * List calculations for a project, optionally filtered by type
   */
  router.get('/', verifyToken, async (req, res) => {
    try {
      const { projectId, calculationType } = req.query;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      let sql = `SELECT id, project_id, calculation_type, calculation_name, summary, 
                  status, calculated_by, verified_by, remarks, version,
                  created_at, updated_at
                 FROM mep_calculations WHERE project_id = $1`;
      const params = [projectId];

      if (calculationType) {
        sql += ` AND calculation_type = $2`;
        params.push(calculationType);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await queryFn(sql, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error listing MEP calculations:', error);
      res.status(500).json({ error: 'Failed to list calculations' });
    }
  });

  /**
   * GET /api/mep-calculations/:id
   * Get a single calculation with full results
   */
  router.get('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const calcId = parseInt(id, 10);
      if (Number.isNaN(calcId)) {
        return res.status(400).json({ error: 'Invalid calculation id' });
      }

      const result = await queryFn(
        'SELECT * FROM mep_calculations WHERE id = $1',
        [calcId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Calculation not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching MEP calculation:', error);
      res.status(500).json({ error: 'Failed to fetch calculation' });
    }
  });

  /**
   * PUT /api/mep-calculations/:id
   * Update a calculation (recalculate if inputParameters changed)
   */
  router.put('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const calcId = parseInt(id, 10);
      if (Number.isNaN(calcId)) {
        return res.status(400).json({ error: 'Invalid calculation id' });
      }

      const existing = await queryFn(
        'SELECT * FROM mep_calculations WHERE id = $1',
        [calcId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Calculation not found' });
      }

      const {
        calculationName,
        inputParameters,
        selectedBuildings,
        status,
        remarks,
        verifiedBy,
      } = req.body;

      const calc = existing.rows[0];
      let results = calc.results;
      let summary = calc.summary;

      // Recalculate if inputs changed
      if (inputParameters) {
        const CalculatorClass = CALCULATOR_MAP[calc.calculation_type];
        if (CalculatorClass) {
          const calculator = new CalculatorClass({ query: queryFn });
          results = await calculator.calculate(inputParameters);
          summary = extractSummary(calc.calculation_type, results);
        }
      }

      const updateResult = await queryFn(
        `UPDATE mep_calculations SET
          calculation_name = COALESCE($1, calculation_name),
          input_parameters = COALESCE($2, input_parameters),
          results = $3,
          summary = $4,
          selected_buildings = COALESCE($5, selected_buildings),
          status = COALESCE($6, status),
          remarks = COALESCE($7, remarks),
          verified_by = COALESCE($8, verified_by),
          version = version + 1,
          updated_by = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *`,
        [
          calculationName || null,
          inputParameters ? JSON.stringify(inputParameters) : null,
          JSON.stringify(results),
          JSON.stringify(summary),
          selectedBuildings ? JSON.stringify(selectedBuildings) : null,
          status || null,
          remarks !== undefined ? remarks : null,
          verifiedBy || null,
          req.user.email,
          calcId,
        ]
      );

      res.json(updateResult.rows[0]);
    } catch (error) {
      console.error('Error updating MEP calculation:', error);
      res.status(500).json({ error: error.message || 'Failed to update calculation' });
    }
  });

  /**
   * DELETE /api/mep-calculations/:id
   */
  router.delete('/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const calcId = parseInt(id, 10);
      if (Number.isNaN(calcId)) {
        return res.status(400).json({ error: 'Invalid calculation id' });
      }

      const existing = await queryFn(
        'SELECT * FROM mep_calculations WHERE id = $1',
        [calcId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Calculation not found' });
      }

      await queryFn('DELETE FROM mep_calculations WHERE id = $1', [calcId]);
      res.json({ message: 'Calculation deleted successfully' });
    } catch (error) {
      console.error('Error deleting MEP calculation:', error);
      res.status(500).json({ error: 'Failed to delete calculation' });
    }
  });

  return router;
}

/**
 * Extract key summary values from results for dashboard display
 */
function extractSummary(calculationType, results) {
  switch (calculationType) {
    case 'hvac_load':
      return {
        totalCoolingTR: results.summary?.totalCoolingTR,
        chillerCapacityTR: results.summary?.chillerCapacityTR,
        totalPowerKW: results.summary?.totalPowerKW,
      };
    case 'fire_pump':
      return {
        flowM3h: results.hydrantSystem?.pumpFlowM3h,
        headM: results.hydrantSystem?.pumpHeadM,
        pumpPowerKW: results.totalElectricalLoad?.totalKW,
      };
    case 'cable_selection':
      return {
        selectedCable: results.selectedCable?.size,
        currentA: results.loadCurrent?.fullLoadCurrentA,
        voltageDropPercent: results.voltageDrop?.percent,
      };
    case 'lighting_design':
      return {
        totalLuminaires: results.summary?.totalLuminaires,
        totalWattage: results.summary?.totalWattage,
        avgLPD: results.summary?.avgLPD,
      };
    case 'earthing_lightning':
      return {
        earthResistance: results.earthingDesign?.achievedResistance,
        lpLevel: results.riskAssessment?.protectionLevel,
        electrodeCount: results.earthingDesign?.totalElectrodes,
      };
    case 'phe_pump':
      return {
        flowM3h: results.pumpSelection?.flowM3h,
        headM: results.pumpSelection?.headM,
        motorKW: results.pumpSelection?.motorKW,
      };
    case 'plumbing_fixture':
      return {
        totalFixtureUnits: results.summary?.totalFixtureUnits,
        peakFlowLPS: results.summary?.peakFlowLPS,
        riserSize: results.riserSizing?.[0]?.diameter,
      };
    case 'ventilation':
      return {
        totalSupplyCFM: results.summary?.totalSupplyCFM,
        totalExhaustCFM: results.summary?.totalExhaustCFM,
        totalFanPowerKW: results.summary?.totalFanPowerKW,
      };
    case 'duct_sizing':
      return {
        fanStaticPa: results.summary?.fanStaticPa,
        maxVelocity: results.summary?.maxVelocityMs,
        totalLength: results.summary?.totalDuctLength,
      };
    case 'panel_schedule':
      return {
        totalLoadKW: results.loadSummary?.totalConnectedLoadKW,
        diversifiedKW: results.loadSummary?.diversifiedLoadKW,
        incomingDevice: `${results.incomingDevice?.device} ${results.incomingDevice?.ratingA}A`,
      };
    case 'rising_main':
      return {
        riserSize: results.riserSizing?.selectedSize,
        maxCurrentA: results.summary?.maxCurrentA,
        maxVdropPercent: results.summary?.maxVoltageDropPercent,
      };
    case 'fire_fighting':
      return {
        systems: results.summary?.systemsProvided,
        waterStorageM3: results.summary?.totalWaterStorageM3,
        pumpPowerKW: results.summary?.totalPumpPowerKW,
      };
    default:
      return {};
  }
}
