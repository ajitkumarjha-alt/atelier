import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { ArrowLeft, Save, Calculator, Droplet, Users, Building2, Info, FileText } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { 
  getPolicyDataLegacyFormat, 
  getDefaultPolicy,
  clearPolicyCache 
} from '../services/policyService';

export default function WaterDemandCalculation() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);

  // Policy data state
  const [policyData, setPolicyData] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [availablePolicies, setAvailablePolicies] = useState([]);
  const [projectPolicyId, setProjectPolicyId] = useState(null);
  const [WATER_RATES, setWATER_RATES] = useState({});
  const [OCCUPANCY_FACTORS, setOCCUPANCY_FACTORS] = useState({});
  const [CALC_PARAMS, setCALC_PARAMS] = useState({});

  // Form state
  const [projectType, setProjectType] = useState('residential');
  const [subType, setSubType] = useState('luxury');
  const [flushSystemType, setFlushSystemType] = useState('valves'); // 'valves' or 'tanks' for luxury residential
  const [units, setUnits] = useState([]);
  const [totalArea, setTotalArea] = useState(0);
  const [hasPool, setHasPool] = useState(false);
  const [poolArea, setPoolArea] = useState(0);
  const [hasLandscape, setHasLandscape] = useState(false);
  const [landscapeArea, setLandscapeArea] = useState(0);
  const [hasCoolingTower, setHasCoolingTower] = useState(false);
  const [coolingCapacity, setCoolingCapacity] = useState(0);

  // Calculated results
  const [results, setResults] = useState(null);
  
  // Tank dimensions
  const [tankDepth, setTankDepth] = useState(2.5); // Default depth in meters

  useEffect(() => {
    fetchProjectData();
    fetchProjectStandards();
    fetchPolicyData();
    fetchAvailablePolicies();
    fetchSiteAreasSummary();
  }, [projectId]);

  useEffect(() => {
    if (selectedPolicyId) {
      fetchPolicyData(selectedPolicyId);
    }
  }, [selectedPolicyId]);

  const fetchProjectData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const response = await apiFetch(`/api/projects/${projectId}`, {
        headers: { 'x-dev-user-email': userEmail }
      });
      const data = await response.json();
      setProject(data);
    } catch (error) {
      showError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteAreasSummary = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}/site-areas/summary`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const landscape = data.find(area => area.area_type === 'landscape');
      const softscapeArea = landscape?.total_softscape_area_sqm ?? landscape?.total_area_sqm;
      if (softscapeArea && Number(softscapeArea) > 0) {
        setHasLandscape(true);
        setLandscapeArea(Number(softscapeArea));
      }
    } catch (error) {
      console.error('Failed to load site areas summary:', error);
    }
  };

  const fetchPolicyData = async (policyId = null) => {
    try {
      setPolicyLoading(true);
      const resolvedPolicyId = policyId || projectPolicyId;
      
      // Get policy data in the legacy format for backward compatibility
      const data = await getPolicyDataLegacyFormat(resolvedPolicyId);
      
      setWATER_RATES(data.WATER_RATES);
      setOCCUPANCY_FACTORS(data.OCCUPANCY_FACTORS);
      setCALC_PARAMS(data.CALC_PARAMS);
      
      // Get the policy info
      if (resolvedPolicyId) {
        const userEmail = localStorage.getItem('userEmail');
        const response = await apiFetch(`/api/policy-versions/${resolvedPolicyId}`, {
          headers: { 'x-dev-user-email': userEmail }
        });
        const policyInfo = await response.json();
        setSelectedPolicyId(resolvedPolicyId);
        setPolicyData(policyInfo);
      } else {
        const defaultPolicy = await getDefaultPolicy();
        setSelectedPolicyId(defaultPolicy.id);
        setPolicyData(defaultPolicy);
      }
    } catch (error) {
      console.error('Error loading policy data:', error);
      showError('Failed to load policy data. Using fallback values.');
      // Set empty objects to prevent crashes
      setWATER_RATES({});
      setOCCUPANCY_FACTORS({});
      setCALC_PARAMS({});
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchAvailablePolicies = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      // Fetch both active and draft policies (draft for testing, active for saving)
      const response = await apiFetch('/api/policy-versions', {
        headers: { 'x-dev-user-email': userEmail }
      });
      const allPolicies = await response.json();
      // Filter to show only active and draft policies (not archived)
      const usablePolicies = allPolicies.filter(p => p.status === 'active' || p.status === 'draft');
      setAvailablePolicies(usablePolicies);
    } catch (error) {
      console.error('Error loading available policies:', error);
    }
  };

  const fetchProjectStandards = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}/standard-selections`);
      if (!response.ok) return;
      const selections = await response.json();
      const policySelection = selections.find(s => s.standard_key === 'phe_policy_version');
      if (policySelection?.standard_ref_id) {
        setProjectPolicyId(policySelection.standard_ref_id);
        setSelectedPolicyId(policySelection.standard_ref_id);
      }
    } catch (error) {
      console.error('Error loading project standards:', error);
    }
  };

  const handlePolicyChange = async (policyId) => {
    if (policyId === selectedPolicyId) return;
    
    // Clear cache to force fresh data
    clearPolicyCache();
    await fetchPolicyData(parseInt(policyId));
    
    // Reset results when policy changes
    setResults(null);
    showSuccess('Policy changed. Please recalculate to see updated results.');
  };

  const calculateOccupancy = () => {
    let totalOccupancy = 0;

    if (projectType === 'residential') {
      units.forEach(unit => {
        const factor = OCCUPANCY_FACTORS.residential[unit.type]?.[subType] || 0;
        totalOccupancy += unit.count * factor;
      });
    } else if (projectType === 'office') {
      const sqmPerPerson = OCCUPANCY_FACTORS.office[subType] || 6.5;
      // Apply 90% peak occupancy factor per Policy 25
      totalOccupancy = (totalArea / sqmPerPerson) * 0.9;
    } else if (projectType === 'retail') {
      const factors = OCCUPANCY_FACTORS.retail[subType];
      totalOccupancy = totalArea / factors.fullTime;
    }

    return Math.ceil(totalOccupancy);
  };

  const calculateWaterDemand = () => {
    const occupancy = calculateOccupancy();
    let drinking = 0;
    let flushing = 0;
    let limitedHumanTouch = 0;
    let mechanical = 0;

    // Drinking water calculation
    if (projectType === 'residential') {
      const rates = WATER_RATES.residential[subType];
      drinking = occupancy * rates.drinking;
      
      // For luxury/hiEnd: choose between flush valves (75L) or flush tanks (45L)
      // For aspirational/casa: only flush valves available (60L)
      if (subType === 'luxury' || subType === 'hiEnd') {
        flushing = occupancy * (flushSystemType === 'tanks' ? rates.flushTanks : rates.flushValves);
      } else {
        flushing = occupancy * rates.flushing;
      }
    } else if (projectType === 'office') {
      const rates = WATER_RATES.office[subType];
      drinking = occupancy * rates.drinking;
      flushing = occupancy * rates.flushing;
    } else if (projectType === 'retail') {
      const rates = WATER_RATES.retail[subType];
      // CRITICAL FIX: Divide by visitor factor, not multiply (visitors per sqm, not sqm per visitor)
      const visitors = totalArea / (OCCUPANCY_FACTORS.retail[subType].visitor || 5);
      drinking = occupancy * rates.drinking + visitors * rates.visitor;
      flushing = occupancy * rates.flushing + visitors * rates.visitorFlushing;
    } else if (projectType === 'multiplex') {
      const seats = occupancy; // For multiplex, occupancy = seats
      drinking = seats * WATER_RATES.multiplex.perSeat; // 5 ltrs/seat for drinking
      flushing = seats * WATER_RATES.multiplex.flushing; // 10 ltrs/seat for flushing
    } else if (projectType === 'school') {
      drinking = occupancy * WATER_RATES.school.perHead;
      flushing = occupancy * WATER_RATES.school.flushing;
    }

    // Pool water calculation (limited human touch)
    // As per MEP-21: evaporation rate from policy (default 8mm/day for pool surface area)
    if (hasPool && poolArea > 0) {
      const poolEvaporationRate = CALC_PARAMS.pool_evaporation_rate || 8;
      const evaporation = poolArea * poolEvaporationRate; // mm depth = liters per sqm per day
      limitedHumanTouch += evaporation;
    }

    // Landscape water calculation (limited human touch)
    // As per MEP-21: landscape water rate from policy (default 5 ltrs per sqm)
    if (hasLandscape && landscapeArea > 0) {
      const landscapeRate = CALC_PARAMS.landscape_water_rate || 5;
      limitedHumanTouch += landscapeArea * landscapeRate;
    }

    // Cooling tower water (mechanical cooling)
    // As per MEP-21: For central airconditioning system make up water from policy (default 10 ltr/hr/Tr)
    if (hasCoolingTower && coolingCapacity > 0) {
      const coolingRate = CALC_PARAMS.cooling_tower_makeup_rate || 10;
      mechanical = coolingCapacity * coolingRate * 24; // ltr/hr/TR × 24 hours
    }

    const total = drinking + flushing + limitedHumanTouch + mechanical;

    // Storage capacity (typically 1 day supply)
    const storageCapacity = Math.ceil(total * 1.2); // 20% buffer

    return {
      occupancy,
      drinking: Math.ceil(drinking),
      flushing: Math.ceil(flushing),
      limitedHumanTouch: Math.ceil(limitedHumanTouch),
      mechanical: Math.ceil(mechanical),
      total: Math.ceil(total),
      storageCapacity,
      perCapita: occupancy > 0 ? Math.ceil(total / occupancy) : 0,
    };
  };

  const recommendTreatment = (results) => {
    const recommendations = [];

    // Drinking water treatment
    if (results.drinking > 0) {
      recommendations.push({
        type: 'Drinking Water',
        method: 'RO + UV Treatment',
        capacity: `${Math.ceil(results.drinking)} liters/day`,
        usage: 'Direct consumption, kitchen, basin, shower',
      });
    }

    // Flushing water treatment
    if (results.flushing > 0) {
      if (results.total > 50000) {
        recommendations.push({
          type: 'Flushing Water',
          method: 'STP with Tertiary Treatment (MBBR/MBR)',
          capacity: `${Math.ceil(results.flushing)} liters/day`,
          usage: 'Toilets, urinals',
        });
      } else {
        recommendations.push({
          type: 'Flushing Water',
          method: 'Conventional STP/SAFF',
          capacity: `${Math.ceil(results.flushing)} liters/day`,
          usage: 'Toilets, urinals, construction',
        });
      }
    }

    // Limited human touch
    if (results.limitedHumanTouch > 0) {
      recommendations.push({
        type: 'Limited Human Touch',
        method: 'Softener + UV (if needed)',
        capacity: `${Math.ceil(results.limitedHumanTouch)} liters/day`,
        usage: 'Pool makeup, landscape, fountains',
      });
    }

    // Mechanical cooling
    if (results.mechanical > 0) {
      recommendations.push({
        type: 'Mechanical Cooling',
        method: 'Softener + Chemical Treatment',
        capacity: `${Math.ceil(results.mechanical)} liters/day`,
        usage: 'Cooling towers',
      });
    }

    return recommendations;
  };

  const handleCalculate = () => {
    const calculated = calculateWaterDemand();
    const treatments = recommendTreatment(calculated);
    setResults({ ...calculated, treatments });
  };

  const handleSave = async () => {
    if (!results) {
      showError('Please calculate first');
      return;
    }

    // Prevent saving calculations with draft policies
    if (policyData && policyData.status === 'draft') {
      showError('Cannot save calculations using draft policies. Please switch to an active policy or ask L0/L1 to activate this policy first.');
      return;
    }

    const toastId = showLoading('Saving calculation...');
    setSaving(true);

    try {
      const userEmail = localStorage.getItem('userEmail');
      
      const calculationData = {
        project_id: parseInt(projectId),
        calculation_type: 'water-demand',
        title: `Water Demand Calculation - ${project?.project_name}`,
        input_data: {
          projectType,
          subType,
          flushSystemType,
          units,
          totalArea,
          hasPool,
          poolArea,
          hasLandscape,
          landscapeArea,
          hasCoolingTower,
          coolingCapacity,
          policy_version_id: selectedPolicyId,
          policy_name: policyData?.name,
          policy_number: policyData?.policy_number,
          policy_revision: policyData?.revision_number,
        },
        results: results,
        status: 'completed',
      };

      const response = await apiFetch('/api/design-calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': userEmail,
        },
        body: JSON.stringify(calculationData),
      });

      if (!response.ok) throw new Error('Failed to save');

      dismissToast(toastId);
      showSuccess('Calculation saved successfully!');
      navigate(`/design-calculations/${projectId}`);
    } catch (error) {
      dismissToast(toastId);
      showError('Failed to save calculation');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addUnit = () => {
    setUnits([...units, { type: '2BHK', count: 1 }]);
  };

  const updateUnit = (index, field, value) => {
    const updated = [...units];
    updated[index][field] = value;
    setUnits(updated);
  };

  const removeUnit = (index) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/design-calculations/${projectId}`)}
              className="p-2 hover:bg-lodha-sand rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="heading-primary">
                Water Demand Calculation
              </h1>
              <p className="text-lodha-grey mt-1">
                Project: {project?.project_name || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculate
            </button>
            <button
              onClick={handleSave}
              disabled={!results || saving}
              className="px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Information Banner */}
            {policyLoading ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">Loading policy data...</span>
                </div>
              </div>
            ) : policyData ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-blue-900">
                        {policyData.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        {policyData.policy_number} Rev {policyData.revision_number}
                      </span>
                      {policyData.is_default && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          Default
                        </span>
                      )}
                      {!policyData.is_default && (
                        <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full">
                          Testing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-700 mb-2">
                      {policyData.description || 'Official water demand calculation standards'}
                    </p>
                    
                    {/* Draft Policy Warning */}
                    {policyData.status === 'draft' && (
                      <div className="bg-orange-50 border border-orange-300 rounded px-3 py-2 mb-2">
                        <p className="text-xs text-orange-800 font-medium">
                          ⚠️ Testing Draft Policy - You can calculate but cannot save. Switch to an active policy to save calculations.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-blue-600">
                      <span>Policy: {policyData.policy_number}</span>
                      <span>Effective: {policyData.effective_date ? new Date(policyData.effective_date).toLocaleDateString() : 'N/A'}</span>
                      
                      {/* Policy Selector */}
                      {availablePolicies.length > 1 && (
                        <div className="ml-auto">
                          <label className="flex items-center gap-2">
                            <span className="text-lodha-grey font-medium">Switch Policy:</span>
                            <select
                              value={selectedPolicyId || ''}
                              onChange={(e) => handlePolicyChange(e.target.value)}
                              className="px-2 py-1 border border-blue-300 rounded text-sm bg-white text-lodha-black"
                            >
                              {availablePolicies.map(policy => (
                                <option key={policy.id} value={policy.id}>
                                  {policy.policy_number} Rev {policy.revision_number}
                                  {policy.is_default ? ' (Default)' : ''}
                                  {policy.status === 'draft' ? ' [DRAFT - Testing Only]' : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Project Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-lodha-gold" />
                Project Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-2">
                    Project Type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => {
                      setProjectType(e.target.value);
                      setSubType('');
                      setUnits([]);
                    }}
                    className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  >
                    <option value="residential">Residential</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="multiplex">Multiplex</option>
                    <option value="school">School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-2">
                    Sub-Type / Category
                  </label>
                  {projectType === 'residential' && (
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    >
                      <option value="luxury">Luxury</option>
                      <option value="hiEnd">Hi-end</option>
                      <option value="aspirational">Aspirational</option>
                      <option value="casa">Casa</option>
                    </select>
                  )}
                  {projectType === 'office' && (
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    >
                      <option value="excelus">Excelus</option>
                      <option value="supremus">Supremus</option>
                      <option value="iThink">iThink</option>
                    </select>
                  )}
                  {projectType === 'retail' && (
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    >
                      <option value="experia">Experia</option>
                      <option value="boulevard">Boulevard</option>
                    </select>
                  )}
                  {(projectType === 'multiplex' || projectType === 'school') && (
                    <input
                      type="text"
                      value={subType || 'Standard'}
                      disabled
                      className="w-full px-3 py-2 border border-lodha-steel rounded-lg bg-lodha-sand/40"
                    />
                  )}
                </div>

                {/* Flush System Type - Only for Luxury/Hi-end Residential */}
                {projectType === 'residential' && (subType === 'luxury' || subType === 'hiEnd') && (
                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-2">
                      Flush System Type
                    </label>
                    <select
                      value={flushSystemType}
                      onChange={(e) => setFlushSystemType(e.target.value)}
                      className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    >
                      <option value="valves">Flush Valves (75 L/occupant/day)</option>
                      <option value="tanks">Flush Tanks (45 L/occupant/day - 3-6L capacity)</option>
                    </select>
                    <p className="mt-1 text-xs text-lodha-grey/70">
                      As per MEP-21 Policy: Flush valves are standard, flush tanks reduce water consumption by 40%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Units / Area Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-lodha-gold" />
                {projectType === 'residential' ? 'Units Configuration' : 'Area Details'}
              </h2>

              {projectType === 'residential' ? (
                <div className="space-y-4">
                  {units.map((unit, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-lodha-grey mb-2">
                          Unit Type
                        </label>
                        <select
                          value={unit.type}
                          onChange={(e) => updateUnit(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        >
                          <option value="1BHK">1 BHK</option>
                          <option value="1.5BHK">1.5 BHK</option>
                          <option value="2BHK">2 BHK</option>
                          <option value="2.5BHK">2.5 BHK</option>
                          <option value="3BHK">3 BHK</option>
                          <option value="4BHK">4 BHK</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-lodha-grey mb-2">
                          Number of Units
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={unit.count}
                          onChange={(e) => updateUnit(index, 'count', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={() => removeUnit(index)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addUnit}
                    className="w-full py-2 border-2 border-dashed border-lodha-steel rounded-lg text-lodha-grey hover:border-lodha-gold hover:text-lodha-gold transition-colors"
                  >
                    + Add Unit Type
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-lodha-grey mb-2">
                    Total Area (sqm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalArea}
                    onChange={(e) => setTotalArea(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    placeholder="Enter total carpet area"
                  />
                </div>
              )}
            </div>

            {/* Special Features */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-lodha-gold" />
                Special Features
              </h2>

              <div className="space-y-4">
                {/* Pool */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasPool"
                    checked={hasPool}
                    onChange={(e) => setHasPool(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="hasPool" className="font-medium text-lodha-grey">
                      Swimming Pool / Water Body
                    </label>
                    {hasPool && (
                      <input
                        type="number"
                        min="0"
                        value={poolArea}
                        onChange={(e) => setPoolArea(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="Pool surface area (sqm)"
                      />
                    )}
                  </div>
                </div>

                {/* Landscape */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasLandscape"
                    checked={hasLandscape}
                    onChange={(e) => setHasLandscape(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="hasLandscape" className="font-medium text-lodha-grey">
                      Landscape Area
                    </label>
                    {hasLandscape && (
                      <input
                        type="number"
                        min="0"
                        value={landscapeArea}
                        onChange={(e) => setLandscapeArea(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="Landscape area (sqm)"
                      />
                    )}
                  </div>
                </div>

                {/* Cooling Tower */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasCoolingTower"
                    checked={hasCoolingTower}
                    onChange={(e) => setHasCoolingTower(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="hasCoolingTower" className="font-medium text-lodha-grey">
                      Cooling Tower / Central AC
                    </label>
                    {hasCoolingTower && (
                      <input
                        type="number"
                        min="0"
                        value={coolingCapacity}
                        onChange={(e) => setCoolingCapacity(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="Cooling capacity (TR)"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {results ? (
              <>
                {/* Summary */}
                <div className="bg-gradient-to-br from-lodha-gold to-yellow-600 text-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">Total Water Demand</h2>
                  <div className="text-5xl font-bold mb-2">{results.total.toLocaleString()}</div>
                  <div className="text-lg opacity-90">liters per day</div>
                  <div className="mt-4 pt-4 border-t border-white/30">
                    <div className="text-sm opacity-90">Per Capita Consumption</div>
                    <div className="text-2xl font-bold">{results.perCapita} lpcd</div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Water Demand Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-lodha-grey">Total Occupancy</span>
                      <span className="font-semibold">{results.occupancy} persons</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-lodha-grey">Drinking Water</span>
                      <span className="font-semibold">{results.drinking.toLocaleString()} L/day</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <div className="flex flex-col">
                        <span className="text-lodha-grey">Flushing</span>
                        {projectType === 'residential' && (subType === 'luxury' || subType === 'hiEnd') && (
                          <span className="text-xs text-lodha-grey/70">
                            ({flushSystemType === 'tanks' ? 'Flush Tanks: 45 L/occupant/day' : 'Flush Valves: 75 L/occupant/day'})
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">{results.flushing.toLocaleString()} L/day</span>
                    </div>
                    {results.limitedHumanTouch > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-lodha-grey">Limited Human Touch</span>
                        <span className="font-semibold">{results.limitedHumanTouch.toLocaleString()} L/day</span>
                      </div>
                    )}
                    {results.mechanical > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-lodha-grey">Mechanical Cooling</span>
                        <span className="font-semibold">{results.mechanical.toLocaleString()} L/day</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-900">Required Storage</h3>
                  <div className="text-3xl font-bold text-blue-700 mb-2">{results.storageCapacity.toLocaleString()} L</div>
                  <p className="text-sm text-blue-600 mb-4">1 day supply + 20% buffer</p>
                  
                  {/* Tank Dimension Calculator */}
                  <div className="pt-4 border-t border-blue-300">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Tank Depth (meters)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10"
                      value={tankDepth}
                      onChange={(e) => setTankDepth(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Enter tank depth"
                    />
                    
                    {tankDepth > 0 && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-300">
                        <div className="text-sm text-blue-800 mb-1">Required Tank Area</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {((results.storageCapacity / 1000) / tankDepth).toFixed(2)} m²
                        </div>
                        <div className="text-xs text-blue-600 mt-2">
                          Volume: {(results.storageCapacity / 1000).toFixed(2)} m³ ÷ Depth: {tankDepth} m
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Approximate dimensions: {Math.sqrt((results.storageCapacity / 1000) / tankDepth).toFixed(2)} m × {Math.sqrt((results.storageCapacity / 1000) / tankDepth).toFixed(2)} m
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treatment Recommendations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Treatment Systems</h3>
                  <div className="space-y-4">
                    {results.treatments.map((treatment, index) => (
                      <div key={index} className="p-4 bg-lodha-sand/40 rounded-lg">
                        <div className="font-semibold text-lodha-black mb-1">{treatment.type}</div>
                        <div className="text-sm text-lodha-grey mb-2">{treatment.method}</div>
                        <div className="text-xs text-lodha-grey/70">
                          <div>Capacity: {treatment.capacity}</div>
                          <div>Usage: {treatment.usage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <Info className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to Calculate</h3>
                <p className="text-sm text-blue-700">
                  Fill in the project details and click "Calculate" to see the water demand analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
