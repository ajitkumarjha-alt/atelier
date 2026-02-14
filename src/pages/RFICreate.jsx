import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Layout from '../components/Layout';
import { apiFetchJson } from '../lib/api';
import { showSuccess, showError, showWarning } from '../utils/toast';

export default function RFICreate() {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams();
  const isProjectScoped = Boolean(urlProjectId);
  const [currentPage, setCurrentPage] = useState(1);
  const [projectName, setProjectName] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    // Part A: Project & Record Information
    projectName: '',
    projectCode: '',
    clientEmployer: '',
    pmcEngineer: '',
    contractor: '',
    rfiRefNo: '',
    rfiRaisedDate: new Date().toISOString().split('T')[0],
    materialCode: '',
    vendorCode: '',
    
    // Part B: Discipline
    disciplines: {
      civil: false,
      mechanical: false,
      id: false,
      facade: false,
      archFinishing: false,
      electrical: false,
      quality: false,
      others: false,
      landscape: false,
      plumbing: false,
      ehs: false,
      othersSpecify: ''
    },
    
    // Part C: RFI Details
    subjectOfClarification: '',
    detailsOfClarification: '',
    relatedMajorActivities: '',
    remarksByContractor: '',
    attachments: [],
    
    // Part D: Project Team Response (will be filled by project team)
    projectTeamResponse: '',
    
    // Part E: Design Team Response (will be filled by design team)
    designTeamResponse: ''
  });

  const [attachmentFiles, setAttachmentFiles] = useState([]);

  // Fetch project name when project-scoped
  useEffect(() => {
    if (isProjectScoped) {
      apiFetchJson('/api/projects').then(data => {
        const list = Array.isArray(data) ? data : data.projects || [];
        const p = list.find(pr => String(pr.id) === String(urlProjectId));
        if (p) {
          setProjectName(p.name);
          setFormData(prev => ({ ...prev, projectName: p.name }));
        }
      }).catch(() => {});
    }
  }, [isProjectScoped, urlProjectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDisciplineChange = (discipline) => {
    setFormData(prev => ({
      ...prev,
      disciplines: {
        ...prev.disciplines,
        [discipline]: !prev.disciplines[discipline]
      }
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachmentFiles(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.projectName || !formData.rfiSubject) {
      showWarning('Please fill in all required fields (Project Name and RFI Subject)');
      return;
    }

    try {
      // In production, you would upload files to Cloud Storage first
      // For now, we'll just store file names
      const attachmentUrls = attachmentFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // In production, this would be the Cloud Storage URL
        url: `pending-upload/${file.name}`,
      }));

      const response = await fetch('/api/rfi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': localStorage.getItem('devUserEmail') || 'cm@lodhagroup.com',
        },
        body: JSON.stringify({
          projectId: urlProjectId || 1,
          projectName: formData.projectName,
          recordNo: formData.recordNo,
          revision: formData.revision,
          dateRaised: formData.dateRaised,
          disciplines: formData.disciplines,
          rfiSubject: formData.rfiSubject,
          rfiDescription: formData.rfiDescription,
          attachmentUrls,
          raisedBy: formData.raisedBy,
          raisedByEmail: formData.email,
          projectTeamResponse: formData.projectTeamResponse,
          designTeamResponse: formData.designTeamResponse,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(`RFI created successfully! RFI Ref: ${data.rfi_ref_no}`);
        if (isProjectScoped) {
          navigate(`/projects/${urlProjectId}/rfi`);
        } else {
          navigate('/cm-dashboard');
        }
      } else {
        const error = await response.json();
        showError(`Failed to create RFI: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating RFI:', error);
      showError('An error occurred while creating the RFI. Please try again.');
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => isProjectScoped ? navigate(`/projects/${urlProjectId}/rfi`) : navigate('/cm-dashboard')}
          className="flex items-center gap-2 text-lodha-gold hover:text-lodha-black transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-jost font-semibold">{isProjectScoped ? 'Back to RFIs' : 'Back to Dashboard'}</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-primary mb-2">Request for Information - RFI</h1>
            <p className="text-body">Page {currentPage} of 2</p>
          </div>
          <img src="/lodha-logo.png" alt="Lodha" className="h-12" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Page 1 */}
        {currentPage === 1 && (
          <>
            {/* Part A: Project & Record Information */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-6 py-3 border-l-4 border-lodha-gold">
                <h2 className="font-garamond font-bold text-lg text-lodha-black">
                  Part A: Project & Record Information
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Project Name</label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">RFI Ref. No</label>
                    <input
                      type="text"
                      name="rfiRefNo"
                      value={formData.rfiRefNo}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">Project Code</label>
                    <input
                      type="text"
                      name="projectCode"
                      value={formData.projectCode}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="label">RFI Raised Date</label>
                    <input
                      type="date"
                      name="rfiRaisedDate"
                      value={formData.rfiRaisedDate}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">Client/Employer</label>
                    <input
                      type="text"
                      name="clientEmployer"
                      value={formData.clientEmployer}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Material Code</label>
                    <input
                      type="text"
                      name="materialCode"
                      value={formData.materialCode}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="label">PMC/Engineer</label>
                    <input
                      type="text"
                      name="pmcEngineer"
                      value={formData.pmcEngineer}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Vendor Code</label>
                    <input
                      type="text"
                      name="vendorCode"
                      value={formData.vendorCode}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="label">Contractor</label>
                    <input
                      type="text"
                      name="contractor"
                      value={formData.contractor}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Part B: Discipline */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-6 py-3 border-l-4 border-lodha-gold">
                <h2 className="font-garamond font-bold text-lg text-lodha-black">
                  Part B: Request for Information Discipline
                </h2>
              </div>
              
              <div className="p-6">
                <label className="label mb-3">Related Discipline</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'civil', label: 'Civil' },
                    { key: 'archFinishing', label: 'Arch / Finishing' },
                    { key: 'landscape', label: 'Landscape' },
                    { key: 'mechanical', label: 'Mechanical' },
                    { key: 'electrical', label: 'Electrical' },
                    { key: 'plumbing', label: 'Plumbing' },
                    { key: 'id', label: 'ID' },
                    { key: 'quality', label: 'Quality' },
                    { key: 'ehs', label: 'EHS' },
                    { key: 'facade', label: 'Facade' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.disciplines[key]}
                        onChange={() => handleDisciplineChange(key)}
                        className="w-4 h-4 text-lodha-gold focus:ring-lodha-gold border-lodha-steel rounded"
                      />
                      <span className="font-jost text-sm text-lodha-black">{label}</span>
                    </label>
                  ))}
                </div>
                
                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.disciplines.others}
                      onChange={() => handleDisciplineChange('others')}
                      className="w-4 h-4 text-lodha-gold focus:ring-lodha-gold border-lodha-steel rounded"
                    />
                    <span className="font-jost text-sm text-lodha-black">Others (Specify)</span>
                  </label>
                  {formData.disciplines.others && (
                    <input
                      type="text"
                      name="othersSpecify"
                      value={formData.disciplines.othersSpecify}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        disciplines: { ...prev.disciplines, othersSpecify: e.target.value }
                      }))}
                      className="input"
                      placeholder="Specify other discipline"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Part C: RFI Details */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-6 py-3 border-l-4 border-lodha-gold">
                <h2 className="font-garamond font-bold text-lg text-lodha-black">
                  Part C: RFI Details
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="label">Subject of Clarification</label>
                  <input
                    type="text"
                    name="subjectOfClarification"
                    value={formData.subjectOfClarification}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Details of Clarification</label>
                  <textarea
                    name="detailsOfClarification"
                    value={formData.detailsOfClarification}
                    onChange={handleInputChange}
                    rows="6"
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">
                    Related Major Construction Activities Affected by Required Information
                  </label>
                  <textarea
                    name="relatedMajorActivities"
                    value={formData.relatedMajorActivities}
                    onChange={handleInputChange}
                    rows="4"
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Remarks by Contractor</label>
                  <textarea
                    name="remarksByContractor"
                    value={formData.remarksByContractor}
                    onChange={handleInputChange}
                    rows="4"
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">List of Attachments</label>
                  <p className="text-xs text-lodha-grey/70 mb-2 font-jost">
                    (Tick all provided attachments)
                  </p>
                  
                  <div className="border-2 border-dashed border-lodha-steel rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-lodha-steel mx-auto mb-3" />
                    <label className="cursor-pointer">
                      <span className="text-lodha-gold font-jost font-semibold hover:text-lodha-black">
                        Click to upload files
                      </span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"
                      />
                    </label>
                    <p className="text-xs text-lodha-grey/70 mt-2 font-jost">
                      Revised Dwg., Snap, or other documents
                    </p>
                  </div>
                  
                  {attachmentFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachmentFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-lodha-sand/40 p-3 rounded-lg"
                        >
                          <span className="font-jost text-sm text-lodha-black">
                            {index + 1}. {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className="btn-primary"
              >
                Next: Response Sections
              </button>
            </div>
          </>
        )}

        {/* Page 2 */}
        {currentPage === 2 && (
          <>
            {/* Part D: Lodha - Project Team Response */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-6 py-3 border-l-4 border-lodha-gold">
                <h2 className="font-garamond font-bold text-lg text-lodha-black">
                  Part D: Lodha – Project Team Response
                </h2>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 font-jost italic">
                    Note: Information provided in Engineer/ PMC/Lodha response neither authorizes changes to Contract Documents nor relieves the Contractor from his contractual obligation to ensure conformance to all Contract Documents.
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-lodha-steel">
                    <thead className="bg-lodha-sand">
                      <tr>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Name
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Designation
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Organization
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Signature
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          To be filled by project team
                        </td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Design – Structure team (For structural scope)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Architect (For Finishing Scope)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Project MEP Manager (For MEP scope)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Project Façade Manager (For Façade scope)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Project Head
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Part E: Design Team Response */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-6 py-3 border-l-4 border-lodha-gold">
                <h2 className="font-garamond font-bold text-lg text-lodha-black">
                  Part E: Lodha – Corporate Design Team / Design Consultant Response (If required)
                </h2>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 font-jost italic">
                    Note: Information provided in Engineer/ PMC/Lodha response neither authorizes changes to Contract Documents nor relieves the Contractor from his contractual obligation to ensure conformance to all Contract Documents. Applicable for design scope of RFI, respective discipline of design consultant and CO- design team will approve.
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-lodha-steel">
                    <thead className="bg-lodha-sand">
                      <tr>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Name
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Designation
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Organization
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Signature
                        </th>
                        <th className="border border-lodha-steel px-4 py-2 text-left font-jost font-bold text-sm">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          To be filled by design team
                        </td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Design Consultant (Structural/Architectural/ Landscape/Design/Façade/MEP/ID)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Co-Design (Structural/Architectural/ Landscape/Design/Façade/MEP/ID)
                        </td>
                        <td className="border border-lodha-steel px-4 py-2 text-sm font-jost text-lodha-grey/70">
                          Lodha
                        </td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                        <td className="border border-lodha-steel px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer with template reference */}
            <div className="text-center text-sm text-lodha-grey/70 font-jost">
              Template Ref.: CO-LOD-GENE-QU-CN-TMT-033, Rev- R1, Date: 09-09-2023
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="btn-secondary"
              >
                Back to Details
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Submit RFI
              </button>
            </div>
          </>
        )}
      </form>
    </Layout>
  );
}
