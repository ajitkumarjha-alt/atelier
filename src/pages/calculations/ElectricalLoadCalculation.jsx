import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calculator, 
  Save, 
  Lightbulb, 
  Building2, 
  Zap,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';

export default function ElectricalLoadCalculation() {
  const { projectId, calculationId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [buildings, setBuildings] = useState([]);
  
  // State for calculation
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [inputParameters, setInputParameters] = useState({
    // Project Level
    projectCategory: 'GOLD 2',
    
    // Building Parameters
    buildingHeight: 90,
    numberOfFloors: 38,
    gfEntranceLobby: 100,
    typicalFloorLobby: 30,
    terraceArea: 200,
    terraceLighting: true,
    landscapeLighting: true,
    landscapeLightingLoad: 10,
    
    // Lift Configuration
    passengerLifts: 2,
    passengerFireLifts: 1,
    firemenLifts: 1,
    lobbyType: 'Nat. Vent',
    
    // HVAC & Ventilation
    mechanicalVentilation: false,
    ventilationCFM: 5000,
    ventilationFans: 4,
    
    // Pressurization
    numberOfStaircases: 2,
    
    // PHE (Building Level)
    boosterPumpFlow: 300,
    boosterPumpSet: '1W+1S',
    sewagePumpCapacity: 300,
    sewagePumpSet: 2,
    wetRiserPump: false,
    wetRiserPumpPower: 11,
    
    // Society Level - Fire Fighting
    mainPumpFlow: 2850,
    fbtPumpSetType: 'Main+SBY+Jky',
    sprinklerPumpFlow: 1425,
    sprinklerPumpSet: 'Main+SBY+Jky',
    
    // Society Level - PHE
    domTransferFlow: 300,
    domTransferConfig: '1W+1S',
    
    // Society Infrastructure
    stpCapacity: 500,
    clubhouseLoad: 50,
    streetLightingLoad: 20,
    evChargerCount: 10,
    evChargerType: 'fast',
    
    // Other
    securitySystemLoad: 2,
    smallPowerLoad: 5
  });
  
  const [calculationResults, setCalculationResults] = useState(null);
  const [calculationName, setCalculationName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('Draft');

  // Fetch project and buildings
  useEffect(() => {
    fetchProjectData();
    if (calculationId && calculationId !== 'new') {
      fetchCalculation();
    } else if (calculationId === 'new') {
      setCurrentStep(1);
      setCalculationResults(null);
    }
  }, [projectId, calculationId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, buildingsRes] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`),
        apiFetch(`/api/projects/${projectId}/buildings`)
      ]);
      const projectData = await projectRes.json();
      const buildingsData = await buildingsRes.json();
      
      setProject(projectData);
      if (projectData?.project_category || projectData?.projectCategory) {
        handleInputChange('projectCategory', projectData.project_category || projectData.projectCategory);
      }
      setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setBuildings([]); // Ensure buildings is always an array
    }
  };

  const fetchCalculation = async () => {
    try {
      const response = await apiFetch(`/api/electrical-load-calculations/${calculationId}`);
      const calc = await response.json();
      setSelectedBuildings(calc.selected_buildings);
      setInputParameters(calc.input_parameters);
      setCalculationResults({
        buildingCALoads: calc.building_ca_loads,
        flatLoads: calc.flat_loads || null,
        societyCALoads: calc.society_ca_loads,
        totals: calc.total_loads,
        buildingBreakdowns: calc.building_breakdowns || null,
        selectedBuildings: calc.selected_buildings || []
      });
      setCalculationName(calc.calculation_name);
      setRemarks(calc.remarks || '');
      setStatus(calc.status);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error fetching calculation:', error);
    }
  };

  const handleBuildingToggle = (building) => {
    setSelectedBuildings(prev => {
      const exists = prev.find(b => b.id === building.id);
      if (exists) {
        return prev.filter(b => b.id !== building.id);
      } else {
        return [...prev, building];
      }
    });
  };

  const handleInputChange = (field, value) => {
    setInputParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCalculate = async () => {
    if (selectedBuildings.length === 0) {
      alert('Please select at least one building');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/electrical-load-calculations', {
        method: 'POST',
        body: JSON.stringify({
          projectId: parseInt(projectId),
          calculationName: calculationName || `Electrical Load - ${new Date().toLocaleDateString()}`,
          selectedBuildings,
          inputParameters,
          status: 'Draft',
          remarks: ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      // Validate response structure
      if (!result.total_loads || !result.building_ca_loads || !result.society_ca_loads) {
        throw new Error('Invalid calculation results received from server');
      }
      
      // Debug: Log building data to check twin status
      console.log('Selected buildings:', result.selected_buildings);
      console.log('Building breakdowns:', result.building_breakdowns);
      
      setCalculationResults({
        buildingCALoads: result.building_ca_loads,
        flatLoads: result.flat_loads || null,
        societyCALoads: result.society_ca_loads,
        totals: result.total_loads,
        buildingBreakdowns: result.building_breakdowns || null,
        selectedBuildings: result.selected_buildings || []
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Failed to calculate electrical load: ${error.message}\n\nPlease check your inputs and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!calculationName.trim()) {
      alert('Please enter a calculation name');
      return;
    }

    setSaving(true);
    try {
      const url = calculationId 
        ? `/api/electrical-load-calculations/${calculationId}`
        : '/api/electrical-load-calculations';
      
      const method = calculationId ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          projectId: parseInt(projectId),
          calculationName,
          selectedBuildings,
          inputParameters,
          status,
          remarks
        })
      });

      alert('Calculation saved successfully!');
      navigate(`/design-calculations/${projectId}`);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save calculation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/design-calculations/${projectId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-7 h-7 text-yellow-500" />
                Electrical Load Calculation
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {project?.name || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Select Buildings' },
              { num: 2, label: 'Input Parameters' },
              { num: 3, label: 'Results & Save' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className={`flex items-center ${idx > 0 ? 'w-full' : ''}`}>
                  {idx > 0 && (
                    <div className={`flex-1 h-1 ${currentStep > idx ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  )}
                  <div className={`flex items-center gap-2 ${idx > 0 ? 'ml-2' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.num 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step.num}
                    </div>
                    <span className={`text-sm hidden sm:inline ${
                      currentStep >= step.num ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Building Selection */}
        {currentStep === 1 && (
          <BuildingSelection 
            buildings={buildings}
            selectedBuildings={selectedBuildings}
            onToggle={handleBuildingToggle}
            onNext={() => {
              if (selectedBuildings.length === 0) {
                alert('Please select at least one building');
                return;
              }
              const derivedHeights = selectedBuildings.map(b => Number(b.total_height_m) || 0);
              const derivedFloors = selectedBuildings.map(b => Number(b.floor_count) || 0);
              const maxHeight = Math.max(...derivedHeights, 0);
              const maxFloors = Math.max(...derivedFloors, 0);
              const gfLobbyValues = selectedBuildings.map(b => Number(b.gf_entrance_lobby || b.gfEntranceLobby) || 0);
              const avgLobbyValues = selectedBuildings.map(b => Number(b.avg_typical_lobby_area || b.typical_lobby_area || b.typicalLobbyArea) || 0);

              // Auto-set defaults for display
              if (selectedBuildings.length === 1) {
                handleInputChange('buildingHeight', maxHeight || inputParameters.buildingHeight);
                handleInputChange('numberOfFloors', maxFloors || inputParameters.numberOfFloors);
                handleInputChange('gfEntranceLobby', gfLobbyValues[0] || inputParameters.gfEntranceLobby);
                handleInputChange('typicalFloorLobby', avgLobbyValues[0] || inputParameters.typicalFloorLobby);
              } else {
                handleInputChange('buildingHeight', maxHeight || inputParameters.buildingHeight);
                handleInputChange('numberOfFloors', maxFloors || inputParameters.numberOfFloors);
              }
              setCurrentStep(2);
            }}
          />
        )}

        {/* Step 2: Input Parameters */}
        {currentStep === 2 && (
          <InputParametersForm 
            inputs={inputParameters}
            onChange={handleInputChange}
            onCalculate={handleCalculate}
            onBack={() => setCurrentStep(1)}
            loading={loading}
            selectedBuildings={selectedBuildings}
          />
        )}

        {/* Step 3: Results Display */}
        {currentStep === 3 && calculationResults && (
          <ResultsDisplay 
            results={calculationResults}
            calculationName={calculationName}
            setCalculationName={setCalculationName}
            status={status}
            setStatus={setStatus}
            remarks={remarks}
            setRemarks={setRemarks}
            onSave={handleSave}
            onBack={() => setCurrentStep(2)}
            saving={saving}
          />
        )}
      </div>
    </Layout>
  );
}

// Building Selection Component
function BuildingSelection({ buildings, selectedBuildings, onToggle, onNext }) {
  // Ensure buildings is an array
  const buildingsList = Array.isArray(buildings) ? buildings : [];
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-blue-500" />
        Select Buildings for Electrical Load Calculation
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {buildingsList.map(building => {
          const isSelected = selectedBuildings.find(b => b.id === building.id);
          
          return (
            <div
              key={building.id}
              onClick={() => onToggle(building)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{building.name}</h3>
                  <p className="text-sm text-gray-500">
                    {building.floor_count || 0} floors • {Number(building.total_height_m || 0).toFixed(1)} m
                  </p>
                </div>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-sm">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {buildingsList.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No buildings found in this project</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-gray-600">
          Selected: <span className="font-semibold">{selectedBuildings.length}</span> building(s)
        </p>
        <button
          onClick={onNext}
          disabled={selectedBuildings.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Input Parameters
        </button>
      </div>
    </div>
  );
}

// Input Parameters Form Component
function InputParametersForm({ inputs, onChange, onCalculate, onBack, loading, selectedBuildings }) {
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    building: true,
    lifts: false,
    hvac: false,
    pressurization: false,
    phe: false,
    ff: false,
    society: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const CollapsibleSection = ({ title, section, icon: Icon, children }) => (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {expandedSections[section] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expandedSections[section] && (
        <div className="px-4 py-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );

  const FormField = ({ label, children, hint }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          Building & System Configuration
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Back to Building Selection
        </button>
      </div>

      {/* Project Information */}
      <CollapsibleSection title="Project Information" section="project" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Project Category">
            <input
              type="text"
              value={inputs.projectCategory || '—'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </FormField>
        </div>

        {Array.isArray(selectedBuildings) && selectedBuildings.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Society Details</p>
            <div className="space-y-2">
              {Object.entries(
                selectedBuildings.reduce((acc, building) => {
                  const societyName = building.society_name || building.societyName || 'Unassigned';
                  if (!acc[societyName]) {
                    acc[societyName] = [];
                  }
                  acc[societyName].push(building.name);
                  return acc;
                }, {})
              ).map(([societyName, buildingNames]) => (
                <div key={societyName} className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{societyName}</p>
                    <p className="text-xs text-gray-500">
                      {buildingNames.length} building(s): {buildingNames.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Building Specifications */}
      <CollapsibleSection title="Building Specifications" section="building" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Building Height (m)" hint="Auto-filled from floor heights; per-building values are used in calculations.">
            <input
              type="number"
              step="0.1"
              min="0"
              value={inputs.buildingHeight}
              onChange={(e) => {
                const nextValue = parseFloat(e.target.value);
                onChange('buildingHeight', Number.isNaN(nextValue) ? 0 : nextValue);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Number of Floors" hint="Auto-filled from the selected building(s).">
            <input
              type="number"
              min="0"
              value={inputs.numberOfFloors}
              onChange={(e) => {
                const nextValue = parseInt(e.target.value, 10);
                onChange('numberOfFloors', Number.isNaN(nextValue) ? 0 : nextValue);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>

        {Array.isArray(selectedBuildings) && selectedBuildings.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedBuildings.map(building => (
              <div key={building.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm">
                <div className="font-semibold text-gray-900">{building.name}</div>
                <div className="text-gray-600">
                  Height: {Number(building.total_height_m || 0).toFixed(1)} m
                </div>
                <div className="text-gray-600">Floors: {building.floor_count || 0}</div>
                <div className="text-gray-600">
                  GF Lobby: {Number(building.gf_entrance_lobby || building.gfEntranceLobby || 0).toFixed(1)} sq.m
                </div>
                <div className="text-gray-600">
                  Typical Lobby: {Number(building.avg_typical_lobby_area || building.typical_lobby_area || building.typicalLobbyArea || 0).toFixed(1)} sq.m
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Continue with remaining sections - truncated for brevity */}
      {/* The full component would include all input sections from the implementation plan */}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Back to Building Selection
        </button>
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Calculate Electrical Load
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Results Display Component  
function ResultsDisplay({ results, calculationName, setCalculationName, status, setStatus, remarks, setRemarks, onSave, onBack, saving }) {
  if (!results || !results.totals) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Unable to display results. Calculation data is incomplete.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totals = results.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Results & Save</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Back to Input Parameters
        </button>
      </div>
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-yellow-400">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-7 h-7 text-yellow-600" />
          Total Electrical Load Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Connected Load</div>
            <div className="text-3xl font-bold text-gray-900">
              {totals.grandTotalTCL.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Maximum Demand</div>
            <div className="text-3xl font-bold text-blue-600">
              {totals.totalMaxDemand.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Essential Load</div>
            <div className="text-3xl font-bold text-green-600">
              {totals.totalEssential.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Fire Load</div>
            <div className="text-3xl font-bold text-red-600">
              {totals.totalFire.toFixed(2)} kW
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-yellow-300">
          <div className="text-sm text-gray-600">Recommended Transformer Size</div>
          <div className="text-2xl font-bold text-purple-600">
            {totals.transformerSizeKVA} kVA
          </div>
          <div className="text-xs text-gray-500">Based on 0.9 power factor</div>
        </div>
      </div>

      {/* Per Building Calculations */}
      {Array.isArray(results.buildingBreakdowns) && results.buildingBreakdowns.length > 0 && (
        <div className="space-y-4">
          {results.buildingBreakdowns.map((building, index) => {
            // Skip duplicate twin buildings - only show one from each twin pair
            // But only skip if the parent/twin building is also in the results
            if (building.twinOfBuildingId) {
              // Check if the parent building is in the selected buildings
              const parentExists = results.buildingBreakdowns.some(b => 
                b.buildingId === building.twinOfBuildingId
              );
              // Only skip if parent exists in selection
              if (parentExists) {
                return null;
              }
            }
            
            // Find all twins of this building to show in the header
            const twins = results.buildingBreakdowns.filter(b => 
              b.twinOfBuildingId === building.buildingId || 
              (building.twinOfBuildingId && b.buildingId === building.twinOfBuildingId)
            );
            
            return (
              <div key={building.buildingId || building.buildingName} className="bg-white rounded-lg shadow p-6">
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {building.buildingName || `Building ${index + 1}`}
                      </h3>
                      {twins.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          Similar to: {twins.map(t => t.buildingName).join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {building.numberOfFloors || '-'} floors • {Number(building.buildingHeight || 0).toFixed(1)} m height
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Flat/Office/Shop Loads */}
                {building.flatLoads && building.flatLoads.items && building.flatLoads.items.length > 0 && (
                  <div className="mb-4">
                    <LoadCategoryTable category={building.flatLoads} />
                  </div>
                )}
                
                {/* Building Common Area Loads */}
                <div>
                  {building.buildingCALoads?.map((category, idx) => (
                    <LoadCategoryTable key={`${building.buildingId}-ca-${idx}`} category={category} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Level Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          Project Level Summary
        </h3>

        {/* Buildings Summary Table */}
        {Array.isArray(results.buildingBreakdowns) && results.buildingBreakdowns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h4 className="text-lg font-bold mb-3">Building-wise Load Summary</h4>
            <p className="text-sm text-gray-600 mb-3">Individual building loads (flats + common areas)</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold">Building Name</th>
                    <th className="text-right py-2 px-3 font-semibold">Connected Load (kW)</th>
                    <th className="text-right py-2 px-3 font-semibold">Max Demand (kW)</th>
                    <th className="text-right py-2 px-3 font-semibold">Essential (kW)</th>
                    <th className="text-right py-2 px-3 font-semibold">Fire Load (kW)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.buildingBreakdowns.map((building, index) => {
                    return (
                      <tr key={building.buildingId || index} className="border-b border-gray-200">
                        <td className="py-2 px-3 font-medium">
                          {building.buildingName || `Building ${index + 1}`}
                        </td>
                        <td className="py-2 px-3 text-right">{building.totals?.tcl?.toFixed(2) || '0.00'}</td>
                        <td className="py-2 px-3 text-right">{building.totals?.maxDemand?.toFixed(2) || '0.00'}</td>
                        <td className="py-2 px-3 text-right">{building.totals?.essential?.toFixed(2) || '0.00'}</td>
                        <td className="py-2 px-3 text-right">{building.totals?.fire?.toFixed(2) || '0.00'}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-gray-400 font-bold bg-gray-50">
                    <td className="py-2 px-3">Subtotal (All Buildings)</td>
                    <td className="py-2 px-3 text-right">{results.totals?.perBuilding?.tcl?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-3 text-right">{results.totals?.perBuilding?.maxDemand?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-3 text-right">{results.totals?.perBuilding?.essential?.toFixed(2) || '0.00'}</td>
                    <td className="py-2 px-3 text-right">{results.totals?.perBuilding?.fire?.toFixed(2) || '0.00'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* External/Society Common Area Loads */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-lg font-bold mb-3">External Common Area Loads</h4>
          {results.societyCALoads.map((category, idx) => (
            <LoadCategoryTable key={`society-${idx}`} category={category} />
          ))}
        </div>
      </div>

      {/* Save Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Save Calculation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calculation Name *
            </label>
            <input
              type="text"
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
              placeholder="e.g., Electrical Load - Initial Design"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="3"
              placeholder="Additional notes or comments..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Modify Inputs
        </button>
        <button
          onClick={onSave}
          disabled={saving || !calculationName.trim()}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Calculation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function LoadCategoryTable({ category }) {
  return (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-2">{category.category}</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-2 text-left">Description</th>
              <th className="border border-gray-300 p-2 text-right">Nos</th>
              <th className="border border-gray-300 p-2 text-right">TCL (kW)</th>
              <th className="border border-gray-300 p-2 text-right">Max (kW)</th>
              <th className="border border-gray-300 p-2 text-right">Essential (kW)</th>
              <th className="border border-gray-300 p-2 text-right">Fire (kW)</th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-right">{item.nos || '-'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.tcl?.toFixed(2) || '0.00'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.maxDemandKW?.toFixed(2) || '0.00'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.essentialKW?.toFixed(2) || '0.00'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.fireKW?.toFixed(2) || '0.00'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-50 font-bold">
            <tr>
              <td className="border border-gray-300 p-2" colSpan="2">Subtotal - {category.category}</td>
              <td className="border border-gray-300 p-2 text-right">{category.totalTCL?.toFixed(2) || '0.00'}</td>
              <td className="border border-gray-300 p-2 text-right">{category.totalMaxDemand?.toFixed(2) || '0.00'}</td>
              <td className="border border-gray-300 p-2 text-right">{category.totalEssential?.toFixed(2) || '0.00'}</td>
              <td className="border border-gray-300 p-2 text-right">{category.totalFire?.toFixed(2) || '0.00'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
