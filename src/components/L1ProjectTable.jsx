import { useState, useEffect } from 'react';
import { ChevronDown, Loader, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetchJson, apiFetch } from '../lib/api';
import { showError } from '../utils/toast';

export default function L1ProjectTable({ userEmail, userLevel }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [assigningProjectId, setAssigningProjectId] = useState(null);
  const navigate = useNavigate();

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
      showError('Failed to assign lead');
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
    <>
      <table className="w-full table-auto border-collapse" style={{minWidth: '100%'}}>
        <thead>
          <tr className="border-b-2 border-lodha-gold bg-lodha-sand">
            <th className="text-left py-2 md:py-3 px-[2%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '20%'}}>Project Name</th>
            <th className="text-left py-2 md:py-3 px-[2%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '15%'}}>Lifecycle Stage</th>
            <th className="text-left py-2 md:py-3 px-[2%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '15%'}}>Progress</th>
            <th className="text-left py-2 md:py-3 px-[2%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '15%'}}>Assigned Lead</th>
            <th className="text-left py-2 md:py-3 px-[2%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '17.5%'}}>Action</th>
            <th className="text-left py-2 md:py-3 px-[2%] pr-[3%] text-lodha-black font-garamond font-bold text-sm md:text-base whitespace-nowrap" style={{width: '17.5%'}}>Edit</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr 
              key={project.id}
              className="border-b border-lodha-steel/30 hover:bg-lodha-sand/50 transition-colors"
            >
              <td 
                className="py-2 md:py-3 px-[2%] text-lodha-black font-jost font-semibold cursor-pointer hover:text-lodha-gold text-sm md:text-base"
                onClick={() => navigate(`/project/${project.id}`)}
                title={project.name}
              >
                <div className="truncate max-w-full">{project.name}</div>
              </td>
              <td className="py-2 md:py-3 px-[2%]">
                <span className="inline-block px-2 md:px-3 py-1 bg-lodha-gold/20 text-lodha-black text-xs md:text-sm font-semibold rounded-full whitespace-nowrap">
                  {project.lifecycle_stage}
                </span>
              </td>
              <td className="py-2 md:py-3 px-[2%]">
                <div className="w-full max-w-[120px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs md:text-sm text-lodha-grey font-jost">{project.completion_percentage}%</span>
                  </div>
                  <div className="h-2 bg-lodha-steel/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-lodha-gold transition-all duration-300"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-2 md:py-3 px-[2%] text-lodha-black font-jost text-sm md:text-base">
                <div className="truncate">{project.assigned_lead_name || '—'}</div>
              </td>
              <td className="py-2 md:py-3 px-[2%]">
                <div className="relative inline-block w-full max-w-[140px]">
                  <select
                    defaultValue={project.assigned_lead_id || ''}
                    onChange={(e) => handleAssignLead(project.id, parseInt(e.target.value))}
                    disabled={assigningProjectId === project.id}
                    className="w-full appearance-none px-2 md:px-3 py-1.5 md:py-2 bg-lodha-gold text-white rounded-lg cursor-pointer hover:bg-lodha-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-jost font-semibold text-xs md:text-sm pr-6 md:pr-7 whitespace-nowrap"
                  >
                    <option value="">Assign Lead</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-white pointer-events-none" />
                </div>
              </td>
              <td className="py-2 md:py-3 px-[2%] pr-[3%]">
                <button
                  onClick={() => navigate(`/project-input/${project.id}`)}
                  className="flex items-center justify-center gap-1 md:gap-2 w-full max-w-[100px] px-2 md:px-3 py-1.5 md:py-2 bg-lodha-black text-white rounded-lg hover:bg-lodha-gold transition-colors font-jost text-xs md:text-sm whitespace-nowrap"
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
    </>
  );
}
