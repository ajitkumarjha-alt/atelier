import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Calculator, Download, Upload, FileText, AlertCircle, Filter, Droplet, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { useUser } from '../lib/UserContext';
import { getEffectiveUserLevel, canCreateEditCalculations } from '../lib/userLevel';

export default function DesignCalculations() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userLevel } = useUser();
  const [calculations, setCalculations] = useState([]);
  const [filteredCalculations, setFilteredCalculations] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCalculation, setEditingCalculation] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [buildingFilter, setBuildingFilter] = useState('All');
  const [buildings, setBuildings] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    calculationType: 'Electrical Load Calculation',
    building_id: '',
    floor_id: '',
    title: '',
    description: '',
    calculatedBy: '',
    verifiedBy: '',
    status: 'Draft',
    remarks: '',
    calculationFile: null,
  });

  const calculationTypes = [
    'Electrical Load Calculation',
    'Water Demand Calculation',
    'Cable Selection Sheet',
    'Rising Main Design',
    'Down Take Design',
    'Bus Riser Design',
    'Lighting Load Calculation',
    'HVAC Load Calculation',
    'Fire Pump Calculation',
    'Plumbing Fixture Calculation',
    'Earthing & Lightning Calculation',
    'Panel Schedule',
    'Other'
  ];

  const statuses = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Revised'];

  // Debounced fetch for project data
  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      Promise.all([
        apiFetch(`/api/projects/${projectId}`),
        apiFetch(`/api/projects/${projectId}/buildings`),
        apiFetch(`/api/design-calculations?projectId=${projectId}`),
        apiFetch(`/api/water-demand-calculations?projectId=${projectId}`),
        apiFetch(`/api/design-calculations/stats/${projectId}`)
      ]).then(async ([projectRes, buildingsRes, designCalcsRes, waterDemandRes, statsRes]) => {
        if (!isMounted) return;
        if (projectRes.ok) setProject(await projectRes.json());
        if (buildingsRes.ok) setBuildings(await buildingsRes.json());
        let allCalculations = [];
        if (designCalcsRes.ok) allCalculations = [...await designCalcsRes.json()];
        if (waterDemandRes.ok) {
          const waterDemandCalcs = await waterDemandRes.json();
          const normalizedWaterCalcs = waterDemandCalcs.map(calc => ({
            ...calc,
            calculation_type: 'Water Demand Calculation',
            title: calc.calculation_name,
            created_at: calc.created_at,
            building_name: null,
            floor_name: null
          }));
          allCalculations = [...allCalculations, ...normalizedWaterCalcs];
        }
        allCalculations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setCalculations(allCalculations);
        if (statsRes.ok) setStats(await statsRes.json());
        setLoading(false);
      }).catch(() => setLoading(false));
    }
    return () => { isMounted = false; };
  }, [projectId]);

  // Only apply filters when calculations or filter values change
  useEffect(() => {
    setFilteredCalculations(() => {
      let filtered = [...calculations];
      if (typeFilter !== 'All') filtered = filtered.filter(calc => calc.calculation_type === typeFilter);
      if (statusFilter !== 'All') filtered = filtered.filter(calc => calc.status === statusFilter);
      if (buildingFilter !== 'All') filtered = filtered.filter(calc => calc.building_id === parseInt(buildingFilter));
      return filtered;
    });
  }, [calculations, typeFilter, statusFilter, buildingFilter]);

  const fetchProjectDetails = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}/buildings`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      
      // Fetch both design calculations and water demand calculations
      const [designCalcsResponse, waterDemandResponse] = await Promise.all([
        apiFetch(`/api/design-calculations?projectId=${projectId}`),
        apiFetch(`/api/water-demand-calculations?projectId=${projectId}`)
      ]);
      
      let allCalculations = [];
      
      // Add design calculations
      if (designCalcsResponse.ok) {
        const designCalcs = await designCalcsResponse.json();
        allCalculations = [...designCalcs];
      }
      
      // Add water demand calculations with normalized structure
      if (waterDemandResponse.ok) {
        const waterDemandCalcs = await waterDemandResponse.json();
        const normalizedWaterCalcs = waterDemandCalcs.map(calc => ({
          ...calc,
          calculation_type: 'Water Demand Calculation',
          title: calc.calculation_name,
          created_at: calc.created_at,
          building_name: null, // Water demand calcs can span multiple buildings
          floor_name: null
        }));
        allCalculations = [...allCalculations, ...normalizedWaterCalcs];
      }
      
      // Sort by created_at descending
      allCalculations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setCalculations(allCalculations);
    } catch (error) {
      console.error('Error fetching calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch(`/api/design-calculations/stats/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...calculations];

    if (typeFilter !== 'All') {
      filtered = filtered.filter(calc => calc.calculation_type === typeFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(calc => calc.status === statusFilter);
    }

    if (buildingFilter !== 'All') {
      filtered = filtered.filter(calc => calc.building_id === parseInt(buildingFilter));
    }

    setFilteredCalculations(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('projectId', projectId);
      formDataToSend.append('calculationType', formData.calculationType);
      formDataToSend.append('building_id', formData.building_id || '');
      formDataToSend.append('floor_id', formData.floor_id || '');
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('calculatedBy', formData.calculatedBy);
      formDataToSend.append('verifiedBy', formData.verifiedBy || '');
      formDataToSend.append('status', formData.status);
      formDataToSend.append('remarks', formData.remarks || '');
      
      if (formData.calculationFile) {
        formDataToSend.append('calculationFile', formData.calculationFile);
      }

      const url = editingCalculation 
        ? `/api/design-calculations/${editingCalculation.id}`
        : '/api/design-calculations';
      
      const method = editingCalculation ? 'PATCH' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: formDataToSend,
        headers: {} // Let browser set Content-Type for FormData
      });

      if (response.ok) {
        alert(editingCalculation ? 'Calculation updated successfully!' : 'Calculation created successfully!');
        setShowCreateModal(false);
        setEditingCalculation(null);
        resetForm();
        fetchCalculations();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to save calculation'}`);
      }
    } catch (error) {
      console.error('Error saving calculation:', error);
      alert('Error saving calculation. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      calculationType: 'Electrical Load Calculation',
      building_id: '',
      floor_id: '',
      title: '',
      description: '',
      calculatedBy: user?.displayName || user?.email || '',
      verifiedBy: '',
      status: 'Draft',
      remarks: '',
      calculationFile: null,
    });
  };

  const handleEdit = (calculation) => {
    setEditingCalculation(calculation);
    setFormData({
      calculationType: calculation.calculation_type,
      building_id: calculation.building_id || '',
      floor_id: calculation.floor_id || '',
      title: calculation.title,
      description: calculation.description || '',
      calculatedBy: calculation.calculated_by,
      verifiedBy: calculation.verified_by || '',
      status: calculation.status,
      remarks: calculation.remarks || '',
      calculationFile: null,
    });
    setShowCreateModal(true);
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-lodha-steel/20 text-lodha-grey',
      'Under Review': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'Rejected': 'bg-red-50 text-red-700 border border-red-200',
      'Revised': 'bg-amber-50 text-amber-700 border border-amber-200',
    };
    return colors[status] || 'bg-lodha-steel/20 text-lodha-grey';
  };

  const getCalculationUrlSlug = (calculationType) => {
    const slugMap = {
      'Electrical Load Calculation': 'electrical-load',
      'Water Demand Calculation': 'water-demand',
      'Cable Selection Sheet': 'cable-selection',
      'Rising Main Design': 'rising-main',
      'Down Take Design': 'down-take',
      'Bus Riser Design': 'bus-riser',
      'Lighting Load Calculation': 'lighting-load',
      'HVAC Load Calculation': 'hvac-load',
      'Fire Pump Calculation': 'fire-pump',
      'Plumbing Fixture Calculation': 'plumbing-fixture',
      'Earthing & Lightning Calculation': 'earthing-lightning',
      'Panel Schedule': 'panel-schedule',
    };
    return slugMap[calculationType] || 'other';
  };

  const handleViewCalculation = (calculation) => {
    const slug = getCalculationUrlSlug(calculation.calculation_type);
    navigate(`/projects/${projectId}/calculations/${slug}/${calculation.id}`);
  };

  const handleDelete = async (calculation, e) => {
    e.stopPropagation();
    
    // Check permissions - only L0, L1, L2, SUPER_ADMIN
    if (!['SUPER_ADMIN', 'L0', 'L1', 'L2'].includes(userLevel)) {
      alert('You do not have permission to delete calculations');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${calculation.title}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      // Use the appropriate endpoint based on calculation type
      const endpoint = calculation.calculation_type === 'Water Demand Calculation'
        ? `/api/water-demand-calculations/${calculation.id}`
        : `/api/design-calculations/${calculation.id}`;
      
      const response = await apiFetch(endpoint, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete calculation');
      }

      alert('Calculation deleted successfully');
      
      // Refresh the calculations list
      fetchCalculations();
    } catch (error) {
      console.error('Error deleting calculation:', error);
      alert('Failed to delete calculation: ' + error.message);
    }
  };

  // Memoize canCreateEdit to avoid repeated calls
  const canCreateEdit = () => {
    if (!userLevel) return false;
    const effectiveLevel = getEffectiveUserLevel(userLevel, location.pathname);
    return canCreateEditCalculations(effectiveLevel);
  };

  const getEffectiveLevel = () => {
    if (!userLevel) return null;
    return getEffectiveUserLevel(userLevel, location.pathname);
  };

  if (loading && !project) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lodha-black text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="flex items-center gap-2 text-lodha-gold hover:text-lodha-deep mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base">Back to Project</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="heading-primary">
                Design Calculations
              </h1>
              <p className="text-sm sm:text-base text-lodha-grey">{project?.name}</p>
              {userLevel === 'SUPER_ADMIN' && getEffectiveLevel() !== 'SUPER_ADMIN' && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  Testing as {getEffectiveLevel()} user
                </div>
              )}
            </div>
            {canCreateEdit() && (
              <button
                onClick={() => {
                  setEditingCalculation(null);
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 bg-lodha-gold text-white px-4 sm:px-6 py-2 rounded hover:bg-lodha-deep transition text-sm sm:text-base whitespace-nowrap"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Calculation
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
            <div className="stat-card">
              <div className="text-xs sm:text-sm text-lodha-grey font-jost mb-1">Total Calculations</div>
              <div className="stat-value">{stats.total || 0}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs sm:text-sm text-lodha-grey font-jost mb-1">Approved</div>
              <div className="text-2xl sm:text-3xl font-garamond font-bold text-emerald-600">{stats.approved || 0}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs sm:text-sm text-lodha-grey font-jost mb-1">Under Review</div>
              <div className="text-2xl sm:text-3xl font-garamond font-bold text-blue-600">{stats.underReview || 0}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs sm:text-sm text-lodha-grey font-jost mb-1">Draft</div>
              <div className="text-2xl sm:text-3xl font-garamond font-bold text-lodha-grey">{stats.draft || 0}</div>
            </div>
          </div>
        )}

        {/* Quick Calculators */}
        {canCreateEdit() && (
          <div className="section-card p-4 sm:p-6 mb-6 border-l-4 border-l-lodha-gold">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-lodha-gold" />
              <h3 className="font-garamond font-bold text-lodha-black text-base sm:text-lg">Quick Calculators & Design Links</h3>
              <span className="text-xs sm:text-sm text-lodha-grey ml-2 hidden sm:inline">(Auto-calculate from project data & access design pages)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => navigate(`/projects/${projectId}/calculations/water-demand/new`)}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-lodha-gold rounded-lg hover:bg-lodha-sand transition group"
              >
                <Droplet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">Water Demand</div>
                  <div className="text-xs text-lodha-grey">Auto-calculate from buildings</div>
                </div>
              </button>

              <button
                onClick={() => navigate(`/projects/${projectId}/calculations/electrical-load/new`)}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-lodha-gold rounded-lg hover:bg-lodha-sand transition group"
              >
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">Electrical Load</div>
                  <div className="text-xs text-lodha-grey">Auto-calculate from parameters</div>
                </div>
              </button>

              <button
                onClick={() => alert('HVAC Load Calculator - Coming Soon!')}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-lodha-steel/30 rounded-xl hover:bg-lodha-sand/40 hover:border-lodha-gold/30 transition-all group cursor-not-allowed opacity-60"
                disabled
              >
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">HVAC Load</div>
                  <div className="text-xs text-lodha-grey">Coming soon</div>
                </div>
              </button>

              {/* New Design Links */}
              <button
                onClick={() => navigate(`/projects/${projectId}/calculations/fire-fighting-system-design`)}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-red-500 rounded-lg hover:bg-red-100 transition group"
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">Fire Fighting System Design</div>
                  <div className="text-xs text-lodha-grey">View design page</div>
                </div>
              </button>

              <button
                onClick={() => navigate(`/projects/${projectId}/calculations/ventilation-pressurisation`)}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-blue-400 rounded-lg hover:bg-blue-100 transition group"
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">Ventilation & Pressurisation</div>
                  <div className="text-xs text-lodha-grey">View design page</div>
                </div>
              </button>

              <button
                onClick={() => navigate(`/projects/${projectId}/calculations/phe-pump-selection`)}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-green-500 rounded-lg hover:bg-green-100 transition group"
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 group-hover:scale-110 transition flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black text-sm sm:text-base">PHE Pump Selection</div>
                  <div className="text-xs text-lodha-grey">View design page</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="section-card p-3 sm:p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-lodha-gold" />
            <h3 className="font-garamond font-bold text-lodha-black text-sm sm:text-base">Filters</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-lodha-grey font-jost mb-1">Calculation Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="select-field w-full"
              >
                <option value="All">All Types</option>
                {calculationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey font-jost mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-field w-full"
              >
                <option value="All">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey font-jost mb-1">Building</label>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="select-field w-full"
              >
                <option value="All">All Buildings</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Calculations List */}
        <div className="section-card overflow-hidden -mx-2 sm:mx-0">
          {loading ? (
            <div className="empty-state">Loading calculations...</div>
          ) : filteredCalculations.length === 0 ? (
            <div className="empty-state">
              <Calculator className="w-16 h-16 text-lodha-steel mx-auto mb-4" />
              <p className="text-lodha-grey text-sm sm:text-base">No calculations found. Click "Add Calculation" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap">Title</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Building/Floor</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Calculated By</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">Verified By</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">File</th>
                    <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-jost font-semibold text-lodha-grey uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lodha-steel/15">
                  {filteredCalculations.map((calc) => (
                    <tr 
                      key={calc.id} 
                      className="table-row cursor-pointer"
                      onClick={() => handleViewCalculation(calc)}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-lodha-black">{calc.calculation_type}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-lodha-black font-medium">{calc.title}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-lodha-grey hidden lg:table-cell">
                        {calc.building_name || '-'} {calc.floor_name ? `/ ${calc.floor_name}` : ''}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-lodha-grey hidden md:table-cell">{calc.calculated_by}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-lodha-grey hidden xl:table-cell">{calc.verified_by || '-'}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusColor(calc.status)}`}>
                          {calc.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        {calc.file_url ? (
                          <button
                            onClick={() => handleDownload(calc.file_url, calc.file_name)}
                            className="text-lodha-gold hover:text-lodha-deep flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-xs sm:text-sm">Download</span>
                          </button>
                        ) : (
                          <span className="text-xs sm:text-sm text-lodha-grey">No file</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            onClick={() => handleViewCalculation(calc)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                          >
                            View
                          </button>
                          {canCreateEdit() && (
                            <button
                              onClick={() => handleEdit(calc)}
                              className="text-lodha-gold hover:text-lodha-deep text-xs sm:text-sm"
                            >
                              Edit
                            </button>
                          )}
                          {['SUPER_ADMIN', 'L0', 'L1', 'L2'].includes(userLevel) && (
                            <button
                              onClick={(e) => handleDelete(calc, e)}
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="p-6">
                <h2 className="text-2xl font-garamond font-bold text-lodha-black mb-6">
                  {editingCalculation ? 'Edit Calculation' : 'Add New Calculation'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey mb-1">
                        Calculation Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.calculationType}
                        onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
                        className="input-field"
                      >
                        {calculationTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-lodha-grey mb-1">Building (Optional)</label>
                      <select
                        value={formData.building_id}
                        onChange={(e) => setFormData({ ...formData, building_id: e.target.value, floor_id: '' })}
                        className="input-field"
                      >
                        <option value="">Select Building</option>
                        {buildings.map(building => (
                          <option key={building.id} value={building.id}>{building.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Wing A - Ground Floor Electrical Load"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="input-field"
                      placeholder="Brief description of the calculation"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey mb-1">
                        Calculated By <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.calculatedBy}
                        disabled
                        className="w-full px-3 py-2 border border-lodha-steel rounded bg-lodha-sand text-lodha-grey cursor-not-allowed"
                        placeholder="Auto-populated from logged-in user"
                      />
                      <p className="text-xs text-lodha-grey/70 mt-1">Auto-populated from your account</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-lodha-grey mb-1">Verified By</label>
                      <input
                        type="text"
                        value={formData.verifiedBy}
                        onChange={(e) => setFormData({ ...formData, verifiedBy: e.target.value })}
                        className="input-field"
                        placeholder="Checker/Approver name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows="2"
                      className="input-field"
                      placeholder="Any additional remarks"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">
                      Calculation File (Excel/PDF)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.pdf,.doc,.docx"
                      onChange={(e) => setFormData({ ...formData, calculationFile: e.target.files[0] })}
                      className="input-field"
                    />
                    {editingCalculation?.file_name && (
                      <p className="text-sm text-lodha-grey mt-1">
                        Current file: {editingCalculation.file_name}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingCalculation(null);
                        resetForm();
                      }}
                      className="px-4 py-2 text-lodha-grey hover:text-lodha-black transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-lodha-gold text-white rounded hover:bg-lodha-deep transition"
                    >
                      {editingCalculation ? 'Update' : 'Create'} Calculation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
