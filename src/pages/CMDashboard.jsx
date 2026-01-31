import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function CMDashboard() {
  const [rfis, setRfis] = useState([]);
  const [filter, setFilter] = useState('All'); // 'All', 'Pending', 'Approved'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch RFIs from API
  useEffect(() => {
    const fetchRfis = async () => {
      try {
        const response = await fetch('/api/rfi', {
          headers: {
            'x-dev-user-email': localStorage.getItem('devUserEmail') || 'cm@lodhagroup.com',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform backend data to match frontend format
          const transformedData = data.map(rfi => ({
            id: rfi.id,
            rfiRefNo: rfi.rfi_ref_no,
            projectName: rfi.project_name,
            subject: rfi.rfi_subject,
            raisedDate: new Date(rfi.date_raised || rfi.created_at).toISOString().split('T')[0],
            status: rfi.status,
            discipline: rfi.disciplines ? Object.keys(JSON.parse(rfi.disciplines) || {}).filter(k => JSON.parse(rfi.disciplines)[k]).join(', ') : 'N/A',
          }));
          setRfis(transformedData);
        }
      } catch (error) {
        console.error('Error fetching RFIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRfis();
  }, []);

  const filteredRfis = rfis.filter(rfi => {
    if (filter === 'All') return true;
    return rfi.status === filter;
  });

  const pendingCount = rfis.filter(r => r.status === 'Pending').length;
  const approvedCount = rfis.filter(r => r.status === 'Approved').length;

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Construction Manager Dashboard</h1>
        <p className="text-body">Manage and track Requests for Information (RFI)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Total RFIs</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{rfis.length}</p>
            </div>
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Pending</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-jost text-sm mb-1">Approved</p>
              <p className="text-lodha-black font-garamond text-3xl font-bold">{approvedCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Create RFI Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/rfi/create')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New RFI
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('All')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'All'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          All ({rfis.length})
        </button>
        <button
          onClick={() => setFilter('Pending')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'Pending'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('Approved')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'Approved'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          Approved ({approvedCount})
        </button>
      </div>

      {/* RFI List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-500 font-jost">Loading RFIs...</p>
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-lodha-gold/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                RFI Ref. No
              </th>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                Project Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                Discipline
              </th>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                Raised Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRfis.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 font-jost">
                  No RFIs found
                </td>
              </tr>
            ) : (
              filteredRfis.map((rfi) => (
                <tr
                  key={rfi.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/rfi/${rfi.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-jost font-semibold text-lodha-gold">
                    {rfi.rfiRefNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-jost text-lodha-black">
                    {rfi.projectName}
                  </td>
                  <td className="px-6 py-4 text-sm font-jost text-lodha-black">
                    {rfi.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-jost text-gray-600">
                    {rfi.discipline}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-jost text-gray-600">
                    {new Date(rfi.raisedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-jost font-semibold rounded-full ${
                        rfi.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {rfi.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </Layout>
  );
}
