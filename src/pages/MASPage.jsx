import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Layout from '../components/Layout';
import { auth } from '../lib/firebase';

export default function MASPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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
      const response = await fetch('/api/mas/project/1'); // For now, fetch from project 1
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
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Material Approval Sheets</h1>
        <p className="text-body">Track pending material approvals across projects</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <p className="text-center text-lodha-grey font-jost py-12">
            No material approval sheets found
          </p>
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
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
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
    </Layout>
  );
}
