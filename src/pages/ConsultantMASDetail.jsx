import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, ArrowLeft, FileText, Send, CheckCircle } from 'lucide-react';

export default function ConsultantMASDetail() {
  const { masId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mas, setMas] = useState(null);
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

    fetchMASDetails();
  }, [masId, navigate]);

  async function fetchMASDetails() {
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

      const response = await fetch(`/api/consultants/mas/${masId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch MAS details');
      }

      const data = await response.json();
      setMas(data);
      setReply(data.consultant_reply || '');
    } catch (err) {
      console.error('Error fetching MAS:', err);
      setError(err.message || 'Failed to load MAS details');
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

      const response = await fetch(`/api/consultants/mas/${masId}/reply`, {
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

      await fetchMASDetails(); // Refresh data
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

  if (!mas) {
    return (
      <div className="min-h-screen bg-lodha-sand flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">MAS not found</p>
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/consultant-dashboard')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-garamond font-bold text-lodha-gold">
                Material Approval Sheet
              </h1>
              <p className="text-sm text-gray-600">Review and respond</p>
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

        {/* MAS Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Project</p>
              <p className="font-medium text-gray-900">{mas.project_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-block px-2 py-1 text-xs rounded ${
                mas.status === 'approved' ? 'bg-green-100 text-green-800' :
                mas.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {mas.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Material Name</p>
              <p className="font-medium text-gray-900">{mas.material_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Manufacturer</p>
              <p className="font-medium text-gray-900">{mas.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Model/Specification</p>
              <p className="font-medium text-gray-900">{mas.model_specification || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="font-medium text-gray-900">{mas.quantity} {mas.unit || ''}</p>
            </div>
          </div>

          {mas.notes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 mb-2">Notes</p>
              <p className="text-gray-900">{mas.notes}</p>
            </div>
          )}
        </div>

        {/* Consultant Reply Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-lodha-gold" />
            <h2 className="text-lg font-semibold text-gray-900">Your Response</h2>
            {mas.consultant_replied_at && (
              <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
            )}
          </div>

          {mas.consultant_replied_at && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              Reply submitted on {new Date(mas.consultant_replied_at).toLocaleString()}
            </div>
          )}

          <form onSubmit={handleSubmitReply}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
              placeholder="Enter your response, recommendations, or approval comments..."
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
