import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, User, Building, Package, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';

export default function MASDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mas, setMas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState('');
  
  // L2 Review State
  const [showL2Review, setShowL2Review] = useState(false);
  const [l2Status, setL2Status] = useState('');
  const [l2Comments, setL2Comments] = useState('');
  const [submittingL2, setSubmittingL2] = useState(false);
  
  // L1 Review State
  const [showL1Review, setShowL1Review] = useState(false);
  const [l1Status, setL1Status] = useState('');
  const [l1Comments, setL1Comments] = useState('');
  const [submittingL1, setSubmittingL1] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchUserLevel(currentUser.email);
    }
    fetchMASDetail();
  }, [id]);

  const fetchUserLevel = async (email) => {
    try {
      const response = await apiFetch('/api/auth/user-info', {
        headers: {
          'x-dev-user-email': email,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserLevel(data.user_level);
      }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const fetchMASDetail = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/mas/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMas(data);
      } else {
        console.error('Failed to fetch MAS details');
      }
    } catch (error) {
      console.error('Error fetching MAS details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleL2Review = async () => {
    if (!l2Status) {
      alert('Please select a review status');
      return;
    }

    try {
      setSubmittingL2(true);
      const response = await apiFetch(`/api/mas/${id}/l2-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          l2_status: l2Status,
          l2_comments: l2Comments,
          l2_reviewed_by: user?.email,
        }),
      });

      if (response.ok) {
        alert('L2 Review submitted successfully');
        setShowL2Review(false);
        fetchMASDetail(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to submit L2 review'}`);
      }
    } catch (error) {
      console.error('Error submitting L2 review:', error);
      alert('Error submitting L2 review');
    } finally {
      setSubmittingL2(false);
    }
  };

  const handleL1Review = async () => {
    if (!l1Status) {
      alert('Please select a review status');
      return;
    }

    try {
      setSubmittingL1(true);
      const response = await apiFetch(`/api/mas/${id}/l1-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          l1_status: l1Status,
          l1_comments: l1Comments,
          l1_reviewed_by: user?.email,
        }),
      });

      if (response.ok) {
        alert('L1 Review submitted successfully');
        setShowL1Review(false);
        fetchMASDetail(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to submit L1 review'}`);
      }
    } catch (error) {
      console.error('Error submitting L1 review:', error);
      alert('Error submitting L1 review');
    } finally {
      setSubmittingL1(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Approved: 'bg-green-100 text-green-700 border-green-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      Pending: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.Pending}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Loading MAS details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!mas) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">MAS not found</p>
          <button
            onClick={() => navigate('/mas')}
            className="mt-4 text-lodha-gold hover:text-lodha-gold/80"
          >
            Back to MAS List
          </button>
        </div>
      </Layout>
    );
  }

  const canL2Review = userLevel === 'L2' && mas.l2_status === 'Pending';
  const canL1Review = userLevel === 'L1' && mas.l1_status === 'Pending' && mas.l2_status === 'Approved';

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/mas')}
          className="flex items-center text-gray-600 hover:text-lodha-gold mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to MAS List
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">{mas.mas_ref_no}</h1>
            <p className="text-body">Material Approval Sheet Details</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Final Status</p>
              {getStatusBadge(mas.final_status)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Material Information */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-garamond font-semibold text-lodha-black mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-lodha-gold" />
              Material Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Material Name</p>
                <p className="font-medium text-lodha-black">{mas.material_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-lodha-black">{mas.material_category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Manufacturer</p>
                <p className="font-medium text-lodha-black">{mas.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Model/Specification</p>
                <p className="font-medium text-lodha-black">{mas.model_specification || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium text-lodha-black">{mas.quantity || 'N/A'} {mas.unit || ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted Date</p>
                <p className="font-medium text-lodha-black">{formatDate(mas.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Project & Vendor Information */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-garamond font-semibold text-lodha-black mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-lodha-gold" />
              Project & Vendor Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Project</p>
                <p className="font-medium text-lodha-black">{mas.project_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted By (Vendor)</p>
                <p className="font-medium text-lodha-black">{mas.submitted_by_vendor || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Vendor Email</p>
                <p className="font-medium text-lodha-black">{mas.vendor_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* L2 Review Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-garamond font-semibold text-lodha-black flex items-center">
                <User className="w-5 h-5 mr-2 text-lodha-gold" />
                L2 Review (GM/AGM/DGM)
              </h2>
              {getStatusBadge(mas.l2_status)}
            </div>
            
            {mas.l2_status !== 'Pending' && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{mas.l2_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(mas.l2_reviewed_at)}</p>
                </div>
                {mas.l2_comments && (
                  <div>
                    <p className="text-sm text-gray-500">Comments</p>
                    <p className="font-medium text-lodha-black">{mas.l2_comments}</p>
                  </div>
                )}
              </div>
            )}

            {canL2Review && (
              <div className="mt-4">
                {!showL2Review ? (
                  <button
                    onClick={() => setShowL2Review(true)}
                    className="w-full bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors"
                  >
                    Submit L2 Review
                  </button>
                ) : (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Status *
                      </label>
                      <select
                        value={l2Status}
                        onChange={(e) => setL2Status(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                      >
                        <option value="">Select Status</option>
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments
                      </label>
                      <textarea
                        value={l2Comments}
                        onChange={(e) => setL2Comments(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="Add your review comments..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleL2Review}
                        disabled={submittingL2}
                        className="flex-1 bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50"
                      >
                        {submittingL2 ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        onClick={() => {
                          setShowL2Review(false);
                          setL2Status('');
                          setL2Comments('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* L1 Review Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-garamond font-semibold text-lodha-black flex items-center">
                <User className="w-5 h-5 mr-2 text-lodha-gold" />
                L1 Review (AVP)
              </h2>
              {getStatusBadge(mas.l1_status)}
            </div>
            
            {mas.l1_status !== 'Pending' && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{mas.l1_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(mas.l1_reviewed_at)}</p>
                </div>
                {mas.l1_comments && (
                  <div>
                    <p className="text-sm text-gray-500">Comments</p>
                    <p className="font-medium text-lodha-black">{mas.l1_comments}</p>
                  </div>
                )}
              </div>
            )}

            {canL1Review && (
              <div className="mt-4">
                {!showL1Review ? (
                  <button
                    onClick={() => setShowL1Review(true)}
                    className="w-full bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors"
                  >
                    Submit L1 Review
                  </button>
                ) : (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Status *
                      </label>
                      <select
                        value={l1Status}
                        onChange={(e) => setL1Status(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                      >
                        <option value="">Select Status</option>
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments
                      </label>
                      <textarea
                        value={l1Comments}
                        onChange={(e) => setL1Comments(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                        placeholder="Add your review comments..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleL1Review}
                        disabled={submittingL1}
                        className="flex-1 bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50"
                      >
                        {submittingL1 ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        onClick={() => {
                          setShowL1Review(false);
                          setL1Status('');
                          setL1Comments('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mas.l2_status === 'Pending' && userLevel === 'L1' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Waiting for L2 review to be completed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status Summary */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-garamond font-semibold text-lodha-black mb-4">
              Approval Workflow
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {mas.l2_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : mas.l2_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">L2 Review</p>
                  <p className="text-sm text-gray-500">GM/AGM/DGM</p>
                  <div className="mt-1">{getStatusBadge(mas.l2_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-gray-300 ml-3 h-8"></div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {mas.l1_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : mas.l1_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">L1 Review</p>
                  <p className="text-sm text-gray-500">AVP</p>
                  <div className="mt-1">{getStatusBadge(mas.l1_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-gray-300 ml-3 h-8"></div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {mas.final_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : mas.final_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">Final Status</p>
                  <p className="text-sm text-gray-500">Overall Decision</p>
                  <div className="mt-1">{getStatusBadge(mas.final_status)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {mas.attachment_urls && mas.attachment_urls.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-garamond font-semibold text-lodha-black mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-lodha-gold" />
                Attachments
              </h2>
              <div className="space-y-2">
                {mas.attachment_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-sm text-lodha-black truncate">{url}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
