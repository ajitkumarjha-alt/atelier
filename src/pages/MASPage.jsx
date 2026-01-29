import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Plus, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import CreateMAS from '../components/CreateMAS';
import { auth } from '../lib/firebase';
import { apiFetchJson } from '../lib/api';

export default function MASPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchMAS();
    }
  }, [user]);

  const fetchMAS = async () => {
    try {
      setLoading(true);
      // Fetch all MAS items - in a real app, this would be filtered by user's projects
      const data = await apiFetchJson('/api/mas/project/1'); // For now, fetch from project 1
      setItems(data);
    } catch (err) {
      console.error('Error fetching MAS:', err);
      setError('Failed to load Material Approval Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMAS = async (formData) => {
    try {
      // TODO: This will be implemented when we create the backend API
      console.log('Saving MAS:', formData);
      
      // For now, just close the modal and show success
      setShowCreateModal(false);
      
      // Refresh the list
      await fetchMAS();
      
      // TODO: Show success message
      alert('MAS created successfully! (Backend integration pending)');
    } catch (err) {
      console.error('Error saving MAS:', err);
      alert('Failed to save MAS');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="heading-primary mb-2">Material Approval Sheets</h1>
          <p className="text-body">Track pending material approvals across projects</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mas-form')}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Form View
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Quick Create
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-lodha-sand border border-lodha-gold rounded-lg p-4 text-lodha-black mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lodha-grey font-jost mb-4">
              No material approval sheets found
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary"
            >
              Create Your First MAS
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-lodha-gold bg-lodha-sand">
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Material</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Quantity</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Status</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-lodha-sand/50">
                    <td className="px-6 py-4 text-lodha-black font-jost">{item.material_name}</td>
                    <td className="px-6 py-4 text-lodha-black font-jost">{item.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'pending' 
                          ? 'bg-lodha-sand text-lodha-black border border-lodha-gold/50'
                          : 'bg-lodha-gold/20 text-lodha-black border border-lodha-gold'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-lodha-grey font-jost">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create MAS Modal */}
      {showCreateModal && (
        <CreateMAS
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveMAS}
        />
      )}
    </Layout>
  );
}
