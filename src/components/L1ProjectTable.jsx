import { useState, useEffect } from 'react';
import { ChevronDown, Loader, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetchJson, apiFetch } from '../lib/api';

export default function L1ProjectTable({ userEmail, userLevel }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [assigningProjectId, setAssigningProjectId] = useState(null);
  const navigate = useNavigate();

  console.log('L1ProjectTable userLevel:', userLevel);

  useEffect(() => {
    if (userEmail) {
      fetchProjects();
    }
    fetchL2Users();
  }, [userEmail]);

  const fetchProjects = async () => {
    try {
      // Build URL with userEmail only if it's provided
      const url = userEmail 
        ? `/api/projects?userEmail=${encodeURIComponent(userEmail)}`
        : '/api/projects';
      
      const data = await apiFetchJson(url);
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchL2Users = async () => {
    try {
      const data = await apiFetchJson('/api/users/level/L2');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching L2 users:', err);
    }
  };

  const handleAssignLead = async (projectId, leadId) => {
    try {
      setAssigningProjectId(projectId);
      const response = await fetch(`/api/projects/${projectId}/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userEmail }),
      });

      if (!response.ok) throw new Error('Failed to assign lead');
      
      // Update local state
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { ...p, assigned_lead_id: leadId, assigned_lead_name: users.find(u => u.id === leadId)?.full_name }
          : p
      ));
    } catch (err) {
      console.error('Error assigning lead:', err);
      alert('Failed to assign lead');
    } finally {
      setAssigningProjectId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-lodha-gold bg-lodha-sand">
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Project Name</th>
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Lifecycle Stage</th>
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Progress</th>
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Assigned Lead</th>
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Action</th>
            <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Edit</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr 
              key={project.id}
              className="border-b border-gray-200 hover:bg-lodha-sand/50 transition-colors"
            >
              <td 
                className="px-6 py-4 text-lodha-black font-jost font-semibold cursor-pointer hover:text-lodha-gold"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                {project.name}
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-lodha-gold/20 text-lodha-black text-sm font-semibold rounded-full">
                  {project.lifecycle_stage}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="w-32">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-lodha-grey font-jost">{project.completion_percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-lodha-gold transition-all duration-300"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-lodha-black font-jost">
                {project.assigned_lead_name || '—'}
              </td>
              <td className="px-6 py-4">
                <div className="relative inline-block">
                  <select
                    defaultValue={project.assigned_lead_id || ''}
                    onChange={(e) => handleAssignLead(project.id, parseInt(e.target.value))}
                    disabled={assigningProjectId === project.id}
                    className="appearance-none px-4 py-2 bg-lodha-gold text-white rounded-lg cursor-pointer hover:bg-lodha-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-jost font-semibold text-sm pr-8"
                  >
                    <option value="">Assign Lead</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                </div>
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => navigate(`/project-input/${project.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-lodha-black text-white rounded-lg hover:bg-lodha-gold transition-colors font-jost text-sm"
                  title="Edit project"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {projects.length === 0 && (
        <div className="text-center py-12 text-lodha-grey font-jost">
          No active projects found
        </div>
      )}
    </div>
  );
}
