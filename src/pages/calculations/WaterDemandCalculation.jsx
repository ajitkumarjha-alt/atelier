import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Droplets, CheckCircle, AlertCircle, Save, Calculator, Trash2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';
import { useUser } from '../../lib/UserContext';
import { getPolicyDataLegacyFormat, getDefaultPolicy } from '../../services/policyService';

// Legacy to new residential type mapping
const RESIDENTIAL_TYPE_MAPPING = {
  'Premium': 'luxury',    // Old Premium → Luxury
  'Aspi': 'aspirational', // Old Aspi → Aspirational
  'Villa': 'luxury'       // Old Villa → Luxury
};

// Fallback rates (used only if policy system is unavailable)
const FALLBACK_WATER_RATES = {
  'Clubhouse': 70, // per person
  'MLCP': 10, // per parking space
  'Commercial': 45, // per person
  'Institute': 45, // per person
  'Industrial': 45, // per person
  'Hospital': 340, // per bed
  'Hospitality': 180, // per room
  'Data center': 5 // per sqft
};

// Fallback occupancy rates
const FALLBACK_OCCUPANCY_RATES = {
  '1BHK': 2,
  '1.5BHK': 2,
  '2BHK': 3,
  '2.5BHK': 4,
  '3BHK': 4,
  '4BHK': 5,
  'Studio': 1
};

export default function WaterDemandCalculation() {
  const { projectId, calculationId } = useParams();
  const navigate = useNavigate();
  const { userLevel } = useUser();
  
  const [project, setProject] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [calculationResults, setCalculationResults] = useState([]);
  const [totalWaterDemand, setTotalWaterDemand] = useState(0);
  const [calculationName, setCalculationName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('Draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [showCalculations, setShowCalculations] = useState(false);
  
  // Policy data
  const [policyData, setPolicyData] = useState(null);
  const [WATER_RATES, setWATER_RATES] = useState({});
  const [OCCUPANCY_FACTORS, setOCCUPANCY_FACTORS] = useState({});
  
  // Storage tank factors (in days)
  const [ohtDomesticDays, setOhtDomesticDays] = useState(1.0);
  const [ohtFlushingDays, setOhtFlushingDays] = useState(0.5);
  const [ugrDomesticDays, setUgrDomesticDays] = useState(1.5);
  const [ugrFlushingDays, setUgrFlushingDays] = useState(0.5);
  
  // Tank depths (in meters)
  const [ohtDepth, setOhtDepth] = useState(2.0); // Default OHT depth
  const [ugrDepth, setUgrDepth] = useState(3.0); // Default UGR depth

  useEffect(() => {
    fetchProjectAndBuildings();
    fetchPolicyData();
  }, [projectId]);

  useEffect(() => {
    if (calculationId && calculationId !== 'new') {
      fetchExistingCalculation();
    }
  }, [calculationId]);

  const fetchPolicyData = async () => {
    try {
      const data = await getPolicyDataLegacyFormat();
      setWATER_RATES(data.WATER_RATES);
      setOCCUPANCY_FACTORS(data.OCCUPANCY_FACTORS);
      const policy = await getDefaultPolicy();
      setPolicyData(policy);
    } catch (err) {
      console.error('Error loading policy data:', err);
      // Continue with fallback values
    }
  };

  const fetchProjectAndBuildings = async () => {
    try {
      setLoading(true);
      

      // Fetch project details (with societies and buildings)
      const projectResponse = await apiFetch(`/api/projects/${projectId}/full`);
      if (!projectResponse.ok) throw new Error('Failed to fetch project');
      const projectData = await projectResponse.json();
      setProject(projectData);
      // Use buildings from the full project response
      setBuildings(projectData.buildings || []);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingCalculation = async () => {
    try {
      const response = await apiFetch(`/api/water-demand-calculations/${calculationId}`);
      
      if (!response.ok) throw new Error('Failed to fetch calculation');
      const data = await response.json();
      
      setCalculationName(data.calculation_name);
      const details = typeof data.calculation_details === 'string' 
        ? JSON.parse(data.calculation_details) 
        : data.calculation_details;
      
      setSelectedBuildings(data.selected_buildings || details.selectedBuildings || []);
      setCalculationResults(details.results || []);
      setTotalWaterDemand(details.totalWaterDemand || data.total_water_demand || 0);
      setStatus(data.status);
      setRemarks(data.remarks || '');
      
      // Load storage configuration if exists
      if (details.storageConfig) {
        setOhtDomesticDays(details.storageConfig.ohtDomesticDays || 1.0);
        setOhtFlushingDays(details.storageConfig.ohtFlushingDays || 0.5);
        setUgrDomesticDays(details.storageConfig.ugrDomesticDays || 1.5);
        setUgrFlushingDays(details.storageConfig.ugrFlushingDays || 0.5);
      }
      
      setShowCalculations(true);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching calculation:', err);
    }
  };

  const toggleBuildingSelection = (buildingId) => {
    setSelectedBuildings(prev => {
      if (prev.includes(buildingId)) {
        return prev.filter(id => id !== buildingId);
      } else {
        return [...prev, buildingId];
      }
    });
  };

  const calculateWaterDemand = () => {
    const results = [];
    let totalDemand = 0;

    selectedBuildings.forEach(buildingId => {
      const building = buildings.find(b => b.id === buildingId);
      if (!building) return;

      const buildingResult = {
        buildingId: building.id,
        buildingName: building.name,
        applicationType: building.application_type,
        residentialType: building.residential_type,
        flatTypeSummary: [], // Group by flat type across all floors
        totalOccupancy: 0,
        totalWaterDemand: 0,
        totalDomestic: 0,
        totalFlushing: 0,
        lpcd: 0
      };

      if (building.application_type === 'Residential') {
        // Group flats by type across all floors
        const flatTypeMap = {};
        
        building.floors?.forEach(floor => {
          floor.flats?.forEach(flat => {
            if (!flatTypeMap[flat.flat_type]) {
              // Map legacy residential types
              let resTypeForLookup = building.residential_type || 'luxury';
              if (RESIDENTIAL_TYPE_MAPPING[resTypeForLookup]) {
                resTypeForLookup = RESIDENTIAL_TYPE_MAPPING[resTypeForLookup];
              }
              
              // Get occupancy from policy or fallback
              const occupancy = OCCUPANCY_FACTORS?.residential?.[flat.flat_type]?.[resTypeForLookup]
                             || OCCUPANCY_FACTORS?.residential?.[flat.flat_type]?.[building.residential_type]
                             || FALLBACK_OCCUPANCY_RATES[flat.flat_type] 
                             || 3;
              
              flatTypeMap[flat.flat_type] = {
                flatType: flat.flat_type,
                totalUnits: 0,
                unitPopulation: occupancy,
                totalPopulation: 0
              };
            }
            flatTypeMap[flat.flat_type].totalUnits += (flat.number_of_flats || 1);
          });
        });

        // Calculate water demand for each flat type using policy-specific rates
        let totalOccupancy = 0;
        
        // Get specific drinking and flushing rates from policy
        // Map legacy types to new types if needed
        let resType = building.residential_type || 'luxury';
        if (RESIDENTIAL_TYPE_MAPPING[resType]) {
          resType = RESIDENTIAL_TYPE_MAPPING[resType];
        }
        
        // If still no match, try the original type (might be in policy as legacy type)
        const rates = WATER_RATES?.residential?.[resType] 
                   || WATER_RATES?.residential?.[building.residential_type]
                   || {};
        
        // For drinking water
        const perPersonDrinking = rates.drinking || 165;
        
        // For flushing - check if building has flush system preference
        // Default to flush valves for luxury/hiEnd, standard flushing for others
        let perPersonFlushing;
        if (resType === 'luxury' || resType === 'hiEnd') {
          // Prefer flush tanks if available, otherwise valves
          perPersonFlushing = rates.flushTanks || rates.flushValves || 75;
        } else {
          perPersonFlushing = rates.flushing || 60;
        }
        
        const perPersonTotal = perPersonDrinking + perPersonFlushing;
        buildingResult.lpcd = perPersonTotal;
        
        Object.values(flatTypeMap).forEach(flatData => {
          flatData.totalPopulation = flatData.totalUnits * flatData.unitPopulation;
          flatData.perPersonWaterDemand = perPersonTotal;
          flatData.perPersonDomestic = perPersonDrinking;
          flatData.perPersonFlushing = perPersonFlushing;
          flatData.totalWaterDemand = Math.ceil(flatData.totalPopulation * perPersonTotal);
          flatData.totalDomestic = Math.ceil(flatData.totalPopulation * perPersonDrinking);
          flatData.totalFlushing = Math.ceil(flatData.totalPopulation * perPersonFlushing);
          
          totalOccupancy += flatData.totalPopulation;
          buildingResult.totalWaterDemand += flatData.totalWaterDemand;
          buildingResult.totalDomestic += flatData.totalDomestic;
          buildingResult.totalFlushing += flatData.totalFlushing;
          
          buildingResult.flatTypeSummary.push(flatData);
        });
        
        buildingResult.totalOccupancy = totalOccupancy;
        buildingResult.waterDemandPerDay = buildingResult.totalWaterDemand;
        
      } else if (building.application_type === 'Villa') {
        // Calculate for villas using luxury residential rates
        const villaCount = building.villa_count || 1;
        const occupancyPerVilla = OCCUPANCY_FACTORS?.residential?.['3BHK']?.luxury 
                                || FALLBACK_OCCUPANCY_RATES['3BHK'] 
                                || 5;
        const totalOccupancy = villaCount * occupancyPerVilla;
        
        // Use luxury rates for villas
        const rates = WATER_RATES?.residential?.luxury || {};
        const perPersonDrinking = rates.drinking || 165;
        const perPersonFlushing = rates.flushValves || 75;
        const villaLPCD = perPersonDrinking + perPersonFlushing;
        
        buildingResult.totalOccupancy = totalOccupancy;
        buildingResult.villaCount = villaCount;
        buildingResult.occupancyPerVilla = occupancyPerVilla;
        buildingResult.lpcd = villaLPCD;
        buildingResult.totalWaterDemand = Math.ceil(totalOccupancy * villaLPCD);
        buildingResult.totalDomestic = Math.ceil(totalOccupancy * perPersonDrinking);
        buildingResult.totalFlushing = Math.ceil(totalOccupancy * perPersonFlushing);
        buildingResult.waterDemandPerDay = buildingResult.totalWaterDemand;
        
      } else {
        // Non-residential buildings - use fallback rates or 70/30 split
        const rate = FALLBACK_WATER_RATES[building.application_type] || 50;
        let capacity = 100;
        
        if (building.application_type === 'MLCP') {
          capacity = (building.floors?.length || 1) * 50;
        } else if (building.application_type === 'Clubhouse') {
          capacity = 200;
        } else if (building.application_type === 'Commercial') {
          capacity = (building.floors?.length || 1) * 100;
        }
        
        buildingResult.capacity = capacity;
        buildingResult.ratePerUnit = rate;
        buildingResult.totalWaterDemand = Math.ceil(capacity * rate);
        // For non-residential without specific policy rates, use 70/30 approximation
        buildingResult.totalDomestic = Math.ceil(buildingResult.totalWaterDemand * 0.70);
        buildingResult.totalFlushing = Math.ceil(buildingResult.totalWaterDemand * 0.30);
        buildingResult.waterDemandPerDay = buildingResult.totalWaterDemand;
      }

      totalDemand += buildingResult.waterDemandPerDay;
      results.push(buildingResult);
    });

    setCalculationResults(results);
    setTotalWaterDemand(totalDemand);
    setShowCalculations(true);
  };

  const handleSave = async () => {
    if (!calculationName.trim()) {
      alert('Please enter a calculation name');
      return;
    }

    if (selectedBuildings.length === 0) {
      alert('Please select at least one building');
      return;
    }

    if (!showCalculations || calculationResults.length === 0) {
      alert('Please calculate water demand before saving');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        projectId: parseInt(projectId),
        calculationName,
        selectedBuildings,
        calculationDetails: {
          results: calculationResults,
          totalWaterDemand,
          storageConfig: {
            ohtDomesticDays,
            ohtFlushingDays,
            ugrDomesticDays,
            ugrFlushingDays
          }
        },
        totalWaterDemand,
        status,
        remarks
      };

      let response;
      if (calculationId && calculationId !== 'new') {
        // Update existing calculation
        response = await apiFetch(`/api/water-demand-calculations/${calculationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new calculation
        response = await apiFetch('/api/water-demand-calculations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to save calculation');
      }
      
      const savedData = await response.json();
      alert('Calculation saved successfully!');
      
      // Navigate back to design calculations
      navigate(`/design-calculations/${projectId}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message);
      alert('Failed to save calculation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!calculationId || calculationId === 'new') {
      alert('Cannot delete a calculation that hasn\'t been saved yet');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the calculation "${calculationName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      
      const response = await apiFetch(`/api/water-demand-calculations/${calculationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete calculation');
      
      alert('Calculation deleted successfully!');
      navigate(`/project/${projectId}`);
    } catch (err) {
      setError(err.message);
      alert('Failed to delete calculation: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/design-calculations/${projectId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Water Demand Calculation</h1>
              <p className="text-sm text-gray-500 mt-1">
                {project?.name} - {calculationId === 'new' ? 'New Calculation' : `Calculation ID: ${calculationId}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Delete button - only for L0, L1, L2 and existing calculations */}
            {calculationId && calculationId !== 'new' && ['SUPER_ADMIN', 'L0', 'L1', 'L2'].includes(userLevel) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Calculation Name and Status */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation Name *
              </label>
              <input
                type="text"
                value={calculationName}
                onChange={(e) => setCalculationName(e.target.value)}
                placeholder="e.g., Water Demand - Phase 1 Residential"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Revised">Revised</option>
              </select>
            </div>
          </div>
        </div>

        {/* Building Selection */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Select Buildings</h2>
          
          {buildings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No buildings found for this project.</p>
              <p className="text-sm mt-2">Please add buildings to the project first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {buildings.map(building => (
                <div
                  key={building.id}
                  onClick={() => toggleBuildingSelection(building.id)}
                  className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedBuildings.includes(building.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{building.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{building.application_type}</p>
                      {building.residential_type && (
                        <p className="text-xs text-gray-500">{building.residential_type}</p>
                      )}
                      {building.villa_count && (
                        <p className="text-xs text-gray-500">{building.villa_count} villas</p>
                      )}
                      {building.floors && (
                        <p className="text-xs text-gray-500 mt-1">{building.floors.length} floors</p>
                      )}
                    </div>
                    {selectedBuildings.includes(building.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={calculateWaterDemand}
              disabled={selectedBuildings.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Calculate Water Demand</span>
            </button>
          </div>
        </div>

        {/* Calculation Results */}
        {showCalculations && calculationResults.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-visible">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Calculation Results</h2>
            
            <div className="space-y-4 sm:space-y-6 overflow-visible">
              {calculationResults.map((result, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4 overflow-visible">
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">{result.buildingName}</h3>
                      <p className="text-sm text-gray-600">{result.applicationType}</p>
                      {result.residentialType && (
                        <p className="text-xs text-gray-500">{result.residentialType}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg sm:text-2xl font-bold text-blue-600">
                        {result.waterDemandPerDay.toLocaleString()} L/day
                      </div>
                      <div className="text-xs text-gray-500">
                        {(result.waterDemandPerDay / 1000).toFixed(2)} KL/day
                      </div>
                    </div>
                  </div>

                  {/* Residential Building Details */}
                  {result.applicationType === 'Residential' && result.flatTypeSummary && (
                    <div className="mt-4">
                      <div className="overflow-hidden">
                        <table className="w-full border-collapse border border-gray-200 text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1.5 text-left text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Flat Type</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Units</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Unit Pop</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Total Pop</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Water per person</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Domestic / person</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Flushing / person</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Total water per day</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b border-r">Domestic/day</th>
                              <th className="px-2 py-1.5 text-right text-[10px] sm:text-xs font-semibold text-gray-700 border-b">Flushing / day</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {result.flatTypeSummary.map((flatData, fIdx) => (
                              <tr key={fIdx} className="hover:bg-gray-50">
                                <td className="px-2 py-1.5 text-gray-900 border-b border-r font-medium">{flatData.flatType}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r">{flatData.totalUnits}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r">{flatData.unitPopulation}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r font-semibold">{flatData.totalPopulation}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r">{flatData.perPersonWaterDemand.toFixed(1)}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r">{flatData.perPersonDomestic.toFixed(1)}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900 border-b border-r">{flatData.perPersonFlushing.toFixed(1)}</td>
                                <td className="px-2 py-1.5 text-right text-blue-900 border-b border-r font-semibold">{Math.ceil(flatData.totalWaterDemand).toLocaleString()}</td>
                                <td className="px-2 py-1.5 text-right text-green-900 border-b border-r font-semibold">{Math.ceil(flatData.totalDomestic).toLocaleString()}</td>
                                <td className="px-2 py-1.5 text-right text-orange-900 border-b font-semibold">{Math.ceil(flatData.totalFlushing).toLocaleString()}</td>
                              </tr>
                            ))}
                            {/* Building Total Row */}
                            <tr className="bg-blue-50 font-bold">
                              <td className="px-2 py-1.5 text-gray-900 border-r" colSpan="3">Building Total</td>
                              <td className="px-2 py-1.5 text-right text-gray-900 border-r">{result.totalOccupancy}</td>
                              <td className="px-2 py-1.5 border-r" colSpan="3"></td>
                              <td className="px-2 py-1.5 text-right text-blue-900 border-r">{Math.ceil(result.totalWaterDemand).toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right text-green-900 border-r">{Math.ceil(result.totalDomestic).toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right text-orange-900">{Math.ceil(result.totalFlushing).toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded p-3">
                        <div>
                          <span className="text-gray-600">LPCD Rate:</span>
                          <span className="font-semibold ml-2">{result.lpcd.toFixed(1)} L/person/day</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Drinking:</span>
                          <span className="font-semibold ml-2">{result.flatTypeSummary?.[0]?.perPersonDomestic?.toFixed(1) || 'N/A'} L/person/day</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Flushing:</span>
                          <span className="font-semibold ml-2">{result.flatTypeSummary?.[0]?.perPersonFlushing?.toFixed(1) || 'N/A'} L/person/day</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Villa Details */}
                  {result.applicationType === 'Villa' && (
                    <div className="mt-4 bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Villa Count:</span>
                          <span className="font-semibold ml-2">{result.villaCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Occ/Villa:</span>
                          <span className="font-semibold ml-2">{result.occupancyPerVilla}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Occupancy:</span>
                          <span className="font-semibold ml-2">{result.totalOccupancy} persons</span>
                        </div>
                        <div>
                          <span className="text-gray-600">LPCD:</span>
                          <span className="font-semibold ml-2">{result.lpcd.toFixed(0)} L</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Non-Residential Details */}
                  {result.applicationType !== 'Residential' && result.applicationType !== 'Villa' && (
                    <div className="mt-4 bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Capacity:</span>
                          <span className="font-semibold ml-2">{result.capacity} units</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rate/Unit:</span>
                          <span className="font-semibold ml-2">{result.ratePerUnit} L</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="font-semibold ml-2">{result.applicationType}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Droplets className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Total Water Demand</h3>
                    <p className="text-sm text-gray-600">For {selectedBuildings.length} selected building(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.ceil(totalWaterDemand).toLocaleString()} L/day
                  </div>
                  <div className="text-lg text-gray-700">
                    {(Math.ceil(totalWaterDemand) / 1000).toFixed(2)} KL/day
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ≈ {((Math.ceil(totalWaterDemand) / 1000) * 30).toFixed(2)} KL/month
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Tank Configuration */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Tank Configuration</h2>
              
              {/* Tank Depth Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OHT Depth (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5"
                    value={ohtDepth}
                    onChange={(e) => setOhtDepth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UGR Depth (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={ugrDepth}
                    onChange={(e) => setUgrDepth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    OHT Domestic (days)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ohtDomesticDays}
                    onChange={(e) => setOhtDomesticDays(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    OHT Flushing (days)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ohtFlushingDays}
                    onChange={(e) => setOhtFlushingDays(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    UGR Domestic (days)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ugrDomesticDays}
                    onChange={(e) => setUgrDomesticDays(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    UGR Flushing (days)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ugrFlushingDays}
                    onChange={(e) => setUgrFlushingDays(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Society-wise Storage Calculation */}
              {(() => {
                // Group calculationResults by societyId (or 'no-society')
                const buildingsBySociety = {};

                calculationResults.forEach(result => {
                  const building = buildings.find(b => b.id === result.buildingId);
                  // Always use string for societyId key
                  const sid = String(building?.societyId ?? building?.society_id ?? 'no-society');
                  if (!buildingsBySociety[sid]) buildingsBySociety[sid] = [];
                  buildingsBySociety[sid].push(result);
                });

                // Get societies from project (if available)
                const societies = Array.isArray(project?.societies) ? project.societies : [];

                return Object.entries(buildingsBySociety).map(([societyId, resultsInSociety], idx) => {
                  // Find society name using string comparison
                  const society = societies.find(s => String(s.id) === societyId);
                  // Aggregate UGR for this society
                  const ugrTotal = resultsInSociety.reduce((sum, r) => sum + (r.totalDomestic * ugrDomesticDays) + (r.totalFlushing * ugrFlushingDays), 0);
                  return (
                    <div key={societyId} className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        UGR for {society ? society.name : 'No Society'}
                      </h3>
                      <div className="bg-blue-100 rounded p-4">
                        <div className="text-xs text-gray-700 font-medium mb-1">Total UGR Capacity Required</div>
                        <div className="text-2xl font-bold text-blue-800">
                          {Math.ceil(ugrTotal).toLocaleString()} L
                        </div>
                        <div className="text-lg text-blue-700 mt-1">
                          {(Math.ceil(ugrTotal) / 1000).toFixed(2)} KL
                        </div>
                        {ugrDepth > 0 && (
                          <div className="mt-4 pt-4 border-t border-blue-300">
                            <div className="text-xs text-gray-700 font-medium">Combined Tank Area Required</div>
                            <div className="text-xl font-bold text-blue-900 mt-1">
                              {((Math.ceil(ugrTotal) / 1000) / ugrDepth).toFixed(2)} m²
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                              ({Math.sqrt((Math.ceil(ugrTotal) / 1000) / ugrDepth).toFixed(2)} m × {Math.sqrt((Math.ceil(ugrTotal) / 1000) / ugrDepth).toFixed(2)} m)
                            </div>
                          </div>
                        )}
                      </div>
                      {/* List buildings in this society */}
                      <div className="mt-4">
                        <div className="text-xs text-gray-700 font-medium mb-1">Buildings in this society:</div>
                        <ul className="list-disc list-inside text-sm text-gray-800">
                          {resultsInSociety.map(r => (
                            <li key={r.buildingId}>{r.buildingName}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Remarks */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remarks / Notes
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            placeholder="Add any additional notes or assumptions..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || !showCalculations}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Confirm and Save'}</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
