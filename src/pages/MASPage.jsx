import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Plus, FileText, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import CreateMAS from '../components/CreateMAS';
import { auth } from '../lib/firebase';
import { apiFetchJson } from '../lib/api';

export default function MASPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState ('');

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
        setFilteredItems(data);
      }
    } catch (err) {
      console.error('Error fetching MAS:', err);
      setError('Failed to load Material Approval Sheets');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let result = [...items];

    // Apply status filter
    if (filter !== 'All') {
      result = result.filter(item => item.final_status === filter);
    }

    // Apply search
    if (searchTerm) {
      result = result.filter(item =>
        item.mas_ref_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(result);
  }, [filter, searchTerm, items]);

  const getStatusCounts = () => {
    return div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold"></div>
        </div>
      </Layout>
    );
  }

  const counts = getStatusCounts();

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="heading-primary mb-2">Material Approval Sheets (MAS)</h1>
          <p className="text-body">Track and approve material submissions across all projects</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/mas-form')}
            className="bg-white border border-lodha-steel text-lodha-grey px-4 py-2 rounded-lg hover:bg-lodha-sand transition-colors flex items-center gap-2 font-jost font-semibold"
          >
            <FileText className="w-5 h-5" />
            Form View
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-lodha-gold text-white px-4 py-2 rounded-lg hover:bg-lodha-grey transition-colors flex items-center gap-2 font-jost font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Quick Create
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-red-700 mb-6 flex items-start gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Filter Chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-jost font-semibold text-lodha-grey">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'All'
                ? 'bg-lodha-gold text-white shadow-md'
                : 'bg-white border border-lodha-steel text-lodha-grey hover:bg-lodha-sand'
            }`}
          >
            All <span className="ml-1 opacity-70">({counts.all})</span>
          </button>
          <button
            onClick={() => setFilter('Pending')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'Pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            Pending <span className="ml-1 opacity-70">({counts.pending})</span>
          </button>
          <button
            onClick={() => setFilter('Approved')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'Approved'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-white border border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            Approved <span className="ml-1 opacity-70">({counts.approved})</span>
          </button>
          <button
            onClick={() => setFilter('Rejected')}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filter === 'Rejected'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            Rejected <span className="ml-1 opacity-70">({counts.rejected})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-lodha-grey/40" />
          <input
            type="text"
            placeholder="Search by MAS ref, material, or manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-lodha-gold transition-all font-jost"
          />
        </div>
      </div>

      {/* MAS Table/List */}
      <div className="bg-white border border-lodha-steel rounded-lg shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-16 h-16 text-lodha-muted-gold mx-auto mb-4" />
            <p className="text-lodha-grey font-garamond text-xl font-semibold mb-2">
              {searchTerm || filter !== 'All' ? 'No MAS match your filters' : 'No Material Approval Sheets found'}
            </p>
            <p className="text-lodha-grey/60 font-jost mb-6">
              {searchTerm || filter !== 'All' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Material approval submissions will appear here once created'}
            </p>
            <button
              onClick={() => navigate('/mas-form')}
              className="bg-lodha-gold text-white px-6 py-3 rounded-lg hover:bg-lodha-grey transition-colors font-jost font-semibold"
            >
              Create Your First MAS
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-lodha-cream border-b-2 border-lodha-gold">
                <tr>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">MAS Ref</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">Material</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">Manufacturer</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">Quantity</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">L2 Status</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">L1 Status</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">Final Status</th>
                  <th className="text-left py-4 px-6 text-lodha-grey font-garamond font-bold whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-lodha-steel hover:bg-lodha-sand/50 cursor-pointer transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-lodha-sand/20'
                    }`}
                    onClick={() => navigate(`/mas/${item.id}`)}
                  >
                    <td className="px-6 py-4 text-lodha-gold font-jost font-semibold">{item.mas_ref_no}</td>
                    <td className="px-6 py-4 text-lodha-grey font-jost">{item.material_name}</td>
                    <td className="px-6 py-4 text-lodha-grey font-jost">{item.manufacturer}</td>
                    <td className="px-6 py-4 text-lodha-grey font-jost">{item.quantity} {item.unit}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        item.l2_status === 'Approved' 
                          ? 'bg-green-100 text-green-700'
                          : item.l2_status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.l2_status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {item.l2_status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {item.l2_status === 'Pending' && <Clock className="w-3 h-3" />}
                        {item.l2_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        item.l1_status === 'Approved' 
                          ? 'bg-green-100 text-green-700'
                          : item.l1_status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.l1_status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {item.l1_status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {item.l1_status === 'Pending' && <Clock className="w-3 h-3" />}
                        {item.l1_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                        item.final_status === 'Approved' 
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : item.final_status === 'Rejected'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}>
                        {item.final_status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {item.final_status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {item.final_status === 'Pending' && <Clock className="w-3 h-3" />}
                        {item.final_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-lodha-grey/70 font-jost text-sm">
                      {new Date(item.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Scroll Indicator */}
      <div className="lg:hidden text-center py-2 text-xs text-lodha-grey/60 font-jost">
        ← Scroll horizontally to see all columns →          </td>
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
