import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Loader, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetchJson } from '../lib/api';

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState(null);
  const [vendor, setVendor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if vendor is logged in via OTP
    const vendorEmail = localStorage.getItem('vendorEmail');
    const vendorToken = localStorage.getItem('vendorToken');
    const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');

    if (!vendorEmail && !vendorToken && !isSuperAdmin) {
      navigate('/vendor-login');
      return;
    }

    fetchData();
  }, [navigate]);

  async function fetchData() {
    try {
      setLoading(true);
      const vendorEmail = localStorage.getItem('vendorEmail');
      const vendorToken = localStorage.getItem('vendorToken');
      const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');

      const headers = isSuperAdmin && !vendorEmail ? {
        'x-dev-user-email': localStorage.getItem('devUserEmail'),
      } : {
        'Authorization': `Bearer ${vendorToken}`,
        'x-vendor-email': vendorEmail,
      };

      // Fetch vendor profile and projects
      const vendorRes = await fetch('/api/vendors/profile', { headers });
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        setVendor(vendorData.vendor);
        setProjects(vendorData.projects || []);
      } else {
        // Fallback to old method for backward compatibility
        const pData = await apiFetchJson('/api/projects');
        setProjects(pData);
      }

      // Fetch MAS summary (counts grouped by project)
      const sData = await apiFetchJson('/api/mas/summary');

      // Convert summary array to map by project id
      const map = {};
      sData.forEach(row => {
        map[row.project_id] = {
          pending: parseInt(row.pending_count || 0),
          approved: parseInt(row.approved_count || 0),
          total: parseInt(row.total_count || 0)
        };
      });
      setSummary(map);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('vendorEmail');
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorId');
    navigate('/');
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <h1 className="heading-primary">Vendor Dashboard</h1>
          <p className="text-body mt-2">
            {vendor ? `Welcome back, ${vendor.name}` : 'Summary of Material Approval Sheets you have submitted'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/mas?create=true')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-lodha-gold hover:bg-lodha-deep text-white rounded-md shadow"
          >
            <Plus className="w-4 h-4" />
            Create New MAS
          </button>
          {localStorage.getItem('vendorEmail') && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-lodha-sand border border-lodha-gold rounded-lg p-4 text-lodha-black mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map(proj => {
          const counts = summary[proj.id] || { pending: 0, approved: 0, total: 0 };
          return (
            <div key={proj.id} className="p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-garamond font-bold text-lodha-gold">{proj.name}</h2>
                <div className="text-sm text-lodha-grey">{proj.lifecycle_stage}</div>
              </div>
              <p className="text-sm text-lodha-grey mb-4">{proj.description}</p>

              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-lodha-sand rounded-md text-center">
                  <div className="text-xl font-garamond text-lodha-gold">{counts.total}</div>
                  <div className="text-sm text-lodha-grey">Total MAS</div>
                </div>
                <div className="flex-1 p-3 bg-lodha-sand rounded-md text-center">
                  <div className="text-xl font-garamond text-lodha-gold">{counts.pending}</div>
                  <div className="text-sm text-lodha-grey">Pending</div>
                </div>
                <div className="flex-1 p-3 bg-lodha-sand rounded-md text-center">
                  <div className="text-xl font-garamond text-lodha-gold">{counts.approved}</div>
                  <div className="text-sm text-lodha-grey">Approved</div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => navigate(`/mas?projectId=${proj.id}`)}
                  className="px-3 py-1 bg-lodha-gold text-white rounded-md"
                >
                  View MAS
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
