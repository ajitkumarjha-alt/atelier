import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, UserPlus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import ConsultantRegistration from './ConsultantRegistration';
import VendorRegistration from './VendorRegistration';

export default function ProjectTeamManagement({ projectId, currentUserLevel, currentUserId }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Predefined roles
  const roleOptions = [
    { category: 'MEP Disciplines', roles: ['HVAC Lead', 'Electrical Lead', 'Plumbing Lead', 'Fire Fighting Lead', 'MEP Coordinator'] },
    { category: 'Engineering Roles', roles: ['Design Engineer', 'Site Engineer', 'QA/QC Engineer', 'Planning Engineer'] },
    { category: 'Management', roles: ['Project Manager', 'Construction Manager', 'Safety Officer', 'Document Controller'] },
    { category: 'Consultant Roles', roles: ['MEP Consultant', 'Design Consultant', 'Third Party Inspector'] },
    { category: 'Vendor Roles', roles: ['Material Supplier', 'Equipment Supplier', 'Installation Contractor', 'Testing & Commissioning'] }
  ];

  useEffect(() => {
    fetchTeamMembers();
    fetchAllUsers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Determine which user levels can be added based on current user level
      let levels = [];
      
      if (currentUserLevel === 'L0' || currentUserLevel === 'SUPER_ADMIN') {
        // L0 and SUPER_ADMIN can add L1 and below
        levels = ['L1', 'L2', 'L3', 'L4', 'VENDOR', 'CM', 'CONSULTANT'];
      } else if (currentUserLevel === 'L1') {
        // L1 can add L2 and below
        levels = ['L2', 'L3', 'L4', 'VENDOR', 'CM', 'CONSULTANT'];
      } else {
        // Others can add L2, L3, L4, and external users
        levels = ['L2', 'L3', 'L4', 'VENDOR', 'CM', 'CONSULTANT'];
      }
      
      const allUserPromises = levels.map(level =>
        apiFetch(`/api/users/level/${level}`).then(res => res.ok ? res.json() : [])
      );
      
      const results = await Promise.all(allUserPromises);
      const combinedUsers = results.flat();
      setAllUsers(combinedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await apiFetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
          role: selectedRole || null,
          assignedBy: currentUserId
        })
      });

      if (response.ok) {
        setSuccess('Team member added successfully!');
        setShowAddModal(false);
        setSelectedUserId('');
        setSelectedUserType('');
        setSelectedRole('');
        await fetchTeamMembers();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add team member');
      }
    } catch (err) {
      console.error('Error adding team member:', err);
      setError('Failed to add team member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/projects/${projectId}/team/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Team member removed successfully!');
        await fetchTeamMembers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to remove team member');
      }
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
    }
  };

  const getUserLevelBadge = (level) => {
    const badges = {
      'L1': { color: 'bg-indigo-100 text-indigo-700', label: 'Senior Manager' },
      'L2': { color: 'bg-blue-100 text-blue-700', label: 'Senior Engineer' },
      'L3': { color: 'bg-green-100 text-green-700', label: 'Junior Engineer' },
      'L4': { color: 'bg-purple-100 text-purple-700', label: 'Technician' },
      'VENDOR': { color: 'bg-orange-100 text-orange-700', label: 'Vendor' },
      'CM': { color: 'bg-cyan-100 text-cyan-700', label: 'Construction Manager' },
      'CONSULTANT': { color: 'bg-teal-100 text-teal-700', label: 'Consultant' }
    };
    return badges[level] || { color: 'bg-gray-100 text-gray-700', label: level };
  };

  // Filter out users already in the team
  const availableUsers = allUsers.filter(
    user => !teamMembers.some(member => member.user_id === user.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lodha-gold/10 rounded-lg">
              <Users className="w-6 h-6 text-lodha-gold" />
            </div>
            <div>
              <h2 className="text-xl font-garamond font-bold text-lodha-black">
                Project Team
              </h2>
              <p className="text-sm text-gray-600">
                {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {(currentUserLevel === 'L1' || currentUserLevel === 'L0' || currentUserLevel === 'SUPER_ADMIN') && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowConsultantModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Consultant
              </button>
              <button
                onClick={() => setShowVendorModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Vendor
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 transition-colors font-medium"
              >
                <UserPlus className="w-5 h-5" />
                Add Team Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Team Members List */}
      <div className="p-6">
        {teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-jost">No team members assigned yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Click "Add Team Member" to assign engineers, technicians, construction managers, consultants, and vendors
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const badge = getUserLevelBadge(member.user_level);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-lodha-gold transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-lodha-gold/20 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-lodha-gold">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-jost font-semibold text-lodha-black">
                        {member.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      {member.role && (
                        <p className="text-xs text-gray-500 mt-1">Role: {member.role}</p>
                      )}
                      {member.assigned_by_name && (
                        <p className="text-xs text-gray-500">
                          Assigned by {member.assigned_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                    
                    {(currentUserLevel === 'L1' || currentUserLevel === 'L0' || currentUserLevel === 'SUPER_ADMIN') && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove team member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-garamond font-bold text-lodha-black">
                  Add Team Member
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedUserId('');
                    setSelectedUserType('');
                    setSelectedRole('');
                    setError('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <select
                  value={selectedUserType}
                  onChange={(e) => {
                    setSelectedUserType(e.target.value);
                    setSelectedUserId('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                >
                  <option value="">All User Types</option>
                  {(currentUserLevel === 'L0' || currentUserLevel === 'SUPER_ADMIN') && (
                    <option value="L1">Senior Manager (L1)</option>
                  )}
                  <option value="L2">Senior Engineer (L2)</option>
                  <option value="L3">Junior Engineer (L3)</option>
                  <option value="L4">Technician (L4)</option>
                  <option value="CM">Construction Manager</option>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                >
                  <option value="">Choose a user...</option>
                  {(selectedUserType ? availableUsers.filter(u => u.user_level === selectedUserType) : availableUsers)
                    .map(user => {
                      const badge = getUserLevelBadge(user.user_level);
                      return (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email}) - {badge.label}
                        </option>
                      );
                    })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedUserType ? `Showing ${availableUsers.filter(u => u.user_level === selectedUserType).length} user(s)` : `${availableUsers.length} users available`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                >
                  <option value="">Select a role...</option>
                  {roleOptions.map(category => (
                    <optgroup key={category.category} label={category.category}>
                      {category.roles.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="custom">-- Other (specify below) --</option>
                </select>
              </div>

              {selectedRole === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Role
                  </label>
                  <input
                    type="text"
                    value={selectedRole === 'custom' ? '' : selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="Enter custom role..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="flex-1 px-4 py-2 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Add Member
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId('');
                  setSelectedUserType('');
                  setSelectedRole('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultant Registration Modal */}
      {showConsultantModal && (
        <ConsultantRegistration
          projectId={projectId}
          onSuccess={() => {
            setShowConsultantModal(false);
            setSuccess('Consultant registered successfully! They can now login with their email.');
            setTimeout(() => setSuccess(''), 5000);
          }}
          onClose={() => setShowConsultantModal(false)}
        />
      )}

      {/* Vendor Registration Modal */}
      {showVendorModal && (
        <VendorRegistration
          projectId={projectId}
          onSuccess={() => {
            setShowVendorModal(false);
            setSuccess('Vendor registered successfully! They can now login with their email.');
            setTimeout(() => setSuccess(''), 5000);
          }}
          onClose={() => setShowVendorModal(false)}
        />
      )}
    </div>
  );
}
