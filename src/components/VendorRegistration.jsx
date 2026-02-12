import { useState } from 'react';
import { X, Plus, Loader, Truck } from 'lucide-react';

export default function VendorRegistration({ projectId, onSuccess, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    companyName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vendors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-email': localStorage.getItem('devUserEmail') || 'l1@lodhagroup.com',
        },
        body: JSON.stringify({
          ...formData,
          projectId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register vendor');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        contactNumber: '',
        companyName: ''
      });
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error registering vendor:', err);
      setError(err.message || 'Failed to register vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-lodha-steel/30">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-lodha-gold" />
            <h2 className="text-2xl font-garamond font-bold text-lodha-gold">
              Register Vendor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-lodha-grey/50 hover:text-lodha-grey"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-lodha-grey mb-2">
                Vendor/Contractor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-lodha-steel rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                placeholder="Enter vendor's full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-lodha-steel rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                placeholder="vendor@company.com"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-lodha-grey mb-2">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-lodha-steel rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-lodha-grey mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-lodha-steel rounded-md focus:ring-2 focus:ring-lodha-gold focus:border-transparent"
                placeholder="Vendor company name"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-lodha-steel text-lodha-grey rounded-md hover:bg-lodha-sand/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-lodha-gold text-white rounded-md hover:bg-lodha-deep disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Register Vendor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
