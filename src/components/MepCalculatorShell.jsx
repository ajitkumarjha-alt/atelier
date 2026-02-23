import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Save, RotateCcw, Download, CheckCircle, Loader2 } from 'lucide-react';
import Layout from './Layout';
import { apiFetch } from '../lib/api';
import { showSuccess, showError } from '../utils/toast';

/**
 * MepCalculatorShell — reusable wrapper for all MEP calculator pages.
 *
 * Props:
 *   calculationType   – string key matching CALCULATOR_MAP (e.g. 'hvac_load')
 *   title             – display title (e.g. 'HVAC Load Calculation')
 *   icon              – Lucide icon component
 *   renderInputs(params, onChange, project)  – render input form fields
 *   renderResults(results, inputs)           – render results display
 *   defaultParams     – default input parameters object
 *   validateInputs(params) – optional, return error string or null
 */
export default function MepCalculatorShell({
  calculationType,
  title,
  icon: Icon = Calculator,
  renderInputs,
  renderResults,
  defaultParams = {},
  validateInputs,
}) {
  const { projectId, calculationId } = useParams();
  const navigate = useNavigate();
  const isNew = !calculationId || calculationId === 'new';

  const [step, setStep] = useState(isNew ? 'input' : 'loading'); // input | calculating | results | loading
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);

  const [params, setParams] = useState({ ...defaultParams });
  const [results, setResults] = useState(null);
  const [calcName, setCalcName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savedId, setSavedId] = useState(calculationId && calculationId !== 'new' ? parseInt(calculationId) : null);

  // Fetch project info
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/projects/${projectId}`);
        if (res.ok) setProject(await res.json());
      } catch (e) { /* ignore */ }
    })();
  }, [projectId]);

  // Load existing calculation
  useEffect(() => {
    if (!isNew && calculationId) {
      loadCalculation(calculationId);
    }
  }, [calculationId]);

  const loadCalculation = async (id) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/mep-calculations/${id}`);
      if (!res.ok) throw new Error('Failed to load calculation');
      const data = await res.json();
      setParams(typeof data.input_parameters === 'string' ? JSON.parse(data.input_parameters) : data.input_parameters);
      setResults(typeof data.results === 'string' ? JSON.parse(data.results) : data.results);
      setCalcName(data.calculation_name || '');
      setRemarks(data.remarks || '');
      setSavedId(data.id);
      setStep('results');
    } catch (e) {
      showError('Failed to load calculation');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCalculate = async () => {
    if (validateInputs) {
      const err = validateInputs(params);
      if (err) return showError(err);
    }
    if (!calcName.trim()) return showError('Please enter a calculation name');

    try {
      setStep('calculating');
      setLoading(true);

      const body = {
        projectId: parseInt(projectId),
        calculationType,
        calculationName: calcName,
        inputParameters: params,
        remarks,
      };

      let res;
      if (savedId) {
        // Update existing
        res = await apiFetch(`/api/mep-calculations/${savedId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        // Create new
        res = await apiFetch('/api/mep-calculations', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Calculation failed');
      }

      const data = await res.json();
      const calcResults = typeof data.results === 'string' ? JSON.parse(data.results) : data.results;
      setResults(calcResults);
      setSavedId(data.id);
      setStep('results');
      showSuccess('Calculation completed successfully');

      // Update URL if new
      if (!savedId && data.id) {
        navigate(`/projects/${projectId}/calculations/${routeSegment(calculationType)}/${data.id}`, { replace: true });
      }
    } catch (e) {
      showError(e.message || 'Calculation failed');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({ ...defaultParams });
    setResults(null);
    setSavedId(null);
    setCalcName('');
    setRemarks('');
    setStep('input');
  };

  const handleExportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify({ inputs: params, results }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${calcName || calculationType}_${savedId || 'draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/projects/${projectId}/design-calculations`)}
              className="p-2 hover:bg-lodha-sand rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <Icon className="w-6 h-6 text-lodha-primary" />
              <div>
                <h1 className="heading-primary">{title}</h1>
                <p className="text-sm text-lodha-grey/70 mt-1">
                  {project?.name || `Project ${projectId}`} &middot; {savedId ? `#${savedId}` : 'New'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {results && (
              <button onClick={handleExportJSON} className="btn-secondary flex items-center space-x-2 text-sm">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
            {step === 'results' && (
              <button onClick={() => setStep('input')} className="btn-secondary flex items-center space-x-2 text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>Edit Inputs</span>
              </button>
            )}
          </div>
        </div>

        {/* Calculation Name & Remarks */}
        {step === 'input' && (
          <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-lodha-grey mb-1">Calculation Name *</label>
                <input
                  type="text"
                  value={calcName}
                  onChange={(e) => setCalcName(e.target.value)}
                  placeholder={`${title} - Rev 01`}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lodha-grey mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        {step === 'input' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-6 mb-6">
              {renderInputs(params, handleChange, project)}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="btn-primary flex items-center space-x-2 px-6 py-3 text-base"
              >
                <Calculator className="w-5 h-5" />
                <span>{savedId ? 'Recalculate & Save' : 'Calculate & Save'}</span>
              </button>
            </div>
          </>
        )}

        {/* Loading */}
        {step === 'calculating' && (
          <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-12 text-center">
            <Loader2 className="w-12 h-12 text-lodha-primary animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-lodha-grey">Running calculation...</p>
            <p className="text-sm text-lodha-grey/60 mt-1">This may take a moment for complex systems</p>
          </div>
        )}

        {step === 'loading' && (
          <div className="bg-white rounded-xl shadow-sm border border-lodha-sand p-12 text-center">
            <Loader2 className="w-12 h-12 text-lodha-primary animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-lodha-grey">Loading calculation...</p>
          </div>
        )}

        {/* Results */}
        {step === 'results' && results && (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Calculation completed — {calcName}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Saved as #{savedId} &middot; {calculationType.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
            </div>
            {renderResults(results, params)}
          </div>
        )}
      </div>
    </Layout>
  );
}

/**
 * Reusable input field components for calculator forms
 */
export function CalcFieldGroup({ label, children, className = '' }) {
  return (
    <div className={className}>
      <h3 className="text-base font-semibold text-lodha-grey mb-4 flex items-center space-x-2">
        <span>{label}</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

export function CalcField({ label, value, onChange, type = 'text', options, unit, placeholder, helpText, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-lodha-grey mb-1">
        {label} {unit && <span className="text-lodha-grey/50">({unit})</span>} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="input-field w-full"
        >
          {options.map(opt => (
            <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          className="input-field w-full"
        />
      )}
      {helpText && <p className="text-xs text-lodha-grey/50 mt-1">{helpText}</p>}
    </div>
  );
}

export function ResultCard({ title, value, unit, icon: CardIcon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center space-x-2 mb-1">
        {CardIcon && <CardIcon className="w-4 h-4 opacity-60" />}
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{title}</span>
      </div>
      <p className="text-2xl font-bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export function ResultTable({ title, headers, rows, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-lodha-sand overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-lodha-sand">
          <h3 className="text-base font-semibold text-lodha-grey">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-lodha-sand">
          <thead className="bg-lodha-sand/30">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-lodha-grey uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-lodha-sand/50">
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-lodha-sand/10'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-sm text-lodha-grey whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Convert calculation_type to route segment
 */
function routeSegment(calcType) {
  const map = {
    hvac_load: 'hvac-load',
    fire_pump: 'fire-pump',
    cable_selection: 'cable-selection',
    lighting_design: 'lighting-load',
    earthing_lightning: 'earthing-lightning',
    phe_pump: 'phe-pump-selection',
    plumbing_fixture: 'plumbing-fixture',
    ventilation: 'ventilation-pressurisation',
    duct_sizing: 'duct-sizing',
    panel_schedule: 'panel-schedule',
    rising_main: 'rising-main',
    fire_fighting: 'fire-fighting-system-design',
  };
  return map[calcType] || calcType;
}
