import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Calculator, Download, Upload, FileText, AlertCircle, Filter, Droplet } from 'lucide-react';
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

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchBuildings();
      fetchCalculations();
      fetchStats();
    }
  }, [projectId]);

  useEffect(() => {
    applyFilters();
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
      const response = await apiFetch(`/api/design-calculations?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setCalculations(data);
      }
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
      'Draft': 'bg-gray-100 text-gray-800',
      'Under Review': 'bg-blue-100 text-blue-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Revised': 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const canCreateEdit = () => {
    if (!userLevel) {
      console.log('canCreateEdit: No userLevel yet');
      return false;
    }
    const effectiveLevel = getEffectiveUserLevel(userLevel, location.pathname);
    const canEdit = canCreateEditCalculations(effectiveLevel);
    console.log('canCreateEdit called:', { userLevel, path: location.pathname, effectiveLevel, canEdit });
    return canEdit;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/project-detail/${projectId}`)}
            className="flex items-center gap-2 text-lodha-gold hover:text-lodha-deep mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-garamond font-bold text-lodha-black mb-2">
                Design Calculations
              </h1>
              <p className="text-lodha-grey">{project?.name}</p>
              {userLevel === 'SUPER_ADMIN' && getEffectiveLevel() !== 'SUPER_ADMIN' && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
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
                className="flex items-center gap-2 bg-lodha-gold text-white px-6 py-2 rounded hover:bg-lodha-deep transition"
              >
                <Plus className="w-5 h-5" />
                Add Calculation
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow border border-lodha-sand">
              <div className="text-sm text-lodha-grey mb-1">Total Calculations</div>
              <div className="text-2xl font-bold text-lodha-black">{stats.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-lodha-sand">
              <div className="text-sm text-lodha-grey mb-1">Approved</div>
              <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-lodha-sand">
              <div className="text-sm text-lodha-grey mb-1">Under Review</div>
              <div className="text-2xl font-bold text-blue-600">{stats.underReview || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-lodha-sand">
              <div className="text-sm text-lodha-grey mb-1">Draft</div>
              <div className="text-2xl font-bold text-gray-600">{stats.draft || 0}</div>
            </div>
          </div>
        )}

        {/* Quick Calculators */}
        {canCreateEdit() && (
          <div className="bg-gradient-to-r from-lodha-sand to-white p-6 rounded-lg shadow mb-6 border-2 border-lodha-gold">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-6 h-6 text-lodha-gold" />
              <h3 className="font-garamond font-bold text-lodha-black text-lg">Quick Calculators</h3>
              <span className="text-sm text-lodha-grey ml-2">(Auto-calculate from project data)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/water-demand-calculation/${projectId}`)}
                className="flex items-center gap-3 p-4 bg-white border-2 border-lodha-gold rounded-lg hover:bg-lodha-sand transition group"
              >
                <Droplet className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black">Water Demand</div>
                  <div className="text-xs text-lodha-grey">Auto-calculate from buildings</div>
                </div>
              </button>
              
              <button
                onClick={() => alert('Electrical Load Calculator - Coming Soon!')}
                className="flex items-center gap-3 p-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition group opacity-60 cursor-not-allowed"
                disabled
              >
                <Calculator className="w-8 h-8 text-yellow-600 group-hover:scale-110 transition" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black">Electrical Load</div>
                  <div className="text-xs text-lodha-grey">Coming soon</div>
                </div>
              </button>

              <button
                onClick={() => alert('HVAC Load Calculator - Coming Soon!')}
                className="flex items-center gap-3 p-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition group opacity-60 cursor-not-allowed"
                disabled
              >
                <Calculator className="w-8 h-8 text-green-600 group-hover:scale-110 transition" />
                <div className="text-left">
                  <div className="font-semibold text-lodha-black">HVAC Load</div>
                  <div className="text-xs text-lodha-grey">Coming soon</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-lodha-sand">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-lodha-gold" />
            <h3 className="font-garamond font-bold text-lodha-black">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Calculation Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              >
                <option value="All">All Types</option>
                {calculationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
              >
                <option value="All">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-1">Building</label>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
        <div className="bg-white rounded-lg shadow border border-lodha-sand overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-lodha-grey">Loading calculations...</div>
          ) : filteredCalculations.length === 0 ? (
            <div className="p-8 text-center">
              <Calculator className="w-16 h-16 text-lodha-sand mx-auto mb-4" />
              <p className="text-lodha-grey">No calculations found. Click "Add Calculation" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-lodha-sand">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Building/Floor</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Calculated By</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Verified By</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">File</th>
                    <th className="px-4 py-3 text-left text-sm font-garamond font-bold text-lodha-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCalculations.map((calc) => (
                    <tr 
                      key={calc.id} 
                      className="hover:bg-lodha-sand transition cursor-pointer"
                      onClick={() => handleViewCalculation(calc)}
                    >
                      <td className="px-4 py-3 text-sm text-lodha-black">{calc.calculation_type}</td>
                      <td className="px-4 py-3 text-sm text-lodha-black font-medium">{calc.title}</td>
                      <td className="px-4 py-3 text-sm text-lodha-grey">
                        {calc.building_name || '-'} {calc.floor_name ? `/ ${calc.floor_name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-lodha-grey">{calc.calculated_by}</td>
                      <td className="px-4 py-3 text-sm text-lodha-grey">{calc.verified_by || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(calc.status)}`}>
                          {calc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {calc.file_url ? (
                          <button
                            onClick={() => handleDownload(calc.file_url, calc.file_name)}
                            className="text-lodha-gold hover:text-lodha-deep flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Download</span>
                          </button>
                        ) : (
                          <span className="text-sm text-lodha-grey">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewCalculation(calc)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </button>
                        {canCreateEdit() && (
                          <button
                            onClick={() => handleEdit(calc)}
                            className="text-lodha-gold hover:text-lodha-deep text-sm"
                          >
                            Edit
                          </button>
                        )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                      placeholder="e.g., Wing A - Ground Floor Electrical Load"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700 cursor-not-allowed"
                        placeholder="Auto-populated from logged-in user"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-populated from your account</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-lodha-grey mb-1">Verified By</label>
                      <input
                        type="text"
                        value={formData.verifiedBy}
                        onChange={(e) => setFormData({ ...formData, verifiedBy: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
                        placeholder="Checker/Approver name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-lodha-grey mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-lodha-gold"
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
