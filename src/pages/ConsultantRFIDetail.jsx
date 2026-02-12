import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, ArrowLeft, MessageSquare, Send, CheckCircle } from 'lucide-react';

export default function ConsultantRFIDetail() {
  const { rfiId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rfi, setRfi] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const consultantToken = localStorage.getItem('consultantToken');
    const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');
    
    if (!consultantToken && !isSuperAdmin) {
      navigate('/consultant-login');
      return;
    }

    fetchRFIDetails();
  }, [rfiId, navigate]);

  async function fetchRFIDetails() {
    try {
      setLoading(true);
      const consultantEmail = localStorage.getItem('consultantEmail');
      const consultantToken = localStorage.getItem('consultantToken');
      const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');

      const headers = isSuperAdmin && !consultantEmail ? {
        'x-dev-user-email': localStorage.getItem('devUserEmail'),
      } : {
        'Authorization': `Bearer ${consultantToken}`,
        'x-consultant-email': consultantEmail,
      };

      const response = await fetch(`/api/consultants/rfi/${rfiId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RFI details');
      }

      const data = await response.json();
      setRfi(data);
      setReply(data.consultant_reply || '');
    } catch (err) {
      console.error('Error fetching RFI:', err);
      setError(err.message || 'Failed to load RFI details');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const consultantEmail = localStorage.getItem('consultantEmail');
      const consultantToken = localStorage.getItem('consultantToken');

      const response = await fetch(`/api/consultants/rfi/${rfiId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consultantToken}`,
          'x-consultant-email': consultantEmail,
        },
        body: JSON.stringify({ reply }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }

      await fetchRFIDetails(); // Refresh data
      alert('Reply submitted successfully!');
    } catch (err) {
      console.error('Error submitting reply:', err);
      setError(err.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
      </div>
    );
  }

  if (!rfi) {
    return (
      <div className="min-h-screen bg-lodha-sand flex items-center justify-center">
        <div className="text-center">
          <p className="text-lodha-grey/70">RFI not found</p>
          <button
            onClick={() => navigate('/consultant-dashboard')}
            className="mt-4 text-lodha-gold hover:text-lodha-deep"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lodha-sand">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-lodha-steel/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/consultant-dashboard')}
              className="p-2 hover:bg-lodha-sand rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-garamond font-bold text-lodha-gold tracking-tight">
                Request for Information
              </h1>
              <p className="text-sm text-lodha-grey">Review and respond</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* RFI Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-garamond font-bold text-lodha-gold mb-2">
              {rfi.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-lodha-grey/70">
              <span>Project: {rfi.project_name}</span>
              <span>•</span>
              <span>Raised by: {rfi.raised_by_name}</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded ${
                rfi.status === 'resolved' ? 'bg-green-100 text-green-800' :
                rfi.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {rfi.status}
              </span>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-lodha-grey/70 mb-2">Description</p>
            <p className="text-lodha-black whitespace-pre-wrap">{rfi.description}</p>
          </div>

          {rfi.location && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-lodha-grey/70 mb-2">Location</p>
              <p className="text-lodha-black">{rfi.location}</p>
            </div>
          )}

          {rfi.priority && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-lodha-grey/70 mb-2">Priority</p>
              <span className={`inline-block px-2 py-1 text-xs rounded ${
                rfi.priority === 'high' ? 'bg-red-100 text-red-800' :
                rfi.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-lodha-sand text-lodha-black'
              }`}>
                {rfi.priority}
              </span>
            </div>
          )}
        </div>

        {/* Consultant Reply Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-lodha-gold" />
            <h2 className="text-lg font-semibold text-lodha-black">Your Response</h2>
            {rfi.consultant_replied_at && (
              <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
            )}
          </div>

          {rfi.consultant_replied_at && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              Reply submitted on {new Date(rfi.consultant_replied_at).toLocaleString()}
            </div>
          )}

          <form onSubmit={handleSubmitReply}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-lodha-steel rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
              placeholder="Enter your response, clarifications, or technical recommendations..."
              required
            />

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !reply.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-lodha-gold text-white rounded-md hover:bg-lodha-deep disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Response
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
