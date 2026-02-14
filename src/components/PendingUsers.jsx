import { useState, useEffect } from 'react';
import { UserPlus, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';

export default function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingUserId, setActivatingUserId] = useState(null);
  const { confirm, dialogProps } = useConfirm();

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/users/pending', {
        headers: {
          'Authorization': `Bearer ${await import('firebase/auth').then(m => m.getAuth().currentUser?.getIdToken())}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }

      const data = await response.json();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPendingUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleActivateUser = async (userId, userEmail) => {
    const confirmed = await confirm({ title: 'Activate User', message: `Are you sure you want to activate ${userEmail}?`, variant: 'warning', confirmLabel: 'Activate' });
    if (!confirmed) return;

    setActivatingUserId(userId);
    try {
      const auth = await import('firebase/auth').then(m => m.getAuth());
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`/api/users/${userId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate user');
      }

      toast.success(`User ${userEmail} activated successfully!`);
      // Refresh the list
      await fetchPendingUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error(error.message || 'Failed to activate user');
    } finally {
      setActivatingUserId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-lodha-steel/30 p-6">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-6 h-6 text-lodha-gold" />
          <h2 className="text-xl font-garamond font-bold text-lodha-black">
            Pending User Approvals
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-lodha-grey/70">Loading pending users...</div>
        </div>
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-lodha-steel/30 p-6">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-6 h-6 text-lodha-gold" />
          <h2 className="text-xl font-garamond font-bold text-lodha-black">
            Pending User Approvals
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-lodha-grey/70">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-center">No pending user approvals</p>
          <p className="text-sm text-center mt-1">All registered users have been activated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-lodha-steel/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6 text-lodha-gold" />
          <h2 className="text-xl font-garamond font-bold text-lodha-black">
            Pending User Approvals
          </h2>
          <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {pendingUsers.length}
          </span>
        </div>
        <button
          onClick={fetchPendingUsers}
          className="text-sm text-lodha-grey hover:text-lodha-gold transition-colors"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {pendingUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 bg-lodha-sand/40 rounded-lg border border-lodha-steel/30 hover:border-lodha-gold transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lodha-steel flex items-center justify-center text-white font-semibold">
                  {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lodha-black">{user.full_name || 'No Name'}</h3>
                  <p className="text-sm text-lodha-grey">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {user.user_level}
                    </span>
                    <span className="text-xs text-lodha-grey/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleActivateUser(user.id, user.email)}
              disabled={activatingUserId === user.id}
              className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-lodha-steel text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              {activatingUserId === user.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> New users are inactive by default. Approve them to grant access to the system.
          Users will be automatically redirected to their dashboard once activated.
        </p>
      </div>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
