import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Download, Eye, ArrowLeft, FileText } from 'lucide-react';

export default function ConsultantProjectDrawings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const consultantToken = localStorage.getItem('consultantToken');
    const isSuperAdmin = localStorage.getItem('devUserEmail')?.includes('@lodhagroup.com');
    
    if (!consultantToken && !isSuperAdmin) {
      navigate('/consultant-login');
      return;
    }

    fetchProjectDrawings();
  }, [projectId, navigate]);

  async function fetchProjectDrawings() {
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

      // Fetch project details
      const projectRes = await fetch(`/api/consultants/project/${projectId}`, {
        headers,
      });

      if (!projectRes.ok) {
        throw new Error('Failed to fetch project details');
      }

      const projectData = await projectRes.json();
      setProject(projectData);

      // Fetch drawings for the project
      const drawingsRes = await fetch(`/api/consultants/project/${projectId}/drawings`, {
        headers: {
          'Authorization': `Bearer ${consultantToken}`,
          'x-consultant-email': consultantEmail,
        },
      });

      if (drawingsRes.ok) {
        const drawingsData = await drawingsRes.json();
        setDrawings(drawingsData);
      }
    } catch (err) {
      console.error('Error fetching drawings:', err);
      setError(err.message || 'Failed to load drawings');
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (drawingId, fileName) => {
    try {
      const consultantEmail = localStorage.getItem('consultantEmail');
      const consultantToken = localStorage.getItem('consultantToken');

      const response = await fetch(`/api/consultants/drawings/${drawingId}/download`, {
        headers: {
          'Authorization': `Bearer ${consultantToken}`,
          'x-consultant-email': consultantEmail,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download drawing');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading drawing:', err);
      alert('Failed to download drawing');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lodha-sand">
        <Loader className="w-8 h-8 text-lodha-gold animate-spin" />
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
                {project?.name || 'Project'} - Drawings
              </h1>
              <p className="text-sm text-lodha-grey">View and download project drawings</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {drawings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-12 h-12 text-lodha-steel mx-auto mb-4" />
            <p className="text-lodha-grey/70">No drawings available for this project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drawings.map(drawing => (
              <div key={drawing.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <FileText className="w-6 h-6 text-lodha-gold flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lodha-black truncate">
                      {drawing.file_name}
                    </h3>
                    <p className="text-sm text-lodha-grey/70 mt-1">
                      {drawing.drawing_type || 'Drawing'}
                    </p>
                    <p className="text-xs text-lodha-grey/50 mt-1">
                      Version: {drawing.version || '1.0'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(drawing.id, drawing.file_name)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-lodha-gold text-white rounded-md hover:bg-lodha-deep text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
