import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Database, Settings, ClipboardList, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { useUser } from '../lib/UserContext';
import ProjectStandardsManagement from './ProjectStandardsManagement';
import PolicyManagement from './PolicyManagement';
import StandardsManagement from './StandardsManagement';

const TABS = [
  { id: 'project', label: 'Project Standards', icon: ClipboardList },
  { id: 'system', label: 'System Configuration', icon: Settings },
  { id: 'policy', label: 'Policy Management', icon: Database },
  { id: 'reference', label: 'Reference Standards', icon: BookOpen }
];

function ProjectStandardsSection({ canEdit }) {
  const [projects, setProjects] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selection, setSelection] = useState({
    electricalGuideline: '',
    policyVersionId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProject = useMemo(() => {
    return projects.find(p => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  const recommendedGuideline = useMemo(() => {
    if (!selectedProject?.state || guidelines.length === 0) return null;
    const state = selectedProject.state.toLowerCase();
    return guidelines.find(g => g.toLowerCase().includes(state)) || null;
  }, [selectedProject, guidelines]);

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoading(true);
        const [projectsRes, guidelinesRes, policiesRes] = await Promise.all([
          apiFetch('/api/projects'),
          apiFetch('/api/electrical-load-factors/guidelines/list'),
          apiFetch('/api/policy-versions?status=active')
        ]);

        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        const guidelinesData = guidelinesRes.ok ? await guidelinesRes.json() : [];
        const policiesData = policiesRes.ok ? await policiesRes.json() : [];

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setGuidelines(Array.isArray(guidelinesData) ? guidelinesData : []);
        setPolicies(Array.isArray(policiesData) ? policiesData : []);

        if (projectsData.length > 0) {
          setSelectedProjectId(String(projectsData[0].id));
        }
      } catch (err) {
        setError('Failed to load standards data');
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
  }, []);

  useEffect(() => {
    const fetchSelections = async () => {
      if (!selectedProjectId) return;
      try {
        setMessage('');
        const response = await apiFetch(`/api/projects/${selectedProjectId}/standard-selections`);
        const selections = response.ok ? await response.json() : [];
        const guidelineSelection = selections.find(s => s.standard_key === 'electrical_load_guideline');
        const policySelection = selections.find(s => s.standard_key === 'phe_policy_version');

        setSelection({
          electricalGuideline: guidelineSelection?.standard_value || '',
          policyVersionId: policySelection?.standard_ref_id ? String(policySelection.standard_ref_id) : ''
        });
      } catch (err) {
        setError('Failed to load project selections');
      }
    };

    fetchSelections();
  }, [selectedProjectId]);

  const handleSave = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const selections = [
        {
          standard_key: 'electrical_load_guideline',
          standard_value: selection.electricalGuideline || null,
          is_active: Boolean(selection.electricalGuideline)
        },
        {
          standard_key: 'phe_policy_version',
          standard_ref_id: selection.policyVersionId ? parseInt(selection.policyVersionId, 10) : null,
          is_active: Boolean(selection.policyVersionId)
        }
      ];

      const response = await apiFetch(`/api/projects/${selectedProjectId}/standard-selections`, {
        method: 'PUT',
        body: JSON.stringify({ selections })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save selections');
      }

      setMessage('Project standards updated');
    } catch (err) {
      setError(err.message || 'Failed to save selections');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-lodha-steel p-6">
        <div className="flex items-center gap-3 text-lodha-grey">
          <div className="w-5 h-5 border-2 border-lodha-gold border-t-transparent rounded-full animate-spin" />
          Loading project standards...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-lodha-steel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-lodha-black">Project Standards Assignment</h2>
            <p className="text-sm text-lodha-grey mt-1">
              Set which standards should be applied to each project. Project location can guide the selection.
            </p>
          </div>
          {!canEdit && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-lodha-sand text-lodha-grey">
              Read-only
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">Project State</label>
            <div className="w-full px-3 py-2 border border-lodha-steel rounded-lg bg-lodha-sand/40 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-lodha-grey" />
              <span className="text-sm text-lodha-grey">
                {selectedProject?.state || 'Not set'}
              </span>
            </div>
            {!selectedProject?.state && (
              <p className="text-xs text-lodha-grey/70 mt-1">
                Add a project state to enable automatic guideline recommendations.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">Electrical Load Guideline</label>
            <select
              value={selection.electricalGuideline}
              onChange={(e) => setSelection(prev => ({ ...prev, electricalGuideline: e.target.value }))}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold disabled:bg-lodha-sand/40"
            >
              <option value="">Select guideline</option>
              {guidelines.map(guideline => (
                <option key={guideline} value={guideline}>
                  {guideline}
                </option>
              ))}
            </select>
            {recommendedGuideline && !selection.electricalGuideline && (
              <p className="text-xs text-lodha-grey/70 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                Recommended: {recommendedGuideline}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-lodha-grey mb-1">PHE Policy Version</label>
            <select
              value={selection.policyVersionId}
              onChange={(e) => setSelection(prev => ({ ...prev, policyVersionId: e.target.value }))}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold disabled:bg-lodha-sand/40"
            >
              <option value="">Select policy</option>
              {policies.map(policy => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} ({policy.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-deep disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Standards'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StandardsHub() {
  const { userLevel } = useUser();
  const [activeTab, setActiveTab] = useState('project');
  const canEdit = ['SUPER_ADMIN', 'L0', 'L1'].includes(userLevel);
  const readOnly = !canEdit;

  const renderTabContent = () => {
    if (activeTab === 'project') {
      return <ProjectStandardsSection canEdit={canEdit} />;
    }

    if (activeTab === 'system') {
      return (
        <div className={readOnly ? 'pointer-events-none opacity-80' : ''}>
          <ProjectStandardsManagement embedded readOnly={readOnly} />
        </div>
      );
    }

    if (activeTab === 'policy') {
      return (
        <div className={readOnly ? 'pointer-events-none opacity-80' : ''}>
          <PolicyManagement embedded readOnly={readOnly} />
        </div>
      );
    }

    return (
      <div className={readOnly ? 'pointer-events-none opacity-80' : ''}>
        <StandardsManagement embedded readOnly={readOnly} />
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <h1 className="heading-primary">Standards & Policies</h1>
            <p className="page-subtitle">Manage reference standards, policies, and project-specific selections.</p>
          </div>
          {readOnly && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-lodha-sand text-lodha-grey w-fit">
              Read-only access for your role
            </div>
          )}
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex bg-white border border-lodha-steel rounded-xl p-1 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-jost font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-lodha-gold text-white shadow-sm'
                      : 'text-lodha-grey hover:bg-lodha-sand'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {renderTabContent()}
      </div>
    </Layout>
  );
}
