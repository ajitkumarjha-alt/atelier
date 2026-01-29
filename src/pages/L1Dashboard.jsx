import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import L1ProjectTable from '../components/L1ProjectTable';
import { auth } from '../lib/firebase';
import { Plus } from 'lucide-react';

export default function L1Dashboard() {
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    
    if (currentUser?.email) {
      fetchUserLevel(currentUser.email);
    }
  }, []);

  const fetchUserLevel = async (email) => {
    try {
      const response = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
      if (response.ok) {
        const userData = await response.json();
        setUserLevel(userData.user_level);
      }
    } catch (err) {
      console.error('Error fetching user level:', err);
      setUserLevel('L1'); // Default fallback
    }
  };

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="heading-primary mb-2">Project Allocation</h1>
          <p className="text-body">Manage MEP project assignments across all leads</p>
        </div>
        <button
          onClick={() => navigate('/project-input')}
          className="flex items-center gap-2 px-6 py-3 bg-lodha-gold text-white font-jost font-semibold rounded-lg hover:bg-lodha-gold/90"
        >
          <Plus className="w-5 h-5" />
          Create New Project
        </button>
      </div>

      {/* Projects Table */}
      <div className="card">
        <L1ProjectTable userEmail={user?.email} userLevel={userLevel} />
      </div>
    </Layout>
  );
}
