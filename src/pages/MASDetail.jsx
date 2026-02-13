import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, User, Building, Package, CheckCircle, XCircle, Clock, MessageSquare, UserPlus } from 'lucide-react';
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

  // Assignment State
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

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
    fetchMASDetail();
    fetchConsultants();
  }, [id]);

  // Fetch team members when MAS loads (for assignment)
  useEffect(() => {
    if (mas?.project_id) {
      fetchTeamMembers(mas.project_id);
    }
  }, [mas?.project_id]);

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

  const fetchTeamMembers = async (projectId) => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleAssign = async () => {
    if (!assignUserId) {
      alert('Please select a team member to assign');
      return;
    }
    try {
      setSubmittingAssign(true);
      const response = await apiFetch(`/api/mas/${id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': user?.email,
        },
        body: JSON.stringify({
          assigned_to_id: assignUserId,
          due_date: assignDueDate || null,
        }),
      });
      if (response.ok) {
        alert('Assignment updated successfully');
        setAssignUserId('');
        setAssignDueDate('');
        fetchMASDetail();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to assign'}`);
      }
    } catch (error) {
      console.error('Error assigning MAS:', error);
      alert('Error assigning MAS');
    } finally {
      setSubmittingAssign(false);
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

  const handleReferToConsultant = async () => {
    if (!selectedConsultantId) {
      alert('Please select a consultant');
      return;
    }

    try {
      setSubmittingReferral(true);
      const response = await apiFetch(`/api/mas/${id}/refer-consultant`, {
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
        fetchMASDetail(); // Refresh data
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
            <p className="text-lodha-grey">Loading MAS details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!mas) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-lodha-grey">MAS not found</p>
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
          className="flex items-center text-lodha-grey hover:text-lodha-gold mb-4 transition-colors"
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
              <p className="text-sm text-lodha-grey/70">Final Status</p>
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
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-lodha-gold" />
              Material Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-lodha-grey/70">Material Name</p>
                <p className="font-medium text-lodha-black">{mas.material_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Category</p>
                <p className="font-medium text-lodha-black">{mas.material_category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Manufacturer</p>
                <p className="font-medium text-lodha-black">{mas.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Model/Specification</p>
                <p className="font-medium text-lodha-black">{mas.model_specification || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Quantity</p>
                <p className="font-medium text-lodha-black">{mas.quantity || 'N/A'} {mas.unit || ''}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Submitted Date</p>
                <p className="font-medium text-lodha-black">{formatDate(mas.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Project & Vendor Information */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2 text-lodha-gold" />
              Project & Vendor Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-lodha-grey/70">Project</p>
                <p className="font-medium text-lodha-black">{mas.project_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-lodha-grey/70">Submitted By (Vendor)</p>
                <p className="font-medium text-lodha-black">{mas.submitted_by_vendor || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-lodha-grey/70">Vendor Email</p>
                <p className="font-medium text-lodha-black">{mas.vendor_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* L2 Review Section */}
          <div className="section-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-tertiary flex items-center">
                <User className="w-5 h-5 mr-2 text-lodha-gold" />
                L2 Review (GM/AGM/DGM)
              </h2>
              {getStatusBadge(mas.l2_status)}
            </div>
            
            {mas.l2_status !== 'Pending' && (
              <div className="space-y-3 bg-lodha-sand/40 p-5 rounded-xl">
                <div>
                  <p className="text-sm text-lodha-grey/70">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{mas.l2_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-lodha-grey/70">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(mas.l2_reviewed_at)}</p>
                </div>
                {mas.l2_comments && (
                  <div>
                    <p className="text-sm text-lodha-grey/70">Comments</p>
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
                  <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Review Status *
                      </label>
                      <select
                        value={l2Status}
                        onChange={(e) => setL2Status(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Status</option>
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
              {getStatusBadge(mas.l1_status)}
            </div>
            
            {mas.l1_status !== 'Pending' && (
              <div className="space-y-3 bg-lodha-sand/40 p-5 rounded-xl">
                <div>
                  <p className="text-sm text-lodha-grey/70">Reviewed By</p>
                  <p className="font-medium text-lodha-black">{mas.l1_reviewed_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-lodha-grey/70">Review Date</p>
                  <p className="font-medium text-lodha-black">{formatDate(mas.l1_reviewed_at)}</p>
                </div>
                {mas.l1_comments && (
                  <div>
                    <p className="text-sm text-lodha-grey/70">Comments</p>
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
                  <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                        Review Status *
                      </label>
                      <select
                        value={l1Status}
                        onChange={(e) => setL1Status(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Status</option>
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

            {mas.l2_status === 'Pending' && userLevel === 'L1' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Waiting for L2 review to be completed
                </p>
              </div>
            )}
          </div>

          {/* Assignment Section */}
          {(userLevel === 'L0' || userLevel === 'L1' || userLevel === 'L2') && (
            <div className="section-card p-6">
              <h2 className="heading-tertiary mb-4 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-lodha-gold" />
                Assignment
              </h2>

              {mas.assigned_to_name && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Currently Assigned to:</span> {mas.assigned_to_name}
                  </p>
                  {mas.assigned_by_name && (
                    <p className="text-xs text-blue-600 mt-1">Assigned by: {mas.assigned_by_name}</p>
                  )}
                  {mas.due_date && (
                    <p className="text-xs text-blue-600 mt-1">Due: {formatDate(mas.due_date)}</p>
                  )}
                </div>
              )}

              <div className="space-y-4 bg-lodha-sand/40 p-5 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                    {mas.assigned_to_name ? 'Reassign To' : 'Assign To'} *
                  </label>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map(member => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.full_name} ({member.user_level})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-lodha-grey font-jost mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handleAssign}
                  disabled={submittingAssign || !assignUserId}
                  className="w-full bg-lodha-gold text-white py-2 px-4 rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {submittingAssign ? 'Assigning...' : (mas.assigned_to_name ? 'Reassign' : 'Assign')}
                </button>
              </div>
            </div>
          )}

          {/* Consultant Referral Section */}
          {(userLevel === 'L1' || userLevel === 'L2') && (
            <div className="section-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-tertiary flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-lodha-gold" />
                  MEP Consultant Review
                </h2>
                {mas.consultant_replied_at && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-sm font-medium">
                    Replied
                  </span>
                )}
              </div>

              {mas.referred_to_consultant_id && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    Referred to consultant
                  </p>
                  {mas.consultant_reply && (
                    <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                      <p className="text-sm font-medium text-lodha-grey mb-2">Consultant Response:</p>
                      <p className="text-lodha-black whitespace-pre-wrap">{mas.consultant_reply}</p>
                      <p className="text-xs text-lodha-grey/70 mt-2">
                        Replied on: {formatDate(mas.consultant_replied_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!mas.referred_to_consultant_id && (
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

        {/* Right Column - Status Summary */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          <div className="section-card p-6">
            <h2 className="heading-tertiary mb-4">
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
                  <p className="text-sm text-lodha-grey/70">GM/AGM/DGM</p>
                  <div className="mt-1">{getStatusBadge(mas.l2_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-lodha-steel ml-3 h-8"></div>

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
                  <p className="text-sm text-lodha-grey/70">AVP</p>
                  <div className="mt-1">{getStatusBadge(mas.l1_status)}</div>
                </div>
              </div>

              <div className="border-l-2 border-lodha-steel ml-3 h-8"></div>

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
                  <p className="text-sm text-lodha-grey/70">Overall Decision</p>
                  <div className="mt-1">{getStatusBadge(mas.final_status)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {mas.attachment_urls && mas.attachment_urls.length > 0 && (
            <div className="section-card p-6">
              <h2 className="heading-tertiary mb-4 flex items-center">
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
                    className="block p-3 bg-lodha-sand/40 rounded-lg hover:bg-lodha-sand transition-colors"
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
