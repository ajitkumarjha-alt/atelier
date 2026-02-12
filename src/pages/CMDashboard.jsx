import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle, Building2, AlertTriangle, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson } from '../lib/api';

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
        <div className="bg-white border border-lodha-steel rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lodha-grey/60 font-jost text-sm mb-1">Total RFIs</p>
              <p className="text-lodha-grey font-garamond text-3xl font-bold">{rfis.length}</p>
            </div>
            <div className="w-12 h-12 bg-lodha-gold/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-lodha-gold" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-lodha-steel rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lodha-grey/60 font-jost text-sm mb-1">Pending</p>
              <p className="text-lodha-grey font-garamond text-3xl font-bold">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-lodha-steel rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lodha-grey/60 font-jost text-sm mb-1">Approved</p>
              <p className="text-lodha-grey font-garamond text-3xl font-bold">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
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
        <div className="w-full overflow-x-auto">
        <table className="w-full min-w-max divide-y divide-gray-200">
          <thead className="bg-lodha-gold/10">
            <tr>
              <th className="py-2 md:py-3 px-[2%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                RFI Ref. No
              </th>
              <th className="py-2 md:py-3 px-[2%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                Project Name
              </th>
              <th className="py-2 md:py-3 px-[2%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                Subject
              </th>
              <th className="py-2 md:py-3 px-[2%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                Discipline
              </th>
              <th className="py-2 md:py-3 px-[2%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                Raised Date
              </th>
              <th className="py-2 md:py-3 px-[2%] pr-[3%] text-left text-xs font-jost font-bold text-lodha-black uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRfis.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-4 md:py-8 px-[2%] text-center text-gray-500 font-jost">
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
                  <td className="py-2 md:py-4 px-[2%] whitespace-nowrap text-sm font-jost font-semibold text-lodha-gold">
                    {rfi.rfiRefNo}
                  </td>
                  <td className="py-2 md:py-4 px-[2%] text-sm font-jost text-lodha-black">
                    <div className="truncate max-w-[150px]">{rfi.projectName}</div>
                  </td>
                  <td className="py-2 md:py-4 px-[2%] text-sm font-jost text-lodha-black">
                    <div className="truncate max-w-[200px]">{rfi.subject}</div>
                  </td>
                  <td className="py-2 md:py-4 px-[2%] text-sm font-jost text-gray-600">
                    <div className="truncate max-w-[120px]">{rfi.discipline}</div>
                  </td>
                  <td className="py-2 md:py-4 px-[2%] whitespace-nowrap text-sm font-jost text-gray-600">
                    {new Date(rfi.raisedDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 md:py-4 px-[2%] pr-[3%] whitespace-nowrap">
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
      </div>
      )}
    </Layout>
  );
}
