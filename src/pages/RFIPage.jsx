import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Layout from '../components/Layout';
import { auth } from '../lib/firebase';

export default function RFIPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  useEffect(() => {
    if (user) {
      fetchRFI();
    }
  }, [user]);

  const fetchRFI = async () => {
    try {
      setLoading(true);
      // Fetch all RFI items - in a real app, this would be filtered by user's projects
      const response = await fetch('/api/rfi/project/1'); // For now, fetch from project 1
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching RFI:', err);
      setError('Failed to load Requests for Information');
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
        <h1 className="heading-primary mb-2">Requests for Information</h1>
        <p className="text-body">Track pending information requests across projects</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <p className="text-center text-lodha-grey font-jost py-12">
            No requests for information found
          </p>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div 
                key={item.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-garamond font-bold text-lodha-black">
                    {item.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'pending'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
                {item.description && (
                  <p className="text-lodha-grey font-jost mb-3">{item.description}</p>
                )}
                <div className="flex justify-between text-sm text-lodha-grey font-jost">
                  <span>Raised by: {item.raised_by_name || 'Unknown'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
