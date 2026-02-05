import { useState } from 'react';
import { FileText, Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

export default function PolicyCreationWizard({ onClose, onPolicyCreated }) {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Water Rates, 3: Occupancy, 4: Calc Params, 5: Review
  
  // Basic policy info
  const [policyName, setPolicyName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  // Water rates
  const [waterRates, setWaterRates] = useState([{
    project_type: 'residential',
    sub_type: 'luxury',
    usage_category: 'drinking',
    rate_value: '',
    unit: 'L/occupant/day',
    notes: ''
  }]);

  // Occupancy factors
  const [occupancyFactors, setOccupancyFactors] = useState([{
    project_type: 'residential',
    sub_type: 'luxury',
    unit_type: '2BHK',
    factor_type: 'occupants_per_unit',
    factor_value: '',
    unit: 'occupants',
    notes: ''
  }]);

  // Calculation parameters
  const [calcParams, setCalcParams] = useState([{
    parameter_name: 'pool_evaporation_rate',
    parameter_value: '',
    unit: 'mm/day',
    description: 'Pool evaporation rate'
  }]);

  const addWaterRate = () => {
    setWaterRates([...waterRates, {
      project_type: 'residential',
      sub_type: 'luxury',
      usage_category: 'drinking',
      rate_value: '',
      unit: 'L/occupant/day',
      notes: ''
    }]);
  };

  const updateWaterRate = (index, field, value) => {
    const updated = [...waterRates];
    updated[index][field] = value;
    setWaterRates(updated);
  };

  const removeWaterRate = (index) => {
    setWaterRates(waterRates.filter((_, i) => i !== index));
  };

  const addOccupancyFactor = () => {
    setOccupancyFactors([...occupancyFactors, {
      project_type: 'residential',
      sub_type: 'luxury',
      unit_type: '2BHK',
      factor_type: 'occupants_per_unit',
      factor_value: '',
      unit: 'occupants',
      notes: ''
    }]);
  };

  const updateOccupancyFactor = (index, field, value) => {
    const updated = [...occupancyFactors];
    updated[index][field] = value;
    setOccupancyFactors(updated);
  };

  const removeOccupancyFactor = (index) => {
    setOccupancyFactors(occupancyFactors.filter((_, i) => i !== index));
  };

  const addCalcParam = () => {
    setCalcParams([...calcParams, {
      parameter_name: '',
      parameter_value: '',
      unit: '',
      description: ''
    }]);
  };

  const updateCalcParam = (index, field, value) => {
    const updated = [...calcParams];
    updated[index][field] = value;
    setCalcParams(updated);
  };

  const removeCalcParam = (index) => {
    setCalcParams(calcParams.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!policyName || !policyNumber || !revisionNumber || !effectiveDate) {
        showError('Please fill in all required fields');
        return false;
      }
    } else if (step === 2) {
      if (waterRates.some(r => !r.rate_value)) {
        showError('Please fill in all water rate values');
        return false;
      }
    } else if (step === 3) {
      if (occupancyFactors.some(f => !f.factor_value)) {
        showError('Please fill in all occupancy factor values');
        return false;
      }
    } else if (step === 4) {
      if (calcParams.some(p => !p.parameter_name || !p.parameter_value)) {
        showError('Please fill in all calculation parameter fields');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSave = async () => {
    const toastId = showLoading('Creating policy...');

    try {
      const userEmail = localStorage.getItem('userEmail');
      
      // Create policy version
      const policyResponse = await apiFetch('/api/policy-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': userEmail
        },
        body: JSON.stringify({
          name: policyName,
          policy_number: policyNumber,
          revision_number: revisionNumber,
          effective_date: effectiveDate,
          document_url: documentUrl || null,
          description,
          created_by: userEmail
        })
      });

      if (!policyResponse.ok) throw new Error('Failed to create policy');
      const policy = await policyResponse.json();

      // Add water rates
      if (waterRates.length > 0) {
        await apiFetch(`/api/policy-versions/${policy.id}/water-rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-email': userEmail
          },
          body: JSON.stringify({ rates: waterRates })
        });
      }

      // Add occupancy factors
      if (occupancyFactors.length > 0) {
        await apiFetch(`/api/policy-versions/${policy.id}/occupancy-factors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-email': userEmail
          },
          body: JSON.stringify({ factors: occupancyFactors })
        });
      }

      // Add calculation parameters
      if (calcParams.length > 0) {
        await apiFetch(`/api/policy-versions/${policy.id}/calculation-parameters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-email': userEmail
          },
          body: JSON.stringify({ parameters: calcParams })
        });
      }

      dismissToast(toastId);
      showSuccess('Policy created successfully! It is now in draft status.');
      onPolicyCreated();
      onClose();
    } catch (error) {
      dismissToast(toastId);
      showError('Failed to create policy: ' + error.message);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['Basic Info', 'Water Rates', 'Occupancy', 'Calc Params', 'Review'];
    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((label, index) => (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > index + 1 ? 'bg-green-500 text-white' :
                step === index + 1 ? 'bg-lodha-gold text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {step > index + 1 ? '✓' : index + 1}
              </div>
              <span className="text-xs text-gray-600 mt-1">{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-lodha-gold" />
            Create New Policy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  placeholder="e.g., MEP-21 Water Policy + Policy 25 Occupancy Norms"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    placeholder="e.g., MEP-21"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Revision Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={revisionNumber}
                    onChange={(e) => setRevisionNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    placeholder="e.g., Rev 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document URL (optional)
                  </label>
                  <input
                    type="url"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  placeholder="Brief description of this policy version..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Creating a draft policy</p>
                  <p>This policy will be created in <strong>draft</strong> status. It must be activated by L0 or L1 to be used in calculations.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Water Rates */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Water Consumption Rates</h3>
                <button
                  onClick={addWaterRate}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Rate
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {waterRates.map((rate, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-gray-700">Rate #{index + 1}</span>
                      {waterRates.length > 1 && (
                        <button
                          onClick={() => removeWaterRate(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={rate.project_type}
                        onChange={(e) => updateWaterRate(index, 'project_type', e.target.value)}
                        className="px-2 py-1.5 text-sm border rounded"
                      >
                        <option value="residential">Residential</option>
                        <option value="office">Office</option>
                        <option value="retail">Retail</option>
                        <option value="multiplex">Multiplex</option>
                        <option value="school">School</option>
                      </select>
                      <input
                        type="text"
                        value={rate.sub_type}
                        onChange={(e) => updateWaterRate(index, 'sub_type', e.target.value)}
                        placeholder="Sub Type (e.g., luxury)"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={rate.usage_category}
                        onChange={(e) => updateWaterRate(index, 'usage_category', e.target.value)}
                        placeholder="Category (e.g., drinking)"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={rate.rate_value}
                        onChange={(e) => updateWaterRate(index, 'rate_value', e.target.value)}
                        placeholder="Rate Value"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={rate.unit}
                        onChange={(e) => updateWaterRate(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={rate.notes}
                        onChange={(e) => updateWaterRate(index, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Occupancy Factors */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Occupancy Factors</h3>
                <button
                  onClick={addOccupancyFactor}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Factor
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {occupancyFactors.map((factor, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-gray-700">Factor #{index + 1}</span>
                      {occupancyFactors.length > 1 && (
                        <button
                          onClick={() => removeOccupancyFactor(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={factor.project_type}
                        onChange={(e) => updateOccupancyFactor(index, 'project_type', e.target.value)}
                        className="px-2 py-1.5 text-sm border rounded"
                      >
                        <option value="residential">Residential</option>
                        <option value="office">Office</option>
                        <option value="retail">Retail</option>
                      </select>
                      <input
                        type="text"
                        value={factor.sub_type}
                        onChange={(e) => updateOccupancyFactor(index, 'sub_type', e.target.value)}
                        placeholder="Sub Type"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={factor.unit_type}
                        onChange={(e) => updateOccupancyFactor(index, 'unit_type', e.target.value)}
                        placeholder="Unit Type (e.g., 2BHK)"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <select
                        value={factor.factor_type}
                        onChange={(e) => updateOccupancyFactor(index, 'factor_type', e.target.value)}
                        className="px-2 py-1.5 text-sm border rounded"
                      >
                        <option value="occupants_per_unit">Occupants per Unit</option>
                        <option value="sqm_per_person">Sqm per Person</option>
                        <option value="visitor_sqm">Visitor Sqm</option>
                        <option value="peak_factor">Peak Factor</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={factor.factor_value}
                        onChange={(e) => updateOccupancyFactor(index, 'factor_value', e.target.value)}
                        placeholder="Factor Value"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={factor.unit}
                        onChange={(e) => updateOccupancyFactor(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Calculation Parameters */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Calculation Parameters</h3>
                <button
                  onClick={addCalcParam}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Parameter
                </button>
              </div>

              <div className="space-y-3">
                {calcParams.map((param, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm text-gray-700">Parameter #{index + 1}</span>
                      {calcParams.length > 1 && (
                        <button
                          onClick={() => removeCalcParam(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={param.parameter_name}
                        onChange={(e) => updateCalcParam(index, 'parameter_name', e.target.value)}
                        placeholder="Parameter Name"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={param.parameter_value}
                        onChange={(e) => updateCalcParam(index, 'parameter_value', e.target.value)}
                        placeholder="Value"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={param.unit}
                        onChange={(e) => updateCalcParam(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="px-2 py-1.5 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => updateCalcParam(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="px-2 py-1.5 text-sm border rounded col-span-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Review Your Policy</h3>
                <p className="text-sm text-yellow-800">
                  Please review all information before creating the policy. The policy will be created in <strong>draft</strong> status and must be activated by L0 or L1.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Policy Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{policyName}</span>
                    <span className="text-gray-600">Policy Number:</span>
                    <span className="font-medium">{policyNumber}</span>
                    <span className="text-gray-600">Revision:</span>
                    <span className="font-medium">{revisionNumber}</span>
                    <span className="text-gray-600">Effective Date:</span>
                    <span className="font-medium">{effectiveDate}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{waterRates.length}</p>
                  <p className="text-sm text-gray-600">Water Rates</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{occupancyFactors.length}</p>
                  <p className="text-sm text-gray-600">Occupancy Factors</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{calcParams.length}</p>
                  <p className="text-sm text-gray-600">Calc Parameters</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={step === 1 ? onClose : prevStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            {step === 1 ? 'Cancel' : '← Previous'}
          </button>
          <div className="flex gap-3">
            {step < 5 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-lodha-gold text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Create Policy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
