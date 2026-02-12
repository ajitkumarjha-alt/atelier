import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, User, Building, MessageSquare, CheckCircle, XCircle, Clock, UserPlus } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';

export default function RFIDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfi, setRfi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState('');
  
  // Status Update State
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [responseText, setResponseText] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Consultant Referral State
  const [consultants, setConsultants] = useState([]);
  const [showConsultantReferral, setShowConsultantReferral] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchUserLevel(currentUser.email);
    }
    fetchRFIDetail();
    fetchConsultants();
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

  const fetchRFIDetail = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/rfi/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfi(data);
      } else {
        console.error('Failed to fetch RFI details');
      }
    } catch (error) {
      console.error('Error fetching RFI details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultants = async () => {
    try {
      const response = await apiFetch('/api/consultants/list', {
        headers: {
          'x-dev-user-email': user?.email,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConsultants(data);
      }
    } catch (error) {
      console.error('Error fetching consultants:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      alert('Please select a status');
      return;
    }

    try {
      setSubmittingUpdate(true);
      const response = await apiFetch(`/api/rfi/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          status: newStatus,
          project_team_response: responseText,
        }),
      });

      if (response.ok) {
        alert('Status updated successfully');
        setShowStatusUpdate(false);
        fetchRFIDetail(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to update status'}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleReferToConsultant = async () => {
    if (!selectedConsultantId) {
      alert('Please select a consultant');
      return;
    }

    try {
      setSubmittingReferral(true);
      const response = await apiFetch(`/api/rfi/${id}/refer-consultant`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          consultant_id: selectedConsultantId,
        }),
      });

      if (response.ok) {
        alert('Successfully referred to consultant');
        setShowConsultantReferral(false);
        setSelectedConsultantId('');
        fetchRFIDetail(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to refer to consultant'}`);
      }
    } catch (error) {
      console.error('Error referring to consultant:', error);
      alert('Error referring to consultant');
    } finally {
      setSubmittingReferral(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Approved: 'bg-green-100 text-green-700 border-green-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
      Pending: 'bg-orange-100 text-orange-700 border-orange-200',
      Closed: 'bg-lodha-sand text-lodha-grey border-lodha-steel/30',
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

  const parseDisciplines = (disciplinesString) => {
    try {
      const parsed = JSON.parse(disciplinesString);
      return Object.keys(parsed).filter(key => parsed[key]);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-lodha-grey">Loading RFI details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!rfi) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lodha-grey">RFI not found</p>
          <button
            onClick={() => navigate('/cm-dashboard')}
            className="mt-4 text-lodha-gold hover:text-lodha-gold/80"
          >
            Back to CM Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const disciplines = parseDisciplines(rfi.disciplines || '{}');
  const canUpdate = ['L2', 'L1', 'CM', 'SUPER_ADMIN'].includes(userLevel);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/cm-dashboard')}
          className="flex items-center text-lodha-grey hover:text-lodha-gold mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to CM Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">{rfi.rfi_ref_no}</h1>
            <p className="text-body">Request for Information Details</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-lodha-grey/70">Status</p>
              {getStatusBadge(rfi.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Part A - General Information */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-lodha-gold" />
              Part A - General Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-lodha-grey/70">Project Name</p>
                <p className="font-medium text-lodha-black">{rfi.project_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Record No</p>
                <p className="font-medium text-lodha-black">{rfi.record_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Revision</p>
                <p className="font-medium text-lodha-black">{rfi.revision || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Date Raised</p>
                <p className="font-medium text-lodha-black">{formatDate(rfi.date_raised)}</p>
              </div>
            </div>
          </div>

          {/* Part B - Disciplines */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Part B - Disciplines
            </h2>
            <div className="flex flex-wrap gap-2">
              {disciplines.length > 0 ? (
                disciplines.map((discipline, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-lodha-gold/10 text-lodha-black rounded-full text-sm border border-lodha-gold/30"
                  >
                    {discipline}
                  </span>
                ))
              ) : (
                <p className="text-lodha-grey/70">No disciplines specified</p>
              )}
            </div>
          </div>

          {/* Part C - RFI Subject and Description */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-lodha-gold" />
              Part C - RFI Subject & Description
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-lodha-grey/70 mb-2">RFI Subject</p>
                <p className="font-medium text-lodha-black">{rfi.rfi_subject || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70 mb-2">RFI Description</p>
                <p className="text-lodha-black whitespace-pre-wrap">{rfi.rfi_description || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Part D - Responses */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Part D - Project Team Response
            </h2>
            <div className="bg-lodha-sand/40 p-4 rounded-lg">
              {rfi.project_team_response ? (
                <p className="text-lodha-black whitespace-pre-wrap">{rfi.project_team_response}</p>
              ) : (
                <p className="text-lodha-grey/70 italic">No response yet</p>
              )}
            </div>
          </div>

          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Part E - Design Team Response
            </h2>
            <div className="bg-lodha-sand/40 p-4 rounded-lg">
              {rfi.design_team_response ? (
                <p className="text-lodha-black whitespace-pre-wrap">{rfi.design_team_response}</p>
              ) : (
                <p className="text-lodha-grey/70 italic">No response yet</p>
              )}
            </div>
          </div>

          {/* Status Update Section */}
          {canUpdate && (
            <div className="section-card p-6">
              <h2 className="heading-tertiary mb-4">
                Update Status
              </h2>
              
              {!showStatusUpdate ? (
                <button
                  onClick={() => setShowStatusUpdate(true)}
                  className="w-full bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors"
                >
                  Update RFI Status
                </button>
              ) : (
                <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      New Status *
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Status</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                      Response/Comments
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={6}
                      className="input-field"
                      placeholder="Add your response or comments..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleStatusUpdate}
                      disabled={submittingUpdate}
                      className="flex-1 bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50"
                    >
                      {submittingUpdate ? 'Updating...' : 'Update Status'}
                    </button>
                    <button
                      onClick={() => {
                        setShowStatusUpdate(false);
                        setNewStatus('');
                        setResponseText('');
                      }}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Consultant Referral Section */}
          {(userLevel === 'L1' || userLevel === 'L2' || userLevel === 'CM') && (
            <div className="section-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-tertiary flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-lodha-gold" />
                  MEP Consultant Review
                </h2>
                {rfi.consultant_replied_at && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-sm font-medium">
                    Replied
                  </span>
                )}
              </div>

              {rfi.referred_to_consultant_id && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    Referred to consultant
                  </p>
                  {rfi.consultant_reply && (
                    <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                      <p className="text-sm font-medium text-lodha-grey mb-2">Consultant Response:</p>
                      <p className="text-lodha-black whitespace-pre-wrap">{rfi.consultant_reply}</p>
                      <p className="text-xs text-lodha-grey/70 mt-2">
                        Replied on: {formatDate(rfi.consultant_replied_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!rfi.referred_to_consultant_id && (
                <div className="mt-4">
                  {!showConsultantReferral ? (
                    <button
                      onClick={() => setShowConsultantReferral(true)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Refer to Consultant
                    </button>
                  ) : (
                    <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                      <div>
                        <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                          Select Consultant *
                        </label>
                        <select
                          value={selectedConsultantId}
                          onChange={(e) => setSelectedConsultantId(e.target.value)}
                          className="input-field"
                        >
                          <option value="">Choose a consultant</option>
                          {consultants.map(consultant => (
                            <option key={consultant.id} value={consultant.id}>
                              {consultant.name} - {consultant.company_name || consultant.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleReferToConsultant}
                          disabled={submittingReferral}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {submittingReferral ? 'Referring...' : 'Refer Now'}
                        </button>
                        <button
                          onClick={() => {
                            setShowConsultantReferral(false);
                            setSelectedConsultantId('');
                          }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Raised By */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-lodha-gold" />
              Raised By
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-lodha-grey/70">Name</p>
                <p className="font-medium text-lodha-black">{rfi.raised_by || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Email</p>
                <p className="font-medium text-lodha-black break-all">{rfi.raised_by_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-lodha-gold" />
              Timeline
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-lodha-grey/70">Created</p>
                <p className="font-medium text-lodha-black">{formatDate(rfi.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Last Updated</p>
                <p className="font-medium text-lodha-black">{formatDate(rfi.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {rfi.attachment_urls && rfi.attachment_urls.length > 0 && (
            <div className="section-card p-6">
              <h2 className="heading-tertiary mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-lodha-gold" />
                Attachments
              </h2>
              <div className="space-y-2">
                {rfi.attachment_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-lodha-sand/40 rounded-lg hover:bg-lodha-sand transition-colors"
                  >
                    <p className="text-sm text-lodha-black truncate">{url}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Current Status
            </h2>
            <div className="flex items-center justify-center p-4">
              {rfi.status === 'Approved' ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-green-700">Approved</p>
                </div>
              ) : rfi.status === 'Rejected' ? (
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <p className="font-medium text-red-700">Rejected</p>
                </div>
              ) : rfi.status === 'In Progress' ? (
                <div className="text-center">
                  <Clock className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="font-medium text-blue-700">In Progress</p>
                </div>
              ) : (
                <div className="text-center">
                  <Clock className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                  <p className="font-medium text-orange-700">Pending</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
