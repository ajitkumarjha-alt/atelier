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
  ChevronUp,
  Settings
} from 'lucide-react';
import Layout from '../../components/Layout';
import { apiFetch } from '../../lib/api';

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 WORK RESUMPTION MARKER - February 9, 2026
// ═══════════════════════════════════════════════════════════════════════════
// 
// ✅ COMPLETED TODAY:
// 1. Implemented MSEDCL 2016 regulatory framework (database-driven)
// 2. Added auto-calculation of total carpet area from selected buildings
// 3. Implemented sanctioned load vs load after diversity factor
// 4. Added DTC/substation requirements based on area type
// 5. Created comprehensive regulatory compliance UI display
// 6. Fixed INSERT statement placeholder mismatch
// 7. Ran database migrations successfully
// 8. Committed to GitHub (commit: 0742f69)
//
// 📋 CURRENT STATE:
// - Regulatory framework fully functional
// - Auto-carpet area calculation working
// - UI displays MSEDCL compliance sections
// - Backend calculates minimum loads (75/150/200 W/sq.m)
// - Server running, migrations completed
//
// 🔍 NEXT STEPS / TODO:
// - Test end-to-end calculation with new regulatory compliance
// - Verify regulatory compliance results display correctly
// - Add framework selection dropdown (MSEDCL/future frameworks)
// - Enhance common area load factors (currently using low NBC values)
// - Consider making W/sqm values configurable per building type
// - Add validation for area type vs building characteristics
//
// 📚 DOCUMENTATION:
// - See: /MSEDCL_COMPLIANCE_CHECKLIST.md
// - See: /REGULATORY_FRAMEWORK_IMPLEMENTATION.md
// ═══════════════════════════════════════════════════════════════════════════

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
    // Regulatory Framework Settings
    areaType: 'URBAN',
    totalCarpetArea: 0,
    
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
      let newSelection;
      if (exists) {
        newSelection = prev.filter(b => b.id !== building.id);
      } else {
        newSelection = [...prev, building];
      }
      
      // Auto-calculate total carpet area from selected buildings
      // area_sqft column actually stores carpet area in sq.m (input form uses sqm)
      const totalCarpetAreaSqM = newSelection.reduce((total, bldg) => {
        const buildingCarpetArea = (bldg.flats || []).reduce((sum, flat) => {
          return sum + (parseFloat(flat.area_sqft) || 0) * (parseInt(flat.total_count) || 0);
        }, 0);
        return total + buildingCarpetArea;
      }, 0);
      
      // Update input parameters with auto-calculated carpet area
      setInputParameters(prev => ({
        ...prev,
        totalCarpetArea: parseFloat(totalCarpetAreaSqM.toFixed(2))
      }));
      
      return newSelection;
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
        selectedBuildings: result.selected_buildings || [],
        regulatory_compliance: result.regulatory_compliance || result.calculation_metadata,
        regulatory_framework: result.regulatory_framework,
        areaType: result.area_type || inputParameters.areaType,
        factors_used: result.factors_used || null
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
              className="p-2 hover:bg-lodha-sand rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="heading-primary flex items-center gap-2">
                <Zap className="w-7 h-7 text-yellow-500" />
                Electrical Load Calculation
              </h1>
              <p className="text-sm text-lodha-grey/70 mt-1">
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
                    <div className={`flex-1 h-1 ${currentStep > idx ? 'bg-blue-500' : 'bg-lodha-steel/20'}`} />
                  )}
                  <div className={`flex items-center gap-2 ${idx > 0 ? 'ml-2' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.num 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-lodha-steel/20 text-lodha-grey'
                    }`}>
                      {step.num}
                    </div>
                    <span className={`text-sm hidden sm:inline ${
                      currentStep >= step.num ? 'text-blue-600 font-medium' : 'text-lodha-grey/70'
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
                  : 'border-lodha-steel/30 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lodha-black">{building.name}</h3>
                  <p className="text-sm text-lodha-grey/70">
                    {building.floor_count || 0} floors • {Number(building.total_height_m || 0).toFixed(1)} m
                  </p>
                </div>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-lodha-steel'
                }`}>
                  {isSelected && <span className="text-white text-sm">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {buildingsList.length === 0 && (
        <div className="text-center py-8 text-lodha-grey/70">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No buildings found in this project</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-lodha-grey">
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
    building: false,
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
    <div className="border border-lodha-steel/30 rounded-lg mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-lodha-sand/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lodha-black">{title}</h3>
        </div>
        {expandedSections[section] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expandedSections[section] && (
        <div className="px-4 py-4 border-t border-lodha-steel/30">
          {children}
        </div>
      )}
    </div>
  );

  const FormField = ({ label, children, hint }) => (
    <div>
      <label className="block text-sm font-medium text-lodha-grey mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-lodha-grey/70 mt-1">{hint}</p>}
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
          className="px-4 py-2 bg-lodha-steel/20 text-lodha-grey rounded-lg hover:bg-lodha-steel/30"
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
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg bg-lodha-sand/40"
            />
          </FormField>
        </div>

        {Array.isArray(selectedBuildings) && selectedBuildings.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-lodha-grey mb-2">Society Details</p>
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
                <div key={societyName} className="flex items-start justify-between rounded-lg border border-lodha-steel/30 p-3">
                  <div>
                    <p className="text-sm font-semibold text-lodha-black">{societyName}</p>
                    <p className="text-xs text-lodha-grey/70">
                      {buildingNames.length} building(s): {buildingNames.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Regulatory Settings */}
      <CollapsibleSection title="Regulatory Settings (MSEDCL Compliance)" section="regulatory" icon={FileText}>
        <div className="grid grid-cols-2 gap-4">
          <FormField 
            label="Area Type" 
            hint="Select the area classification per MSEDCL guidelines. Determines DTC thresholds and requirements."
          >
            <select
              value={inputs.areaType}
              onChange={(e) => onChange('areaType', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="RURAL">Rural Area (DTC threshold: 25 kVA)</option>
              <option value="URBAN">Urban Area (DTC threshold: 75 kVA)</option>
              <option value="METRO">Metropolitan Area (DTC threshold: 250 kVA)</option>
              <option value="MAJOR_CITIES">Major Cities (DTC threshold: 250 kVA)</option>
            </select>
          </FormField>

          <FormField
            label="Total Carpet Area (sq.m)"
            hint="✓ Auto-calculated from selected buildings. MSEDCL requires minimum 75 W/sq.m for residential."
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={inputs.totalCarpetArea}
              onChange={(e) => {
                const nextValue = parseFloat(e.target.value);
                onChange('totalCarpetArea', Number.isNaN(nextValue) ? 0 : nextValue);
              }}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500 bg-green-50"
              placeholder="Auto-calculated"
              title="Auto-calculated from flat areas"
            />
            {inputs.totalCarpetArea > 0 && (
              <p className="text-sm text-green-700 mt-2 font-semibold">
                MSEDCL Minimum Required Load: {(inputs.totalCarpetArea * 75 / 1000).toFixed(2)} kW
                <span className="text-xs text-lodha-grey ml-2">(75 W/sq.m × {inputs.totalCarpetArea.toFixed(2)} sq.m)</span>
              </p>
            )}
          </FormField>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">MSEDCL 2016 Guidelines:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Residential:</strong> Minimum 75 W/sq.m carpet area</li>
            <li>• <strong>Commercial with AC:</strong> Minimum 200 W/sq.m carpet area</li>
            <li>• <strong>Commercial (other):</strong> Minimum 150 W/sq.m carpet area</li>
            <li>• <strong>Sanctioned Load Limit:</strong> Single consumer ≤ 160 kW / 200 kVA; Multiple consumers ≤ 480 kW / 600 kVA</li>
            <li>• <strong>Load After DF:</strong> Used ONLY for DTC capacity sizing, NOT for billing</li>
          </ul>
        </div>
      </CollapsibleSection>

      {/* Building Specifications */}
      <CollapsibleSection title="Building Specifications" section="building" icon={Building2}>
        {/* Removed Building Height and Number of Floors fields as per requirements */}

        {Array.isArray(selectedBuildings) && selectedBuildings.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedBuildings.map(building => (
              <div key={building.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-lodha-steel/30 p-3 text-sm">
                <div className="font-semibold text-lodha-black">{building.name}</div>
                <div className="text-lodha-grey">
                  Height: {Number(building.total_height_m || 0).toFixed(1)} m
                </div>
                <div className="text-lodha-grey">Floors: {building.floor_count || 0}</div>
                <div className="text-lodha-grey">
                  GF Lobby: {Number(building.gf_entrance_lobby || building.gfEntranceLobby || 0).toFixed(1)} sq.m
                </div>
                <div className="text-lodha-grey">
                  Typical Lobby: {Number(building.avg_typical_lobby_area || building.typical_lobby_area || building.typicalLobbyArea || 0).toFixed(1)} sq.m
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Lift Configuration */}
      <CollapsibleSection title="Lift Configuration" section="lifts" icon={Building2}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="Passenger Lifts" hint="Standard passenger lifts (not fire-rated)">
            <input
              type="number"
              min="0"
              value={inputs.passengerLifts}
              onChange={(e) => onChange('passengerLifts', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Passenger + Fire Lifts" hint="Dual-purpose lifts (fire-rated)">
            <input
              type="number"
              min="0"
              value={inputs.passengerFireLifts}
              onChange={(e) => onChange('passengerFireLifts', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Firemen Lifts" hint="Dedicated firemen evacuation lifts">
            <input
              type="number"
              min="0"
              value={inputs.firemenLifts}
              onChange={(e) => onChange('firemenLifts', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* HVAC & Ventilation */}
      <CollapsibleSection title="HVAC & Ventilation" section="hvac" icon={Zap}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Lobby Ventilation Type">
            <select
              value={inputs.lobbyType}
              onChange={(e) => onChange('lobbyType', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Nat. Vent">Natural Ventilation</option>
              <option value="AC">Air Conditioned</option>
              <option value="Mech. Vent">Mechanical Ventilation</option>
            </select>
          </FormField>
          <FormField label="Terrace Lighting">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                checked={inputs.terraceLighting}
                onChange={(e) => onChange('terraceLighting', e.target.checked)}
                className="w-5 h-5 rounded border-lodha-steel text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-lodha-grey">Include terrace lighting load</span>
            </div>
          </FormField>
        </div>
        {inputs.terraceLighting && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="Terrace Area (sq.m)">
              <input
                type="number"
                min="0"
                value={inputs.terraceArea}
                onChange={(e) => onChange('terraceArea', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </div>
        )}
        {(inputs.lobbyType === 'Mech. Vent' || inputs.mechanicalVentilation) && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="Ventilation CFM">
              <input
                type="number"
                min="0"
                value={inputs.ventilationCFM}
                onChange={(e) => onChange('ventilationCFM', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Number of Ventilation Fans">
              <input
                type="number"
                min="0"
                value={inputs.ventilationFans}
                onChange={(e) => onChange('ventilationFans', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <FormField label="Landscape Lighting">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                checked={inputs.landscapeLighting}
                onChange={(e) => onChange('landscapeLighting', e.target.checked)}
                className="w-5 h-5 rounded border-lodha-steel text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-lodha-grey">Include landscape/external lighting</span>
            </div>
          </FormField>
          {inputs.landscapeLighting && (
            <FormField label="Landscape Lighting Load (kW)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={inputs.landscapeLightingLoad}
                onChange={(e) => onChange('landscapeLightingLoad', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          )}
        </div>
      </CollapsibleSection>

      {/* Pressurization */}
      <CollapsibleSection title="Pressurization Systems" section="pressurization" icon={Zap}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Number of Staircases" hint="For pressurization fan sizing">
            <input
              type="number"
              min="1"
              value={inputs.numberOfStaircases}
              onChange={(e) => onChange('numberOfStaircases', parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Staircase and fire lift lobby pressurization fans are automatically calculated based on building configuration.
          Fire lift lobby pressurization is included when passenger+fire lifts or firemen lifts are present.
        </div>
      </CollapsibleSection>

      {/* PHE - Building Level */}
      <CollapsibleSection title="PHE (Building Level)" section="phe" icon={Zap}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Booster Pump Flow (LPM)">
            <input
              type="number"
              min="0"
              value={inputs.boosterPumpFlow}
              onChange={(e) => onChange('boosterPumpFlow', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Booster Pump Set">
            <select
              value={inputs.boosterPumpSet}
              onChange={(e) => onChange('boosterPumpSet', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1W+1S">1 Working + 1 Standby</option>
              <option value="2W+1S">2 Working + 1 Standby</option>
            </select>
          </FormField>
          <FormField label="Sewage Pump Capacity (LPM)">
            <input
              type="number"
              min="0"
              value={inputs.sewagePumpCapacity}
              onChange={(e) => onChange('sewagePumpCapacity', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Number of Sewage Pumps">
            <input
              type="number"
              min="0"
              value={inputs.sewagePumpSet}
              onChange={(e) => onChange('sewagePumpSet', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <FormField label="Wet Riser Pump">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                checked={inputs.wetRiserPump}
                onChange={(e) => onChange('wetRiserPump', e.target.checked)}
                className="w-5 h-5 rounded border-lodha-steel text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-lodha-grey">Include wet riser pump (separate from main FF)</span>
            </div>
          </FormField>
          {inputs.wetRiserPump && (
            <FormField label="Wet Riser Pump Power (kW)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={inputs.wetRiserPumpPower}
                onChange={(e) => onChange('wetRiserPumpPower', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </FormField>
          )}
        </div>
      </CollapsibleSection>

      {/* Fire Fighting - Society Level */}
      <CollapsibleSection title="Fire Fighting System (Society)" section="ff" icon={Zap}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Main Hydrant Pump Flow (LPM)" hint="MSEDCL standard: 2850 LPM for high-rise">
            <input
              type="number"
              min="0"
              value={inputs.mainPumpFlow}
              onChange={(e) => onChange('mainPumpFlow', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="FBT Pump Set Type">
            <select
              value={inputs.fbtPumpSetType}
              onChange={(e) => onChange('fbtPumpSetType', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Main+SBY+Jky">Main + Standby + Jockey</option>
              <option value="2 Main+SBY+Jky">2 Main + Standby + Jockey</option>
            </select>
          </FormField>
          <FormField label="Sprinkler Pump Flow (LPM)">
            <input
              type="number"
              min="0"
              value={inputs.sprinklerPumpFlow}
              onChange={(e) => onChange('sprinklerPumpFlow', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Sprinkler Pump Set">
            <select
              value={inputs.sprinklerPumpSet}
              onChange={(e) => onChange('sprinklerPumpSet', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Main+SBY+Jky">Main + Standby + Jockey</option>
              <option value="2 Main+SBY+Jky">2 Main + Standby + Jockey</option>
            </select>
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Society Infrastructure */}
      <CollapsibleSection title="Society Infrastructure" section="society" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Domestic Transfer Flow (LPM)">
            <input
              type="number"
              min="0"
              value={inputs.domTransferFlow}
              onChange={(e) => onChange('domTransferFlow', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Transfer Pump Config">
            <select
              value={inputs.domTransferConfig}
              onChange={(e) => onChange('domTransferConfig', e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1W+1S">1 Working + 1 Standby</option>
              <option value="2W+1S">2 Working + 1 Standby</option>
              <option value="3W+1S">3 Working + 1 Standby</option>
            </select>
          </FormField>
          <FormField label="STP Capacity (KLD)" hint="Sewage Treatment Plant capacity in kilolitres/day">
            <input
              type="number"
              min="0"
              value={inputs.stpCapacity}
              onChange={(e) => onChange('stpCapacity', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Clubhouse Load (kW)" hint="Total amenity electrical load">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.clubhouseLoad}
              onChange={(e) => onChange('clubhouseLoad', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Street Lighting Load (kW)">
            <input
              type="number"
              min="0"
              step="1"
              value={inputs.streetLightingLoad}
              onChange={(e) => onChange('streetLightingLoad', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="EV Charger Count">
            <input
              type="number"
              min="0"
              value={inputs.evChargerCount}
              onChange={(e) => onChange('evChargerCount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          {inputs.evChargerCount > 0 && (
            <FormField label="EV Charger Type">
              <select
                value={inputs.evChargerType}
                onChange={(e) => onChange('evChargerType', e.target.value)}
                className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="slow">Slow (3.3 kW)</option>
                <option value="standard">Standard (7.4 kW)</option>
                <option value="fast">Fast (22 kW)</option>
                <option value="dc_fast">DC Fast (50 kW)</option>
              </select>
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <FormField label="Security System Load (kW)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={inputs.securitySystemLoad}
              onChange={(e) => onChange('securitySystemLoad', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Common Area Small Power (kW)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={inputs.smallPowerLoad}
              onChange={(e) => onChange('smallPowerLoad', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 bg-lodha-steel/30 text-lodha-grey rounded-lg hover:bg-lodha-steel/50"
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
  const [regulatoryOpen, setRegulatoryOpen] = useState(false);
  const [projectSummaryOpen, setProjectSummaryOpen] = useState(false);
  
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
        <h2 className="text-xl font-bold text-lodha-black">Results & Save</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-lodha-steel/20 text-lodha-grey rounded-lg hover:bg-lodha-steel/30"
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
            <div className="text-sm text-lodha-grey">Total Connected Load</div>
            <div className="text-3xl font-bold text-lodha-black">
              {totals.grandTotalTCL.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-lodha-grey">Maximum Demand</div>
            <div className="text-3xl font-bold text-blue-600">
              {totals.totalMaxDemand.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-lodha-grey">Essential Load</div>
            <div className="text-3xl font-bold text-green-600">
              {totals.totalEssential.toFixed(2)} kW
            </div>
          </div>
          
          <div>
            <div className="text-sm text-lodha-grey">Fire Load</div>
            <div className="text-3xl font-bold text-red-600">
              {totals.totalFire.toFixed(2)} kW
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-yellow-300">
          <div className="text-sm text-lodha-grey">Recommended Transformer Size</div>
          <div className="text-2xl font-bold text-purple-600">
            {totals.transformerSizeKVA} kVA
          </div>
          <div className="text-xs text-lodha-grey/70">Based on 0.9 power factor</div>
        </div>
      </div>

      {/* Factors Used in Calculation (MSEDCL) */}
      {(results.factors_used || results.regulatory_compliance) && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500">
          <button
            onClick={() => setRegulatoryOpen(!regulatoryOpen)}
            className="w-full text-left bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between"
          >
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Calculation Factors — MSEDCL NSC Circular 35530
              </h3>
              <p className="text-sm text-blue-100 mt-1">Demand & diversity factors used in this calculation</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/project-standards')}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded transition"
                title="Manage calculation factors (L0 only)"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage Factors
              </button>
              {regulatoryOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
            </div>
          </button>

          {regulatoryOpen && (
          <div className="p-4">
            {results.factors_used && Object.keys(results.factors_used).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="text-left py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">Category</th>
                      <th className="text-left py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">Description</th>
                      <th className="text-right py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">W/sqm</th>
                      <th className="text-right py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">MDF</th>
                      <th className="text-right py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">EDF</th>
                      <th className="text-right py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">FDF</th>
                      <th className="text-left py-2 px-3 border-b-2 border-blue-200 font-semibold text-blue-900">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.factors_used)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([key, factor], idx) => {
                        const parts = key.split('/');
                        const category = parts[0];
                        const description = parts[2] || parts[1];
                        return (
                          <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-lodha-sand/40'}>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 font-medium text-lodha-grey">{category}</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-lodha-black">{description}</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-right font-mono">{factor.wattPerSqm != null ? factor.wattPerSqm : '—'}</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-right font-mono">{(factor.mdf * 100).toFixed(0)}%</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-right font-mono">{(factor.edf * 100).toFixed(0)}%</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-right font-mono">{(factor.fdf * 100).toFixed(0)}%</td>
                            <td className="py-2 px-3 border-b border-lodha-steel/15 text-xs text-lodha-grey/70">{factor.notes || '—'}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-lodha-grey/70 italic">No factor data available.</p>
            )}
          </div>
          )}
        </div>
      )}

      {/* Per Building Calculations */}
      {Array.isArray(results.buildingBreakdowns) && results.buildingBreakdowns.length > 0 && (
        <div className="space-y-4">
          {results.buildingBreakdowns.map((building, index) => {
            // Skip duplicate twin buildings - only show one from each twin pair
            if (building.twinOfBuildingId) {
              const parentExists = results.buildingBreakdowns.some(b => 
                b.buildingId === building.twinOfBuildingId
              );
              if (parentExists) return null;
            }
            
            const twins = results.buildingBreakdowns.filter(b => 
              b.twinOfBuildingId === building.buildingId || 
              (building.twinOfBuildingId && b.buildingId === building.twinOfBuildingId)
            );
            
            return (
              <BuildingBreakdownCard 
                key={building.buildingId || building.buildingName} 
                building={building} 
                twins={twins} 
                index={index} 
              />
            );
          })}
        </div>
      )}

      {/* Project Level Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-200">
        <button
          onClick={() => setProjectSummaryOpen(!projectSummaryOpen)}
          className="w-full text-left px-6 py-4 flex items-center justify-between"
        >
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Project Level Summary
          </h3>
          <div className="flex items-center gap-3">
            {!projectSummaryOpen && (
              <span className="text-sm text-lodha-grey/70">
                TCL: {totals.grandTotalTCL?.toFixed(2)} kW | Max: {totals.totalMaxDemand?.toFixed(2)} kW
              </span>
            )}
            {projectSummaryOpen ? <ChevronUp className="w-5 h-5 text-lodha-grey" /> : <ChevronDown className="w-5 h-5 text-lodha-grey" />}
          </div>
        </button>

        {projectSummaryOpen && (
        <div className="px-6 pb-6">
        {/* Buildings Summary Table */}
        {Array.isArray(results.buildingBreakdowns) && results.buildingBreakdowns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h4 className="text-lg font-bold mb-3">Building-wise Load Summary</h4>
            <p className="text-sm text-lodha-grey mb-3">Individual building loads (flats + common areas)</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-lodha-steel">
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
                      <tr key={building.buildingId || index} className="border-b border-lodha-steel/30">
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
                  <tr className="border-t-2 border-lodha-steel font-bold bg-lodha-sand/40">
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
        )}
      </div>

      {/* Save Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Save Calculation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">
              Calculation Name *
            </label>
            <input
              type="text"
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
              placeholder="e.g., Electrical Load - Initial Design"
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="3"
              placeholder="Additional notes or comments..."
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-lodha-steel/30 text-lodha-grey rounded-lg hover:bg-lodha-steel/50"
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

function BuildingBreakdownCard({ building, twins, index }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start justify-between"
      >
        <div className="flex-1">
          <h3 className="text-xl font-bold text-lodha-black">
            {building.buildingName || `Building ${index + 1}`}
          </h3>
          {twins.length > 0 && (
            <p className="text-sm text-lodha-grey mt-1">
              Similar to: {twins.map(t => t.buildingName).join(', ')}
            </p>
          )}
          <p className="text-sm text-lodha-grey/70">
            {building.numberOfFloors || '-'} floors • {Number(building.buildingHeight || 0).toFixed(1)} m height
            {building.totalUnits > 0 && ` • ${building.totalUnits} units`}
          </p>
          {building.diversityFactor && building.diversityFactor < 1.0 && (
            <p className="text-xs text-purple-700 mt-1 bg-purple-50 px-2 py-1 rounded inline-block">
              Building Diversity Factor: {(building.diversityFactor * 100).toFixed(0)}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4 mt-1 shrink-0">
          {!expanded && (
            <span className="text-xs text-lodha-grey/70">
              TCL: {building.totals?.tcl?.toFixed(2)} kW | Max: {building.totals?.maxDemand?.toFixed(2)} kW
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-lodha-grey" /> : <ChevronDown className="w-5 h-5 text-lodha-grey" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-5 pb-5 border-t border-lodha-steel/30">
          {building.flatLoads && building.flatLoads.items && building.flatLoads.items.length > 0 && (
            <div className="mt-3">
              <LoadCategoryTable category={building.flatLoads} />
            </div>
          )}
          
          {building.buildingCALoads?.map((category, idx) => (
            <LoadCategoryTable key={`${building.buildingId}-ca-${idx}`} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadCategoryTable({ category }) {
  const [collapsed, setCollapsed] = useState(true);
  const hasItems = category.items && category.items.length > 0;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-lodha-sand/40 rounded transition-colors"
      >
        <h4 className="font-semibold text-base text-lodha-black">{category.category}</h4>
        <div className="flex items-center gap-3">
          <span className="text-xs text-lodha-grey/70">
            TCL: {category.totalTCL?.toFixed(2) || '0.00'} kW | Max: {category.totalMaxDemand?.toFixed(2) || '0.00'} kW
          </span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-lodha-grey" /> : <ChevronUp className="w-4 h-4 text-lodha-grey" />}
        </div>
      </button>
      {!collapsed && hasItems && (
        <div className="overflow-x-auto mt-1">
          <table className="w-full border-collapse border border-lodha-steel text-sm">
            <thead className="bg-lodha-sand">
              <tr>
                <th className="border border-lodha-steel p-2 text-left" rowSpan="2">Description</th>
                <th className="border border-lodha-steel p-2 text-center" colSpan="4">Connected Load</th>
                <th className="border border-lodha-steel p-2 text-center" colSpan="2">Maximum Demand</th>
                <th className="border border-lodha-steel p-2 text-center" colSpan="2">Essential</th>
                <th className="border border-lodha-steel p-2 text-center" colSpan="2">Fire Load</th>
              </tr>
              <tr>
                <th className="border border-lodha-steel p-1 text-right text-xs">Area (sqm)</th>
                <th className="border border-lodha-steel p-1 text-right text-xs">W/sqm</th>
                <th className="border border-lodha-steel p-1 text-right text-xs">Nos</th>
                <th className="border border-lodha-steel p-1 text-right text-xs bg-blue-50">TCL (kW)</th>
                <th className="border border-lodha-steel p-1 text-right text-xs">MDF</th>
                <th className="border border-lodha-steel p-1 text-right text-xs bg-green-50">Max (kW)</th>
                <th className="border border-lodha-steel p-1 text-right text-xs">EDF</th>
                <th className="border border-lodha-steel p-1 text-right text-xs bg-yellow-50">Ess (kW)</th>
                <th className="border border-lodha-steel p-1 text-right text-xs">FDF</th>
                <th className="border border-lodha-steel p-1 text-right text-xs bg-red-50">Fire (kW)</th>
              </tr>
            </thead>
            <tbody>
              {category.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-lodha-sand/40">
                  <td className="border border-lodha-steel p-2">{item.description}</td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">
                    {item.areaSqm ? Number(item.areaSqm).toFixed(1) : '-'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">
                    {item.wattPerSqm ? Number(item.wattPerSqm).toFixed(1) : '-'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">{item.nos || '-'}</td>
                  <td className="border border-lodha-steel p-1 text-right font-semibold bg-blue-50">
                    {item.tcl?.toFixed(2) || '0.00'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">
                    {item.mdf != null ? (item.mdf * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right font-semibold bg-green-50">
                    {item.maxDemandKW?.toFixed(2) || '0.00'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">
                    {item.edf != null ? (item.edf * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right font-semibold bg-yellow-50">
                    {item.essentialKW?.toFixed(2) || '0.00'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right text-lodha-grey">
                    {item.fdf != null ? (item.fdf * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td className="border border-lodha-steel p-1 text-right font-semibold bg-red-50">
                    {item.fireKW?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-lodha-steel/20 font-bold">
              <tr>
                <td className="border border-lodha-steel p-2" colSpan="4">Subtotal - {category.category}</td>
                <td className="border border-lodha-steel p-2 text-right bg-blue-100">{category.totalTCL?.toFixed(2) || '0.00'}</td>
                <td className="border border-lodha-steel p-2"></td>
                <td className="border border-lodha-steel p-2 text-right bg-green-100">{category.totalMaxDemand?.toFixed(2) || '0.00'}</td>
                <td className="border border-lodha-steel p-2"></td>
                <td className="border border-lodha-steel p-2 text-right bg-yellow-100">{category.totalEssential?.toFixed(2) || '0.00'}</td>
                <td className="border border-lodha-steel p-2"></td>
                <td className="border border-lodha-steel p-2 text-right bg-red-100">{category.totalFire?.toFixed(2) || '0.00'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
