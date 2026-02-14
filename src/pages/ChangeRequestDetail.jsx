import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/firebase';
import { useConfirm } from '../hooks/useDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { showSuccess, showError, showWarning } from '../utils/toast';

export default function ChangeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [changeRequest, setChangeRequest] = useState(null);
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

  // Implementation State
  const [implementing, setImplementing] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchUserLevel(currentUser.email);
    }
    fetchChangeRequestDetail();
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

  const fetchChangeRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/change-requests/${id}`);
      if (response.ok) {
        const data = await response.json();
        setChangeRequest(data);
      } else {
        console.error('Failed to fetch change request details');
      }
    } catch (error) {
      console.error('Error fetching change request details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleL2Review = async () => {
    if (!l2Status) {
      showWarning('Please select a review status');
      return;
    }

    try {
      setSubmittingL2(true);
      const response = await apiFetch(`/api/change-requests/${id}/l2-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          l2_status: l2Status,
          l2_comments: l2Comments,
        }),
      });

      if (response.ok) {
        showSuccess('L2 Review submitted successfully');
        setShowL2Review(false);
        fetchChangeRequestDetail();
      } else {
        const errorData = await response.json();
        showError(`Error: ${errorData.error || 'Failed to submit L2 review'}`);
      }
    } catch (error) {
      console.error('Error submitting L2 review:', error);
      showError('Error submitting L2 review');
    } finally {
      setSubmittingL2(false);
    }
  };

  const handleL1Review = async () => {
    if (!l1Status) {
      showWarning('Please select a review status');
      return;
    }

    try {
      setSubmittingL1(true);
      const response = await apiFetch(`/api/change-requests/${id}/l1-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          l1_status: l1Status,
          l1_comments: l1Comments,
        }),
      });

      if (response.ok) {
        showSuccess('L1 Review submitted successfully');
        setShowL1Review(false);
        fetchChangeRequestDetail();
      } else {
        const errorData = await response.json();
        showError(`Error: ${errorData.error || 'Failed to submit L1 review'}`);
      }
    } catch (error) {
      console.error('Error submitting L1 review:', error);
      showError('Error submitting L1 review');
    } finally {
      setSubmittingL1(false);
    }
  };

  const handleMarkImplemented = async () => {
    const confirmed = await confirm({ title: 'Confirm Implementation', message: 'Mark this change request as implemented?', variant: 'warning', confirmLabel: 'Mark Implemented' });
    if (!confirmed) return;

    try {
      setImplementing(true);
      const response = await apiFetch(`/api/change-requests/${id}/implement`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
      });

      if (response.ok) {
        showSuccess('Change request marked as implemented');
        fetchChangeRequestDetail();
      } else {
        const errorData = await response.json();
        showError(`Error: ${errorData.error || 'Failed to mark as implemented'}`);
      }
    } catch (error) {
      console.error('Error marking as implemented:', error);
      showError('Error marking as implemented');
    } finally {
      setImplementing(false);
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

  const getPriorityIcon = (priority) => {
    if (priority === 'High') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (priority === 'Medium') return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-green-600" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lodha-gold mx-auto mb-4"></div>
            <p className="text-lodha-grey font-jost">Loading change request...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!changeRequest) {
    return (
      <Layout>
        <div className="empty-state">
          <p className="text-lodha-grey">Change request not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-lodha-gold hover:text-lodha-gold/80"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const canL2Review = userLevel === 'L2' && changeRequest.l2_status === 'Pending';
  const canL1Review = userLevel === 'L1' && changeRequest.l1_status === 'Pending' && changeRequest.l2_status === 'Approved';
  const canImplement = ['L1', 'L2', 'SUPER_ADMIN'].includes(userLevel) && 
                       changeRequest.final_status === 'Approved' && 
                       !changeRequest.implemented;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-lodha-grey hover:text-lodha-gold mb-4 transition-colors font-jost"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">{changeRequest.change_ref_no}</h1>
            <p className="text-body">{changeRequest.project_name}</p>
          </div>
          <div className="flex items-center gap-4">
            {getPriorityIcon(changeRequest.priority)}
            <div className="text-right">
              <p className="text-sm text-lodha-grey/70">Final Status</p>
              {getStatusBadge(changeRequest.final_status)}
            </div>
            {changeRequest.implemented && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Implemented</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Change Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change Information */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Change Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-lodha-grey/70 font-jost">Change Type</p>
                <p className="font-medium text-lodha-black">{changeRequest.change_type}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70 font-jost">Category</p>
                <p className="font-medium text-lodha-black font-jost">{changeRequest.change_category}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70 font-jost">Description</p>
                <p className="text-lodha-black whitespace-pre-wrap">{changeRequest.change_description}</p>
              </div>
              {changeRequest.justification && (
                <div>
                  <p className="text-sm text-lodha-grey/70">Justification</p>
                  <p className="text-lodha-black whitespace-pre-wrap">{changeRequest.justification}</p>
                </div>
              )}
              {changeRequest.impact_assessment && (
                <div>
                  <p className="text-sm text-lodha-grey/70">Impact Assessment</p>
                  <p className="text-lodha-black whitespace-pre-wrap">{changeRequest.impact_assessment}</p>
                </div>
              )}
            </div>
          </div>

          {/* L2 Review Section */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-tertiary flex items-center">
                <User className="w-5 h-5 mr-2 text-lodha-gold" />
                L2 Review (GM/AGM/DGM)
              </h2>
              {getStatusBadge(changeRequest.l2_status)}
            </div>
            
            {changeRequest.l2_status !== 'Pending' && (
              <div className="space-y-3 bg-lodha-sand/40 p-5 rounded-xl">
                <div>
                  <p className="text-sm text-lodha-grey/70">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{changeRequest.l2_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-lodha-grey/70">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(changeRequest.l2_reviewed_at)}</p>
                </div>
                {changeRequest.l2_comments && (
                  <div>
                    <p className="text-sm text-lodha-grey/70">Comments</p>
                    <p className="font-medium text-lodha-black">{changeRequest.l2_comments}</p>
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
                  <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Review Decision *
                      </label>
                      <select
                        value={l2Status}
                        onChange={(e) => setL2Status(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Decision</option>
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Comments
                      </label>
                      <textarea
                        value={l2Comments}
                        onChange={(e) => setL2Comments(e.target.value)}
                        rows={4}
                        className="input-field"
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

          {/* L1 Review Section */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-tertiary flex items-center">
                <User className="w-5 h-5 mr-2 text-lodha-gold" />
                L1 Review (AVP)
              </h2>
              {getStatusBadge(changeRequest.l1_status)}
            </div>
            
            {changeRequest.l1_status !== 'Pending' && (
              <div className="space-y-3 bg-lodha-sand/40 p-5 rounded-xl">
                <div>
                  <p className="text-sm text-lodha-grey/70">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{changeRequest.l1_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-lodha-grey/70">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(changeRequest.l1_reviewed_at)}</p>
                </div>
                {changeRequest.l1_comments && (
                  <div>
                    <p className="text-sm text-lodha-grey/70">Comments</p>
                    <p className="font-medium text-lodha-black">{changeRequest.l1_comments}</p>
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
                  <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Review Decision *
                      </label>
                      <select
                        value={l1Status}
                        onChange={(e) => setL1Status(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Decision</option>
                        <option value="Approved">Approve</option>
                        <option value="Rejected">Reject</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Comments
                      </label>
                      <textarea
                        value={l1Comments}
                        onChange={(e) => setL1Comments(e.target.value)}
                        rows={4}
                        className="input-field"
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
                        className="btn-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {changeRequest.l2_status === 'Pending' && userLevel === 'L1' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Waiting for L2 review to be completed
                </p>
              </div>
            )}
          </div>

          {/* Implementation Section */}
          {canImplement && (
            <div className="section-card p-6">
              <h2 className="heading-tertiary mb-4">
                Implementation
              </h2>
              <p className="text-sm text-lodha-grey mb-4">
                This change request has been approved. Mark it as implemented once the changes have been applied to the project.
              </p>
              <button
                onClick={handleMarkImplemented}
                disabled={implementing}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {implementing ? 'Marking as Implemented...' : 'Mark as Implemented'}
              </button>
            </div>
          )}

          {changeRequest.implemented && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Change Implemented</h3>
              </div>
              <div className="space-y-2 text-sm text-green-700">
                <p>Implemented by: {changeRequest.implemented_by}</p>
                <p>Implemented on: {formatDate(changeRequest.implemented_at)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Metadata & Workflow */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
              Approval Workflow
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {changeRequest.l2_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : changeRequest.l2_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">L2 Review</p>
                  <p className="text-sm text-lodha-grey/70">GM/AGM/DGM</p>
                  <div className="mt-1">{getStatusBadge(changeRequest.l2_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-lodha-steel/40 ml-3 h-6"></div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {changeRequest.l1_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : changeRequest.l1_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">L1 Review</p>
                  <p className="text-sm text-lodha-grey/70">AVP</p>
                  <div className="mt-1">{getStatusBadge(changeRequest.l1_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-lodha-steel/40 ml-3 h-6"></div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {changeRequest.final_status === 'Approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : changeRequest.final_status === 'Rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-lodha-black">Final Status</p>
                  <p className="text-sm text-lodha-grey/70">Overall Decision</p>
                  <div className="mt-1">{getStatusBadge(changeRequest.final_status)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Request Metadata */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-lodha-gold" />
              Request Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-lodha-grey/70">Requested By</p>
                <p className="font-medium text-lodha-black">{changeRequest.requested_by}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Request Date</p>
                <p className="font-medium text-lodha-black">{formatDate(changeRequest.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Last Updated</p>
                <p className="font-medium text-lodha-black">{formatDate(changeRequest.updated_at)}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Priority</p>
                <div className="flex items-center gap-2 mt-1">
                  {getPriorityIcon(changeRequest.priority)}
                  <p className="font-medium text-lodha-black">{changeRequest.priority}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog {...dialogProps} />
    </Layout>
  );
}
