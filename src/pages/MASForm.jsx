import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';

export default function MASForm() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Project Information
    projectName: '',
    contractorName: '',
    masNo: '',
    date: new Date().toISOString().split('T')[0],
    
    // Material Details
    materialCategory: '',
    manufacturer: '',
    brandModel: '',
    gradeSpecification: '',
    materialDescription: '',
    
    // Specifications & Usage
    quantity: '',
    unit: '',
    locationArea: '',
    purposeOfUse: '',
    technicalSpecifications: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // TODO: Implement API call
      console.log('Submitting MAS:', formData);
      alert('MAS created successfully! (Backend integration pending)');
      navigate('/mas-list');
    } catch (err) {
      console.error('Error saving MAS:', err);
      alert('Failed to save MAS');
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-lodha-gold text-white px-6 py-4 rounded-t-lg border-b-4 border-lodha-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-garamond font-bold mb-1">
                Material Approval Sheet (MAS)
              </h1>
              <p className="text-sm opacity-90">Create new material approval request</p>
            </div>
            <button
              onClick={() => navigate('/mas-list')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-b-lg">
          {/* Project Information */}
          <div className="border-b-2 border-lodha-gold/20 px-6 py-6">
            <h2 className="text-xl font-garamond font-bold text-lodha-black mb-6">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Contractor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contractorName"
                  value={formData.contractorName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  MAS No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="masNo"
                  value={formData.masNo}
                  onChange={handleChange}
                  placeholder="e.g., MAS-2026-001"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
            </div>
          </div>

          {/* Material Details */}
          <div className="border-b-2 border-lodha-gold/20 px-6 py-6">
            <h2 className="text-xl font-garamond font-bold text-lodha-black mb-6">
              Material Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Material Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="materialCategory"
                  value={formData.materialCategory}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                >
                  <option value="">Select Category</option>
                  <option value="Cement">Cement</option>
                  <option value="Steel">Steel</option>
                  <option value="Concrete">Concrete</option>
                  <option value="Brick">Brick</option>
                  <option value="Paint">Paint</option>
                  <option value="Tiles">Tiles</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Manufacturer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Brand/Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="brandModel"
                  value={formData.brandModel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Grade/Specification
                </label>
                <input
                  type="text"
                  name="gradeSpecification"
                  value={formData.gradeSpecification}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Material Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="materialDescription"
                  value={formData.materialDescription}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Provide detailed description of the material..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost resize-none"
                />
              </div>
            </div>
          </div>

          {/* Specifications & Usage */}
          <div className="px-6 py-6">
            <h2 className="text-xl font-garamond font-bold text-lodha-black mb-6">
              Specifications & Usage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                >
                  <option value="">Select Unit</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ton">Tons</option>
                  <option value="m">Meters (m)</option>
                  <option value="m2">Square Meters (m²)</option>
                  <option value="m3">Cubic Meters (m³)</option>
                  <option value="pcs">Pieces</option>
                  <option value="bag">Bags</option>
                  <option value="box">Boxes</option>
                  <option value="liter">Liters</option>
                  <option value="ft">Feet</option>
                  <option value="sqft">Square Feet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Location/Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="locationArea"
                  value={formData.locationArea}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Tower A, 10th Floor"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Purpose of Use <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="purposeOfUse"
                  value={formData.purposeOfUse}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Describe where and how this material will be used..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-jost font-semibold text-lodha-black mb-2">
                  Technical Specifications
                </label>
                <textarea
                  name="technicalSpecifications"
                  value={formData.technicalSpecifications}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter technical specifications, standards, certifications required..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-lodha-gold focus:outline-none font-jost resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/mas-list')}
              className="px-6 py-3 border-2 border-gray-300 text-lodha-black font-jost font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-lodha-gold text-white font-jost font-semibold rounded-lg hover:bg-lodha-black transition-colors"
            >
              <Save className="w-5 h-5" />
              Save MAS
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
