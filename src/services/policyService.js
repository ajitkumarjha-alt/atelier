/**
 * Policy Data Service
 * Helper functions to fetch policy data from the database via API
 * Replaces hardcoded WATER_RATES and OCCUPANCY_FACTORS constants
 */

import { apiFetch } from '../lib/api';

// Cache for policy data to avoid repeated API calls
let policyCache = {
  defaultPolicyId: null,
  waterRates: null,
  occupancyFactors: null,
  calcParams: null,
  timestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the policy cache (useful after policy updates)
 */
export const clearPolicyCache = () => {
  policyCache = {
    defaultPolicyId: null,
    waterRates: null,
    occupancyFactors: null,
    calcParams: null,
    timestamp: null
  };
};

/**
 * Get the default active policy version
 */
export const getDefaultPolicy = async () => {
  try {
    const userEmail = localStorage.getItem('userEmail');
    const response = await apiFetch('/api/policy-versions?is_default=true&status=active', {
      headers: { 'x-dev-user-email': userEmail }
    });
    const policies = await response.json();
    
    if (policies.length === 0) {
      throw new Error('No active default policy found');
    }
    
    return policies[0];
  } catch (error) {
    console.error('Error fetching default policy:', error);
    throw error;
  }
};

/**
 * Get full policy data including all rates, factors, and parameters
 */
export const getPolicyData = async (policyId = null) => {
  try {
    // Use cached data if available and recent
    if (policyCache.waterRates && policyCache.timestamp && 
        (Date.now() - policyCache.timestamp < CACHE_DURATION)) {
      if (!policyId || policyId === policyCache.defaultPolicyId) {
        return {
          policyId: policyCache.defaultPolicyId,
          waterRates: policyCache.waterRates,
          occupancyFactors: policyCache.occupancyFactors,
          calcParams: policyCache.calcParams
        };
      }
    }
    
    // If no policyId provided, get the default active policy
    if (!policyId) {
      const defaultPolicy = await getDefaultPolicy();
      policyId = defaultPolicy.id;
    }
    
    // Fetch policy data
    const userEmail = localStorage.getItem('userEmail');
    const response = await apiFetch(`/api/policy-versions/${policyId}`, {
      headers: { 'x-dev-user-email': userEmail }
    });
    const policyData = await response.json();
    
    // Cache the data
    policyCache = {
      defaultPolicyId: policyId,
      waterRates: policyData.water_rates || [],
      occupancyFactors: policyData.occupancy_factors || [],
      calcParams: policyData.calculation_parameters || [],
      timestamp: Date.now()
    };
    
    return {
      policyId,
      waterRates: policyCache.waterRates,
      occupancyFactors: policyCache.occupancyFactors,
      calcParams: policyCache.calcParams
    };
  } catch (error) {
    console.error('Error fetching policy data:', error);
    throw error;
  }
};

/**
 * Transform water rates array into nested object structure
 * Returns object like: { residential: { luxury: { drinking: 165, flushValves: 75, ... } } }
 */
export const formatWaterRates = (waterRatesArray) => {
  const formatted = {};
  
  waterRatesArray.forEach(rate => {
    if (!formatted[rate.project_type]) {
      formatted[rate.project_type] = {};
    }
    
    if (rate.sub_type) {
      if (!formatted[rate.project_type][rate.sub_type]) {
        formatted[rate.project_type][rate.sub_type] = {};
      }
      formatted[rate.project_type][rate.sub_type][rate.usage_category] = parseFloat(rate.rate_value);
    } else {
      // For types without sub_type (like multiplex, school)
      if (!formatted[rate.project_type]['standard']) {
        formatted[rate.project_type]['standard'] = {};
      }
      formatted[rate.project_type]['standard'][rate.usage_category] = parseFloat(rate.rate_value);
    }
  });
  
  return formatted;
};

/**
 * Transform occupancy factors array into nested object structure
 * Returns object like: { residential: { '2BHK': { luxury: 5, hiEnd: 5, ... } }, office: { excelus: 7.0, ... } }
 */
export const formatOccupancyFactors = (occupancyArray) => {
  const formatted = {};
  
  occupancyArray.forEach(factor => {
    if (!formatted[factor.project_type]) {
      formatted[factor.project_type] = {};
    }
    
    if (factor.factor_type === 'occupants_per_unit') {
      // Residential: by unit type and sub type
      if (!formatted[factor.project_type][factor.unit_type]) {
        formatted[factor.project_type][factor.unit_type] = {};
      }
      formatted[factor.project_type][factor.unit_type][factor.sub_type] = parseFloat(factor.factor_value);
    } else if (factor.factor_type === 'sqm_per_person' || factor.factor_type === 'sqm_per_fulltime') {
      // Office/Retail: sqm per person
      formatted[factor.project_type][factor.sub_type] = parseFloat(factor.factor_value);
    } else if (factor.factor_type === 'visitor_sqm') {
      // Retail: visitor factor
      if (!formatted[factor.project_type][factor.sub_type + '_visitor']) {
        formatted[factor.project_type][factor.sub_type + '_visitor'] = {};
      }
      formatted[factor.project_type][factor.sub_type + '_visitor'] = parseFloat(factor.factor_value);
    } else if (factor.factor_type === 'peak_factor') {
      // Office: peak occupancy factor
      if (!formatted[factor.project_type][factor.sub_type + '_peak']) {
        formatted[factor.project_type][factor.sub_type + '_peak'] = {};
      }
      formatted[factor.project_type][factor.sub_type + '_peak'] = parseFloat(factor.factor_value);
    }
  });
  
  return formatted;
};

/**
 * Transform calculation parameters array into simple key-value object
 * Returns object like: { pool_evaporation_rate: 8, landscape_water_rate: 5, ... }
 */
export const formatCalcParameters = (paramsArray) => {
  const formatted = {};
  
  paramsArray.forEach(param => {
    formatted[param.parameter_name] = parseFloat(param.parameter_value);
  });
  
  return formatted;
};

/**
 * Get water rate for a specific project type and usage
 * Example: getWaterRate('residential', 'luxury', 'drinking') => 165
 */
export const getWaterRate = async (projectType, subType, usageCategory, policyId = null) => {
  try {
    const { waterRates } = await getPolicyData(policyId);
    const formatted = formatWaterRates(waterRates);
    
    const subTypeKey = subType || 'standard';
    return formatted[projectType]?.[subTypeKey]?.[usageCategory] || 0;
  } catch (error) {
    console.error('Error getting water rate:', error);
    return 0;
  }
};

/**
 * Get occupancy factor for a specific configuration
 * Example: getOccupancyFactor('residential', 'luxury', '2BHK') => 5
 */
export const getOccupancyFactor = async (projectType, subType, unitType = null, policyId = null) => {
  try {
    const { occupancyFactors } = await getPolicyData(policyId);
    const formatted = formatOccupancyFactors(occupancyFactors);
    
    if (unitType) {
      // Residential: get by unit type
      return formatted[projectType]?.[unitType]?.[subType] || 0;
    } else {
      // Office/Retail: get sqm per person
      return formatted[projectType]?.[subType] || 0;
    }
  } catch (error) {
    console.error('Error getting occupancy factor:', error);
    return 0;
  }
};

/**
 * Get calculation parameter value
 * Example: getCalcParameter('pool_evaporation_rate') => 8
 */
export const getCalcParameter = async (parameterName, policyId = null) => {
  try {
    const { calcParams } = await getPolicyData(policyId);
    const formatted = formatCalcParameters(calcParams);
    return formatted[parameterName] || 0;
  } catch (error) {
    console.error('Error getting calculation parameter:', error);
    return 0;
  }
};

/**
 * Get all policy data in the old format (for backward compatibility)
 * Returns: { WATER_RATES: {...}, OCCUPANCY_FACTORS: {...}, CALC_PARAMS: {...} }
 */
export const getPolicyDataLegacyFormat = async (policyId = null) => {
  try {
    const { waterRates, occupancyFactors, calcParams } = await getPolicyData(policyId);
    
    return {
      WATER_RATES: formatWaterRates(waterRates),
      OCCUPANCY_FACTORS: formatOccupancyFactors(occupancyFactors),
      CALC_PARAMS: formatCalcParameters(calcParams)
    };
  } catch (error) {
    console.error('Error getting policy data in legacy format:', error);
    return {
      WATER_RATES: {},
      OCCUPANCY_FACTORS: {},
      CALC_PARAMS: {}
    };
  }
};
