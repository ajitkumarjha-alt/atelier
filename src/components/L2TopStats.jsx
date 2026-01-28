import { useState, useEffect } from 'react';
import { FileText, HelpCircle, Archive, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function L2TopStats({ userEmail, projectId }) {
  const [masCount, setMasCount] = useState(0);
  const [rfiCount, setRfiCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = projectId ? `?projectId=${projectId}&userEmail=${userEmail}` : `?userEmail=${userEmail}`;
      
      const [masRes, rfiRes] = await Promise.all([
        fetch(`/api/mas/pending-count${params}`),
        fetch(`/api/rfi/pending-count${params}`),
      ]);

      if (masRes.ok) {
        const masData = await masRes.json();
        setMasCount(masData.count);
      }

      if (rfiRes.ok) {
        const rfiData = await rfiRes.json();
        setRfiCount(rfiData.count);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, count, color, onClick }) => (
    <div
      onClick={onClick}
      className={`${color} rounded-lg p-6 cursor-pointer transform hover:scale-105 transition-transform duration-200 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 font-jost text-sm mb-1">Pending</p>
          <p className="text-white font-garamond text-3xl font-bold">{count}</p>
          <p className="text-white/70 font-jost text-xs mt-2">{title}</p>
        </div>
        <Icon className="w-12 h-12 text-white/60" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 text-lodha-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <StatCard
        icon={FileText}
        title="Material Approval Sheets"
        count={masCount}
        color="bg-gradient-to-br from-blue-500 to-blue-600"
        onClick={() => navigate('/mas')}
      />
      <StatCard
        icon={HelpCircle}
        title="Requests for Information"
        count={rfiCount}
        color="bg-gradient-to-br from-orange-500 to-orange-600"
        onClick={() => navigate('/rfi')}
      />
    </div>
  );
}
