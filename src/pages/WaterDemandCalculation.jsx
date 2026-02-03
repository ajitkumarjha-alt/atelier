import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { ArrowLeft, Save, Calculator, Droplet, Users, Building2, Info } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

// Water consumption rates from MEP-21 Policy
const WATER_RATES = {
  residential: {
    luxury: { drinking: 165, flushing: 75, flushingValve: 45 },
    aspirational: { drinking: 110, flushing: 60 },
  },
  office: {
    excelus: { drinking: 20, flushing: 25 },
    supremus: { drinking: 20, flushing: 25 },
    iThink: { drinking: 20, flushing: 25 },
  },
  retail: {
    experia: { drinking: 25, visitor: 5, flushing: 20, visitorFlushing: 10 },
    boulevard: { drinking: 25, visitor: 5, flushing: 20, visitorFlushing: 10 },
  },
  multiplex: { perSeat: 5, flushing: 10 },
  school: { perHead: 25, flushing: 20 },
};

// Occupancy factors from Policy 25
const OCCUPANCY_FACTORS = {
  residential: {
    '1BHK': { luxury: 0, hiEnd: 0, aspirational: 4, casa: 4 },
    '2BHK': { luxury: 5, hiEnd: 5, aspirational: 4, casa: 4 },
    '3BHK': { luxury: 5, hiEnd: 5, aspirational: 5, casa: 5 },
    '4BHK': { luxury: 7, hiEnd: 7, aspirational: 6, casa: 0 },
  },
  office: {
    excelus: 7.0, // sqm per person
    supremus: 6.5,
    iThink: 5.5,
  },
  retail: {
    boulevard: { fullTime: 10, visitor: 7 }, // per sqm
    experia: { fullTime: 10, visitor: 5 },
  },
};

export default function WaterDemandCalculation() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);

  // Form state
  const [projectType, setProjectType] = useState('residential');
  const [subType, setSubType] = useState('luxury');
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

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

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

  const calculateOccupancy = () => {
    let totalOccupancy = 0;

    if (projectType === 'residential') {
      units.forEach(unit => {
        const factor = OCCUPANCY_FACTORS.residential[unit.type]?.[subType] || 0;
        totalOccupancy += unit.count * factor;
      });
    } else if (projectType === 'office') {
      const sqmPerPerson = OCCUPANCY_FACTORS.office[subType] || 6.5;
      totalOccupancy = totalArea / sqmPerPerson;
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
      flushing = occupancy * (rates.flushingValve || rates.flushing);
    } else if (projectType === 'office') {
      const rates = WATER_RATES.office[subType];
      drinking = occupancy * rates.drinking;
      flushing = occupancy * rates.flushing;
    } else if (projectType === 'retail') {
      const rates = WATER_RATES.retail[subType];
      const visitors = totalArea * (OCCUPANCY_FACTORS.retail[subType].visitor || 5);
      drinking = occupancy * rates.drinking + visitors * rates.visitor;
      flushing = occupancy * rates.flushing + visitors * rates.visitorFlushing;
    } else if (projectType === 'multiplex') {
      const seats = occupancy; // For multiplex, occupancy = seats
      drinking = 0; // Usually no drinking water in multiplex halls
      flushing = seats * WATER_RATES.multiplex.perSeat;
    } else if (projectType === 'school') {
      drinking = occupancy * WATER_RATES.school.perHead;
      flushing = occupancy * WATER_RATES.school.flushing;
    }

    // Pool water calculation (limited human touch)
    if (hasPool && poolArea > 0) {
      // Evaporation rate: 8mm/day, plus 5 ltrs per sqm of landscape
      const evaporation = poolArea * 8; // liters
      const makeupWater = poolArea * 5; // liters for pool maintenance
      limitedHumanTouch += evaporation + makeupWater;
    }

    // Landscape water calculation (limited human touch)
    if (hasLandscape && landscapeArea > 0) {
      limitedHumanTouch += landscapeArea * 5; // 5 ltrs per sqm
    }

    // Cooling tower water (mechanical cooling)
    if (hasCoolingTower && coolingCapacity > 0) {
      mechanical = coolingCapacity * 10; // 10 ltr/hr/TR
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
          units,
          totalArea,
          hasPool,
          poolArea,
          hasLandscape,
          landscapeArea,
          hasCoolingTower,
          coolingCapacity,
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
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold font-garamond text-gray-900">
                Water Demand Calculation
              </h1>
              <p className="text-gray-600 mt-1">
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
            {/* Project Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-lodha-gold" />
                Project Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => {
                      setProjectType(e.target.value);
                      setSubType('');
                      setUnits([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  >
                    <option value="residential">Residential</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="multiplex">Multiplex</option>
                    <option value="school">School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Type / Category
                  </label>
                  {projectType === 'residential' && (
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    >
                      <option value="luxury">Luxury</option>
                      <option value="aspirational">Aspirational</option>
                    </select>
                  )}
                  {projectType === 'office' && (
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  )}
                </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Type
                        </label>
                        <select
                          value={unit.type}
                          onChange={(e) => updateUnit(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        >
                          <option value="1BHK">1 BHK</option>
                          <option value="2BHK">2 BHK</option>
                          <option value="3BHK">3 BHK</option>
                          <option value="4BHK">4 BHK</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Units
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={unit.count}
                          onChange={(e) => updateUnit(index, 'count', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-lodha-gold hover:text-lodha-gold transition-colors"
                  >
                    + Add Unit Type
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Area (sqm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalArea}
                    onChange={(e) => setTotalArea(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                    <label htmlFor="hasPool" className="font-medium text-gray-700">
                      Swimming Pool / Water Body
                    </label>
                    {hasPool && (
                      <input
                        type="number"
                        min="0"
                        value={poolArea}
                        onChange={(e) => setPoolArea(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                    <label htmlFor="hasLandscape" className="font-medium text-gray-700">
                      Landscape Area
                    </label>
                    {hasLandscape && (
                      <input
                        type="number"
                        min="0"
                        value={landscapeArea}
                        onChange={(e) => setLandscapeArea(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                    <label htmlFor="hasCoolingTower" className="font-medium text-gray-700">
                      Cooling Tower / Central AC
                    </label>
                    {hasCoolingTower && (
                      <input
                        type="number"
                        min="0"
                        value={coolingCapacity}
                        onChange={(e) => setCoolingCapacity(parseFloat(e.target.value) || 0)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
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
                      <span className="text-gray-600">Total Occupancy</span>
                      <span className="font-semibold">{results.occupancy} persons</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-gray-600">Drinking Water</span>
                      <span className="font-semibold">{results.drinking.toLocaleString()} L/day</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-gray-600">Flushing</span>
                      <span className="font-semibold">{results.flushing.toLocaleString()} L/day</span>
                    </div>
                    {results.limitedHumanTouch > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-gray-600">Limited Human Touch</span>
                        <span className="font-semibold">{results.limitedHumanTouch.toLocaleString()} L/day</span>
                      </div>
                    )}
                    {results.mechanical > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-gray-600">Mechanical Cooling</span>
                        <span className="font-semibold">{results.mechanical.toLocaleString()} L/day</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 text-blue-900">Required Storage</h3>
                  <div className="text-3xl font-bold text-blue-700">{results.storageCapacity.toLocaleString()} L</div>
                  <p className="text-sm text-blue-600 mt-2">1 day supply + 20% buffer</p>
                </div>

                {/* Treatment Recommendations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Treatment Systems</h3>
                  <div className="space-y-4">
                    {results.treatments.map((treatment, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900 mb-1">{treatment.type}</div>
                        <div className="text-sm text-gray-600 mb-2">{treatment.method}</div>
                        <div className="text-xs text-gray-500">
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
