import { useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';

export default function CreateMAS({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    projectName: '', projectCode: '', clientEmployer: '', pmcEngineer: '', contractor: '',
    vendorCode: '', msfRefNo: '', revNo: '', submissionDate: new Date().toISOString().split('T')[0],
    boqRef: '', approxQuantity: '', materialCode: '',
    discipline: { structuralCivil: false, archFinishing: false, landscape: false, id: false,
      facade: false, mechanicalHvac: false, electrical: false, plumbing: false, others: false },
    asPerSpecification: '', alternateSubmission: '', materialMeetsSpec: '', boqCompliance: '',
    boqComplianceReason: '', manufacturerBrand: '', sizeThicknessColor: '', manufacturerDetails: '',
    previouslyUsedInLodha: '', usedByOtherDevelopers: '', igbcCompliance: '', applicableStandards: '',
    warrantyGuarantee: '', proposedMaterial: '', alternativeMaterialJustification: '', otherDetails: '',
    attachments: { technicalLiterature: null, materialSample: null, manufacturerProfile: null,
      previousApprovals: null, otherApprovals: null, igbcCertificate: null, testLabCertificate: null,
      relatedDrawings: null, concreteMixDesign: null },
    contractorReviewRows: [{ description: '', name: '', signature: '', date: '' }],
    lodhaReviewRows: [{ description: '', name: '', signature: '', date: '', approvalStatus: '' }],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e, subfield) => {
    const { checked } = e.target;
    setFormData(prev => ({
      ...prev,
      discipline: { ...prev.discipline, [subfield]: checked }
    }));
  };

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        attachments: { ...prev.attachments, [field]: file }
      }));
    }
  };

  const handleRemoveFile = (field) => {
    setFormData(prev => ({
      ...prev,
      attachments: { ...prev.attachments, [field]: null }
    }));
  };

  const addContractorReviewRow = () => {
    setFormData(prev => ({
      ...prev,
      contractorReviewRows: [...prev.contractorReviewRows, { description: '', name: '', signature: '', date: '' }]
    }));
  };

  const updateContractorReviewRow = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contractorReviewRows: prev.contractorReviewRows.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const removeContractorReviewRow = (index) => {
    if (formData.contractorReviewRows.length > 1) {
      setFormData(prev => ({
        ...prev,
        contractorReviewRows: prev.contractorReviewRows.filter((_, i) => i !== index)
      }));
    }
  };

  const addLodhaReviewRow = () => {
    setFormData(prev => ({
      ...prev,
      lodhaReviewRows: [...prev.lodhaReviewRows, { description: '', name: '', signature: '', date: '', approvalStatus: '' }]
    }));
  };

  const updateLodhaReviewRow = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lodhaReviewRows: prev.lodhaReviewRows.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const removeLodhaReviewRow = (index) => {
    if (formData.lodhaReviewRows.length > 1) {
      setFormData(prev => ({
        ...prev,
        lodhaReviewRows: prev.lodhaReviewRows.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-lodha-gold px-6 py-4 flex items-center justify-between border-b-4 border-lodha-black">
          <div>
            <h2 className="text-2xl font-garamond font-bold text-lodha-black">Material Approval Submittal (MAS)</h2>
            <p className="text-sm text-lodha-black/80 font-jost mt-1">LODHA - Building a Better Life</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-lodha-black/10 rounded-lg transition-colors" type="button">
            <X className="w-6 h-6 text-lodha-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Part A */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part A: Project & Record Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'projectName', label: 'Project Name', req: true },
                  { name: 'msfRefNo', label: 'MSF.Ref.No' },
                  { name: 'projectCode', label: 'Project Code' },
                  { name: 'revNo', label: 'Rev.No' },
                  { name: 'clientEmployer', label: 'Client/Employer' },
                  { name: 'submissionDate', label: 'Submission Date', type: 'date', req: true },
                  { name: 'pmcEngineer', label: 'PMC/Engineer' },
                  { name: 'boqRef', label: 'BOQ Ref. if any' },
                  { name: 'contractor', label: 'Contractor', req: true },
                  { name: 'approxQuantity', label: 'Approx. Quantity' },
                  { name: 'vendorCode', label: 'Vendor Code' },
                  { name: 'materialCode', label: 'Material code' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-lodha-black mb-1 font-jost">
                      {field.label} {field.req && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-jost"
                      required={field.req}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Part B */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part B: Material Approval Submittal Discipline</h3>
              <p className="text-sm text-gray-600 font-jost mb-3">(One item only per submittal)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'structuralCivil', label: 'Structural /Civil' },
                  { id: 'archFinishing', label: 'Arch/ Finishing' },
                  { id: 'landscape', label: 'Landscape' },
                  { id: 'id', label: 'ID' },
                  { id: 'facade', label: 'Façade' },
                  { id: 'mechanicalHvac', label: 'Mechanical/HVAC' },
                  { id: 'electrical', label: 'Electrical' },
                  { id: 'plumbing', label: 'Plumbing' },
                  { id: 'others', label: 'Others' },
                ].map(item => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.discipline[item.id]}
                      onChange={(e) => handleCheckboxChange(e, item.id)}
                      className="w-4 h-4 accent-lodha-gold rounded"
                    />
                    <span className="text-sm font-jost text-lodha-black">{item.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Part C */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part C: Material Submittal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">As per Specification <span className="text-red-500">*</span></label>
                  <textarea name="asPerSpecification" value={formData.asPerSpecification} onChange={handleInputChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost" placeholder="Material as per specification..." required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">Alternate material submission</label>
                  <textarea name="alternateSubmission" value={formData.alternateSubmission} onChange={handleInputChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost" placeholder="Alternate material details..." />
                </div>
              </div>
            </section>

            {/* Part D */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part D: Material Details</h3>
              <div className="space-y-4">
                <div className="border border-gray-300 rounded p-3">
                  <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">Specified Material - Meeting requirements in Spec's</label>
                  <select name="materialMeetsSpec" value={formData.materialMeetsSpec} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost">
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="border border-gray-300 rounded p-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">Material meeting BOQ requirements (Yes/No)</label>
                      <select name="boqCompliance" value={formData.boqCompliance} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost">
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">If No, specify reason</label>
                      <textarea name="boqComplianceReason" value={formData.boqComplianceReason} onChange={handleInputChange} rows={1} placeholder="Reason..." className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost" />
                    </div>
                  </div>
                </div>

                {['Manufacturer\'s /Brand/Make/ Model No./Series No.', 'Size, Thickness, Color, Shape', 'Manufacturer / Supplier Details: Name, Address & Local Agent', 'IGBC / USGBC Compliance / Approvals', 'Applicable Standard / codes and Test Results', 'Warranty / Guarantee of Material', 'Proposed Material (Specification/BOQ)', 'Justification of Alternative Material', 'Others'].map((label, idx) => {
                  const fieldNames = ['manufacturerBrand', 'sizeThicknessColor', 'manufacturerDetails', 'igbcCompliance', 'applicableStandards', 'warrantyGuarantee', 'proposedMaterial', 'alternativeMaterialJustification', 'otherDetails'];
                  const isMultiline = idx > 1;
                  return (
                    <div key={label} className="border border-gray-300 rounded p-3">
                      <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">{label}</label>
                      {isMultiline ? (
                        <textarea name={fieldNames[idx]} value={formData[fieldNames[idx]]} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost" />
                      ) : (
                        <input type="text" name={fieldNames[idx]} value={formData[fieldNames[idx]]} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost" />
                      )}
                    </div>
                  );
                })}

                {[
                  { name: 'previouslyUsedInLodha', label: 'Is this material submitted / approved in Lodha projects?' },
                  { name: 'usedByOtherDevelopers', label: 'Is this material used by other Developers / clients?' },
                ].map(field => (
                  <div key={field.name} className="border border-gray-300 rounded p-3">
                    <label className="block text-sm font-semibold text-lodha-black mb-2 font-jost">{field.label}</label>
                    <select name={field.name} value={formData[field.name]} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-jost">
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>

            {/* Attachments */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Attachment Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'technicalLiterature', label: 'Material Technical literature (Technical Data Sheet / MSD)' },
                  { id: 'materialSample', label: 'Material Sample with Sample Tag' },
                  { id: 'manufacturerProfile', label: 'Manufacturer Profile, Address & License' },
                  { id: 'previousApprovals', label: 'Copy of Lodha Previous Approvals (if material already used)' },
                  { id: 'otherApprovals', label: 'Copy of Other Relevant Approvals / client list' },
                  { id: 'igbcCertificate', label: 'Copy of IGBC/USGBC Compliance / Approval' },
                  { id: 'testLabCertificate', label: 'Material test Form/Lab Test results/ Certificate' },
                  { id: 'relatedDrawings', label: 'Copy of the related drawings (if applicable)' },
                  { id: 'concreteMixDesign', label: 'Concrete Mix Design (Applicable only for Concrete Submittal)' },
                ].map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-300 rounded">
                    <div className="flex-1">
                      <label className="block text-sm font-jost text-lodha-black mb-2">{item.label}</label>
                      <input type="file" id={item.id} onChange={(e) => handleFileUpload(e, item.id)} className="hidden" />
                      <label htmlFor={item.id} className="text-xs px-2 py-1 border border-lodha-gold rounded cursor-pointer hover:bg-lodha-sand font-jost inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {formData.attachments[item.id] ? 'Change' : 'Upload'}
                      </label>
                    </div>
                    {formData.attachments[item.id] && (
                      <button type="button" onClick={() => handleRemoveFile(item.id)} className="text-red-500 hover:text-red-700 mt-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Part E */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part E: Contractor's Internal Review & Confirmation of Compliance</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-lodha-gold bg-lodha-sand">
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black w-8">S.No</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Description</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Name/Designation</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Signature</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Date</th>
                      <th className="text-center px-2 py-2 w-8">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.contractorReviewRows.map((row, index) => (
                      <tr key={index} className="border-b border-gray-300">
                        <td className="px-2 py-1 font-jost text-center">{index + 1}</td>
                        <td className="px-2 py-1"><input type="text" value={row.description} onChange={(e) => updateContractorReviewRow(index, 'description', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><input type="text" value={row.name} onChange={(e) => updateContractorReviewRow(index, 'name', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><input type="text" value={row.signature} onChange={(e) => updateContractorReviewRow(index, 'signature', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><input type="date" value={row.date} onChange={(e) => updateContractorReviewRow(index, 'date', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1 text-center">{formData.contractorReviewRows.length > 1 && (<button type="button" onClick={() => removeContractorReviewRow(index)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addContractorReviewRow} className="px-3 py-1 border-2 border-lodha-gold text-lodha-black rounded font-jost text-xs hover:bg-lodha-sand">+ Add Row</button>
            </section>

            {/* Part F */}
            <section className="border-2 border-lodha-gold rounded-lg p-4">
              <h3 className="text-lg font-garamond font-bold text-lodha-black bg-lodha-sand px-3 py-2 mb-4 rounded">Part F: Lodha/PMC/ Design consultant Review / Approval</h3>
              <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded text-xs font-jost text-gray-600">
                <strong>Approval Status Codes:</strong><br/>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div><strong>Code 1:</strong> Work may proceed</div>
                  <div><strong>Code 2:</strong> Conditionally approved</div>
                  <div><strong>Code 3:</strong> Revise & resubmit</div>
                  <div><strong>Code 4:</strong> For information only</div>
                </div>
              </div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-lodha-gold bg-lodha-sand">
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black w-8">S.No</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Description</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Name/Designation</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black w-20">Status Code</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Signature</th>
                      <th className="text-left px-2 py-2 font-garamond font-bold text-lodha-black">Date</th>
                      <th className="text-center px-2 py-2 w-8">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lodhaReviewRows.map((row, index) => (
                      <tr key={index} className="border-b border-gray-300">
                        <td className="px-2 py-1 font-jost text-center">{index + 1}</td>
                        <td className="px-2 py-1"><input type="text" value={row.description} onChange={(e) => updateLodhaReviewRow(index, 'description', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><input type="text" value={row.name} onChange={(e) => updateLodhaReviewRow(index, 'name', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><select value={row.approvalStatus} onChange={(e) => updateLodhaReviewRow(index, 'approvalStatus', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost"><option value="">Select...</option><option value="1">Code 1</option><option value="2">Code 2</option><option value="3">Code 3</option><option value="4">Code 4</option></select></td>
                        <td className="px-2 py-1"><input type="text" value={row.signature} onChange={(e) => updateLodhaReviewRow(index, 'signature', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1"><input type="date" value={row.date} onChange={(e) => updateLodhaReviewRow(index, 'date', e.target.value)} className="w-full px-1 py-0 border border-gray-300 rounded text-xs font-jost" /></td>
                        <td className="px-2 py-1 text-center">{formData.lodhaReviewRows.length > 1 && (<button type="button" onClick={() => removeLodhaReviewRow(index)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addLodhaReviewRow} className="px-3 py-1 border-2 border-lodha-gold text-lodha-black rounded font-jost text-xs hover:bg-lodha-sand">+ Add Row</button>
            </section>

            {/* Certification */}
            <section className="border-2 border-lodha-gold rounded-lg p-4 bg-lodha-sand/20">
              <p className="text-xs font-jost text-lodha-black italic">
                <strong>Certification:</strong> We do certify that the material submitted herewith has been reviewed in details and in accordance with the Contract Documents (BOQ, Specification), Approved material list and as otherwise stated here above.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between sticky bottom-0">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <div className="flex gap-3">
              <button type="button" className="px-6 py-2 border-2 border-lodha-gold text-lodha-black rounded-lg hover:bg-lodha-sand transition-colors font-jost font-semibold">Save as Draft</button>
              <button type="submit" className="btn-primary">Submit MAS</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
