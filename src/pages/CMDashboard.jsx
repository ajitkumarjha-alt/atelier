import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function CMDashboard() {
  const [rfis, setRfis] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
  const navigate = useNavigate();

  // Mock data - will be replaced with actual API calls later
  useEffect(() => {
    // Simulating RFI data
    const mockRfis = [
      {
        id: 1,
        rfiRefNo: 'RFI-001',
        projectName: 'Lodha Crown',
        subject: 'Clarification on MEP Layout - Level 5',
        raisedDate: '2026-01-25',
        status: 'pending',
        discipline: 'Arch / Finishing'
      },
      {
        id: 2,
        rfiRefNo: 'RFI-002',
        projectName: 'Lodha Amara',
        subject: 'HVAC Duct Routing Conflict',
        raisedDate: '2026-01-20',
        status: 'approved',
        discipline: 'Mechanical'
      },
      {
        id: 3,
        rfiRefNo: 'RFI-003',
        projectName: 'Lodha Belmondo',
        subject: 'Electrical Panel Room Location',
        raisedDate: '2026-01-28',
        status: 'pending',
        discipline: 'Electrical'
      }
    ];
    setRfis(mockRfis);
  }, []);

  const filteredRfis = rfis.filter(rfi => {
    if (filter === 'all') return true;
    return rfi.status === filter;
  });

  const pendingCount = rfis.filter(r => r.status === 'pending').length;
  const approvedCount = rfis.filter(r => r.status === 'approved').length;

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
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'all'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          All ({rfis.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'pending'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 font-jost font-semibold transition-colors ${
            filter === 'approved'
              ? 'text-lodha-gold border-b-2 border-lodha-gold'
              : 'text-gray-500 hover:text-lodha-black'
          }`}
        >
          Approved ({approvedCount})
        </button>
      </div>

      {/* RFI List */}
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
                        rfi.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {rfi.status.charAt(0).toUpperCase() + rfi.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
