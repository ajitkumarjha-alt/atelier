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
  const [filter, setFilter] = useState('All'); // 'All', 'Pending', 'Approved', 'Rejected'

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  useEffect(() => {
    fetchMAS();
  }, []);

  const fetchMAS = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mas', {
        headers: {
          'x-dev-user-email': localStorage.getItem('devUserEmail') || 'l2@lodhagroup.com',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
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

      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-jost font-semibold transition-colors ${
              filter === status
                ? 'text-lodha-gold border-b-2 border-lodha-gold'
                : 'text-gray-500 hover:text-lodha-black'
            }`}
          >
            {status} ({items.filter(i => status === 'All' || i.status === status).length})
          </button>
        ))}
      </div>

      <div className="card">
        {items.filter(i => filter === 'All' || i.status === filter).length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lodha-grey font-jost mb-4">
              No material approval sheets found
            </p>
            <button
              onClick={() => navigate('/mas-form')}
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
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">MAS Ref</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Material</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Manufacturer</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Quantity</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">L2 Status</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">L1 Status</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Final Status</th>
                  <th className="text-left px-6 py-4 text-lodha-black font-garamond font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(i => filter === 'All' || i.status === filter).map(item => (
                  <tr 
                    key={item.id} 
                    className="border-b border-gray-200 hover:bg-lodha-sand/50 cursor-pointer"
                    onClick={() => navigate(`/mas/${item.id}`)}
                  >
                    <td className="px-6 py-4 text-lodha-gold font-jost font-semibold">{item.mas_ref_no}</td>
                    <td className="px-6 py-4 text-lodha-black font-jost">{item.material_name}</td>
                    <td className="px-6 py-4 text-lodha-black font-jost">{item.manufacturer}</td>
                    <td className="px-6 py-4 text-lodha-black font-jost">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.l2_status === 'Approved' 
                          ? 'bg-green-100 text-green-700'
                          : item.l2_status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.l2_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.l1_status === 'Approved' 
                          ? 'bg-green-100 text-green-700'
                          : item.l1_status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.l1_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.final_status === 'Approved' 
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : item.final_status === 'Rejected'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {item.final_status}
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
