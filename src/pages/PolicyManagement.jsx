import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PolicyCreationWizard from '../components/PolicyCreationWizard';
import { apiFetch } from '../lib/api';
import { 
  FileText, Plus, Check, Archive, Eye, Edit, Upload, 
  Database, TrendingUp, Settings, AlertCircle, CheckCircle2
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

export default function PolicyManagement() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // list, view, edit, upload
  const [userLevel, setUserLevel] = useState(null);
  const [showCreationWizard, setShowCreationWizard] = useState(false);

  useEffect(() => {
    fetchPolicies();
    checkUserLevel();
  }, []);

  const checkUserLevel = () => {
    const level = localStorage.getItem('userLevel');
    setUserLevel(level);
  };

  const fetchPolicies = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const response = await apiFetch('/api/policy-versions', {
        headers: { 'x-dev-user-email': userEmail }
      });
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      showError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const viewPolicy = async (policyId) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const response = await apiFetch(`/api/policy-versions/${policyId}`, {
        headers: { 'x-dev-user-email': userEmail}
      });
      const data = await response.json();
      setSelectedPolicy(data);
      setActiveTab('view');
    } catch (error) {
      showError('Failed to load policy details');
    }
  };

  const activatePolicy = async (policyId) => {
    if (!['SUPER_ADMIN', 'L0', 'L1'].includes(userLevel)) {
      showError('Only L0 and L1 can activate policies');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to activate this policy? It will become the default for all new calculations.'
    );

    if (!confirmed) return;

    const toastId = showLoading('Activating policy...');
    try {
      const userEmail = localStorage.getItem('userEmail');
      await apiFetch(`/api/policy-versions/${policyId}/activate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-dev-user-email': userEmail 
        },
        body: JSON.stringify({ approved_by: userEmail })
      });

      dismissToast(toastId);
      showSuccess('Policy activated successfully');
      fetchPolicies();
    } catch (error) {
      dismissToast(toastId);
      showError('Failed to activate policy');
    }
  };

  const archivePolicy = async (policyId) => {
    if (!['SUPER_ADMIN', 'L0', 'L1'].includes(userLevel)) {
      showError('Only L0 and L1 can archive policies');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to archive this policy? It will no longer be available for new calculations.'
    );

    if (!confirmed) return;

    const toastId = showLoading('Archiving policy...');
    try {
      const userEmail = localStorage.getItem('userEmail');
      await apiFetch(`/api/policy-versions/${policyId}/archive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-dev-user-email': userEmail 
        },
        body: JSON.stringify({ archived_by: userEmail })
      });

      dismissToast(toastId);
      showSuccess('Policy archived successfully');
      fetchPolicies();
    } catch (error) {
      dismissToast(toastId);
      showError('Failed to archive policy');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      archived: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const statusIcons = {
      active: <CheckCircle2 className="w-3 h-3" />,
      draft: <AlertCircle className="w-3 h-3" />,
      archived: <Archive className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[status]}`}>
        {statusIcons[status]}
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Loading policies...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Policy Management</h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Manage calculation parameters, water consumption rates, and occupancy factors
              </p>
            </div>
            {['SUPER_ADMIN', 'L0', 'L1', 'L2'].includes(userLevel) && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCreationWizard(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Create New Policy
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
                >
                  <Upload className="w-4 h-4 md:w-5 md:h-5" />
                  Upload PDF (AI)
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total Policies</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{policies.length}</p>
                </div>
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Active Policies</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">
                    {policies.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Draft Policies</p>
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">
                    {policies.filter(p => p.status === 'draft').length}
                  </p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Archived</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-600">
                    {policies.filter(p => p.status === 'archived').length}
                  </p>
                </div>
                <Archive className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow w-full overflow-hidden">
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold">Policy Versions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parameters
                    </th>
                    <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-start">
                          <div className="min-w-0">
                            <div className="text-xs md:text-sm font-medium text-gray-900 break-words">
                              {policy.name}
                              {policy.is_default && (
                                <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">Rev {policy.revision_number}</div>
                            {/* Show on mobile what's hidden */}
                            <div className="md:hidden mt-1 space-y-1">
                              <div className="text-xs text-gray-500">{policy.policy_number}</div>
                              <div className="text-xs text-gray-500">{new Date(policy.effective_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500">
                        {policy.policy_number}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                        {new Date(policy.effective_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {getStatusBadge(policy.status)}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">💧 {policy.water_rates_count} rates</span>
                          <span className="text-xs">👥 {policy.occupancy_factors_count} factors</span>
                          <span className="text-xs">⚙️ {policy.calc_params_count} params</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-sm font-medium">
                        <div className="flex items-center gap-1 md:gap-2">
                          <button
                            onClick={() => viewPolicy(policy.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {policy.status === 'draft' && ['SUPER_ADMIN', 'L0', 'L1'].includes(userLevel) && (
                            <button
                              onClick={() => activatePolicy(policy.id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Activate"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {policy.status === 'active' && !policy.is_default && ['SUPER_ADMIN', 'L0', 'L1'].includes(userLevel) && (
                            <button
                              onClick={() => archivePolicy(policy.id)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'view' && selectedPolicy && (
          <div className="bg-white rounded-lg shadow w-full overflow-hidden">
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg md:text-xl font-semibold break-words">{selectedPolicy.name}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-1 break-words">{selectedPolicy.description}</p>
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="px-3 md:px-4 py-2 text-sm md:text-base text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                ← Back
              </button>
            </div>

            <div className="p-3 md:p-6 space-y-4 md:space-y-6">
              {/* Policy Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Policy Number</p>
                  <p className="text-sm md:text-base font-medium break-words">{selectedPolicy.policy_number}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Revision</p>
                  <p className="text-sm md:text-base font-medium">{selectedPolicy.revision_number}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Effective Date</p>
                  <p className="text-sm md:text-base font-medium">{new Date(selectedPolicy.effective_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPolicy.status)}</div>
                </div>
              </div>

              {/* Water Consumption Rates */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  Water Consumption Rates
                </h3>
                <div className="overflow-x-auto -mx-3 md:mx-0">
                  <table className="w-full text-xs md:text-sm min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 md:px-4 py-2 text-left">Project Type</th>
                        <th className="px-2 md:px-4 py-2 text-left">Sub Type</th>
                        <th className="px-2 md:px-4 py-2 text-left">Category</th>
                        <th className="px-2 md:px-4 py-2 text-right">Rate</th>
                        <th className="hidden sm:table-cell px-2 md:px-4 py-2 text-left">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPolicy.water_rates?.map((rate, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 md:px-4 py-2">{rate.project_type}</td>
                          <td className="px-2 md:px-4 py-2">{rate.sub_type}</td>
                          <td className="px-2 md:px-4 py-2">{rate.usage_category}</td>
                          <td className="px-2 md:px-4 py-2 text-right font-medium">{rate.rate_value}</td>
                          <td className="hidden sm:table-cell px-2 md:px-4 py-2 text-gray-600">{rate.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Occupancy Factors */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                  Occupancy Factors
                </h3>
                <div className="overflow-x-auto -mx-3 md:mx-0">
                  <table className="w-full text-xs md:text-sm min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 md:px-4 py-2 text-left">Project</th>
                        <th className="px-2 md:px-4 py-2 text-left">Sub Type</th>
                        <th className="hidden sm:table-cell px-2 md:px-4 py-2 text-left">Unit Type</th>
                        <th className="px-2 md:px-4 py-2 text-left">Factor Type</th>
                        <th className="px-2 md:px-4 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPolicy.occupancy_factors?.map((factor, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 md:px-4 py-2">{factor.project_type}</td>
                          <td className="px-2 md:px-4 py-2">{factor.sub_type}</td>
                          <td className="hidden sm:table-cell px-2 md:px-4 py-2">{factor.unit_type || '-'}</td>
                          <td className="px-2 md:px-4 py-2">{factor.factor_type}</td>
                          <td className="px-2 md:px-4 py-2 text-right font-medium">{factor.factor_value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Parameters */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                  Calculation Parameters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {selectedPolicy.calculation_parameters?.map((param, idx) => (
                    <div key={idx} className="border rounded-lg p-3 md:p-4">
                      <p className="text-xs md:text-sm font-medium text-gray-900 break-words">{param.parameter_name}</p>
                      <p className="text-xl md:text-2xl font-bold text-lodha-gold mt-1">
                        {param.parameter_value} <span className="text-xs md:text-sm text-gray-600">{param.unit}</span>
                      </p>
                      {param.description && (
                        <p className="text-xs md:text-sm text-gray-600 mt-2 break-words">{param.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 w-full">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Upload New Policy Document</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
              Upload a policy PDF document. Our AI will extract water consumption rates, occupancy factors, and calculation parameters for your review.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center">
              <Upload className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-600 mb-2">Drag and drop a PDF file here, or click to browse</p>
              <p className="text-xs md:text-sm text-gray-500">Coming soon: AI-powered policy extraction</p>
            </div>
          </div>
        )}
      </div>

      {/* Policy Creation Wizard Modal */}
      {showCreationWizard && (
        <PolicyCreationWizard
          onClose={() => setShowCreationWizard(false)}
          onPolicyCreated={() => {
            setShowCreationWizard(false);
            fetchPolicies();
          }}
        />
      )}
    </Layout>
  );
}
