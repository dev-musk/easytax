// ============================================
// FILE: client/src/pages/OrganizationSettings.jsx
// COMPLETE WITH TEMPLATES TAB - Phase 4
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { 
  Building2, 
  Save, 
  Upload, 
  X, 
  CreditCard, 
  FileSignature, 
  Settings,
  Hash,
  Eye,
  EyeOff,
  Check,
  Palette
} from 'lucide-react';

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [logoPreview, setLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    cin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    annualTurnover: 0,
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    branchName: '',
    upiId: '',
  });

  const [signatory, setSignatory] = useState({
    name: '',
    designation: '',
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    invoiceNumberMode: 'AUTO',
    invoicePrefix: 'INV',
    invoiceNumberFormat: '{PREFIX}-{FY}-{SEQ}',
  });

  const [displaySettings, setDisplaySettings] = useState({
    dateFormat: 'DD-MM-YYYY',
    amountInWords: true,
    showCompanyLogo: true,
    showAuthorizedSignature: true,
    showBankDetails: true,
    defaultTemplate: 'MODERN', // ✅ PHASE 4: Added
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/organization');
      const org = response.data;

      setFormData({
        name: org.name || '',
        email: org.email || '',
        phone: org.phone || '',
        gstin: org.gstin || '',
        pan: org.pan || '',
        cin: org.cin || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        pincode: org.pincode || '',
        annualTurnover: org.annualTurnover || 0,
      });

      setBankDetails(org.bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        branchName: '',
        upiId: '',
      });

      setSignatory(org.authorizedSignatory || {
        name: '',
        designation: '',
      });

      setInvoiceSettings({
        invoiceNumberMode: org.invoiceNumberMode || 'AUTO',
        invoicePrefix: org.invoicePrefix || 'INV',
        invoiceNumberFormat: org.invoiceNumberFormat || '{PREFIX}-{FY}-{SEQ}',
      });

      setDisplaySettings(org.displaySettings || {
        dateFormat: 'DD-MM-YYYY',
        amountInWords: true,
        showCompanyLogo: true,
        showAuthorizedSignature: true,
        showBankDetails: true,
        defaultTemplate: 'MODERN', // ✅ PHASE 4: Added
      });

      if (org.logo) {
        setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${org.logo}`);
      }

      if (org.authorizedSignatory?.signatureImage) {
        setSignaturePreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${org.authorizedSignatory.signatureImage}`);
      }

      // Fetch invoice number preview
      fetchInvoiceNumberPreview();
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceNumberPreview = async () => {
    try {
      const response = await api.get('/api/organization/invoice-number-preview');
      setInvoiceNumberPreview(response.data.preview);
    } catch (error) {
      console.error('Error fetching invoice preview:', error);
    }
  };

  const handleSaveCompanyInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/organization', formData);
      alert('Company information updated successfully');
      fetchOrganization();
    } catch (error) {
      console.error('Error updating company info:', error);
      alert(error.response?.data?.error || 'Failed to update company information');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('logo', file);

    setSaving(true);
    try {
      const response = await api.post('/api/organization/logo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Logo uploaded successfully');
      setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${response.data.logo}`);
      fetchOrganization();
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert(error.response?.data?.error || 'Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, WebP)');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('signature', file);
    formDataUpload.append('name', signatory.name);
    formDataUpload.append('designation', signatory.designation);

    setSaving(true);
    try {
      const response = await api.post('/api/organization/signature', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Signature uploaded successfully');
      setSignaturePreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${response.data.signature}`);
      fetchOrganization();
    } catch (error) {
      console.error('Error uploading signature:', error);
      alert(error.response?.data?.error || 'Failed to upload signature');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to delete the company logo?')) return;

    setSaving(true);
    try {
      await api.delete('/api/organization/logo');
      setLogoPreview(null);
      alert('Logo deleted successfully');
      fetchOrganization();
    } catch (error) {
      console.error('Error deleting logo:', error);
      alert(error.response?.data?.error || 'Failed to delete logo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm('Are you sure you want to delete the authorized signature?')) return;

    setSaving(true);
    try {
      await api.delete('/api/organization/signature');
      setSignaturePreview(null);
      alert('Signature deleted successfully');
      fetchOrganization();
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert(error.response?.data?.error || 'Failed to delete signature');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/organization/bank-details', bankDetails);
      alert('Bank details updated successfully');
      fetchOrganization();
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert(error.response?.data?.error || 'Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoiceSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/organization/invoice-settings', invoiceSettings);
      alert('Invoice settings updated successfully');
      fetchOrganization();
      fetchInvoiceNumberPreview();
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      alert(error.response?.data?.error || 'Failed to update invoice settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisplaySettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/organization/display-settings', displaySettings);
      alert('Display settings updated successfully');
      fetchOrganization();
    } catch (error) {
      console.error('Error updating display settings:', error);
      alert(error.response?.data?.error || 'Failed to update display settings');
    } finally {
      setSaving(false);
    }
  };

  const getStateFromGSTIN = (gstin) => {
    if (!gstin || gstin.length < 2) return null;
    const stateCode = gstin.substring(0, 2);
    const stateMap = {
      '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
      '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
      '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
      '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
      '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
      '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
      '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
      '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
      '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
      '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana',
      '37': 'Andhra Pradesh',
    };
    return stateMap[stateCode] || null;
  };

  const formatTodayDate = (format) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    switch (format) {
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM-DD-YYYY':
        return `${month}-${day}-${year}`;
      default:
        return `${day}-${month}-${year}`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Organization Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your company information and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'company', label: 'Company Info', icon: Building2 },
              { id: 'bank', label: 'Bank Details', icon: CreditCard },
              { id: 'signature', label: 'Signature', icon: FileSignature },
              { id: 'invoice', label: 'Invoice Settings', icon: Hash },
              { id: 'display', label: 'Display', icon: Eye },
              { id: 'templates', label: 'Templates', icon: Palette }, // ✅ PHASE 4: Added
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Company Information</h2>
            
            <form onSubmit={handleSaveCompanyInfo} className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="h-24 w-24 object-contain border rounded"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB. Supported: JPG, PNG, GIF, WebP, SVG
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN *
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AABCU9603R1Z5"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {formData.gstin && formData.gstin.length >= 2 && (
                    <p className="text-xs text-gray-500 mt-1">
                      State Code: {formData.gstin.substring(0, 2)} ({getStateFromGSTIN(formData.gstin) || 'Unknown'})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="AABCU9603R"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIN (Corporate Identification Number)
                  </label>
                  <input
                    type="text"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                    placeholder="L17110MH1973PLC019786"
                    maxLength={21}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For Private Limited / Public Limited companies
                  </p>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registered Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Annual Turnover */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Turnover (₹)
                </label>
                <input
                  type="number"
                  value={formData.annualTurnover}
                  onChange={(e) => setFormData({ ...formData, annualTurnover: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.annualTurnover <= 50000000
                    ? '≤ ₹5 crore: 4-digit HSN required'
                    : '> ₹5 crore: 6-digit HSN required, E-Invoice mandatory'
                  }
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Company Info'}
              </button>
            </form>
          </div>
        )}

        {/* Bank Details Tab */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Bank Account Details</h2>
            
            <form onSubmit={handleSaveBankDetails} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    placeholder="HDFC Bank"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="HDFC0001234"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.branchName}
                    onChange={(e) => setBankDetails({ ...bankDetails, branchName: e.target.value })}
                    placeholder="Andheri Branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={bankDetails.upiId}
                    onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                    placeholder="company@hdfcbank"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Bank Details'}
              </button>
            </form>
          </div>
        )}

        {/* Signature Tab */}
        {activeTab === 'signature' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Authorized Signatory</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={signatory.name}
                    onChange={(e) => setSignatory({ ...signatory, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={signatory.designation}
                    onChange={(e) => setSignatory({ ...signatory, designation: e.target.value })}
                    placeholder="Managing Director"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Image
                </label>
                <div className="flex items-center gap-4">
                  {signaturePreview ? (
                    <div className="relative">
                      <img
                        src={signaturePreview}
                        alt="Signature"
                        className="h-24 w-48 object-contain border rounded bg-white p-2"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteSignature}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-48 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <FileSignature className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="signature-upload"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="signature-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Signature
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB. Transparent PNG recommended
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings Tab */}
        {activeTab === 'invoice' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Invoice Number Settings</h2>
            
            <form onSubmit={handleSaveInvoiceSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number Mode
                </label>
                <select
                  value={invoiceSettings.invoiceNumberMode}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceNumberMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AUTO">Automatic (Sequential)</option>
                  <option value="MANUAL">Manual Entry</option>
                </select>
              </div>

              {invoiceSettings.invoiceNumberMode === 'AUTO' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Prefix
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.invoicePrefix}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })}
                        placeholder="INV"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number Format
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.invoiceNumberFormat}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceNumberFormat: e.target.value })}
                        placeholder="{PREFIX}-{FY}-{SEQ}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                      Preview
                    </h3>
                    <p className="text-lg font-mono text-blue-800">{invoiceNumberPreview}</p>
                    <div className="mt-3 text-xs text-blue-700">
                      <p className="font-semibold mb-1">Available Placeholders:</p>
                      <ul className="space-y-1">
                        <li>• {'{PREFIX}'} - Invoice prefix (e.g., INV)</li>
                        <li>• {'{FY}'} - Financial year (e.g., 2024-25)</li>
                        <li>• {'{YEAR}'} - Full year (e.g., 2024)</li>
                        <li>• {'{MONTH}'} - Month (01-12)</li>
                        <li>• {'{SEQ}'} - Sequence number (00001)</li>
                        <li>• {'{GSTIN_STATE}'} - State code (27)</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Invoice Settings'}
              </button>
            </form>
          </div>
        )}

        {/* Display Settings Tab */}
        {activeTab === 'display' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Display Preferences</h2>
            
            <form onSubmit={handleSaveDisplaySettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select
                  value={displaySettings.dateFormat}
                  onChange={(e) => setDisplaySettings({ ...displaySettings, dateFormat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DD-MM-YYYY">
                    DD-MM-YYYY ({formatTodayDate('DD-MM-YYYY')})
                  </option>
                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY ({formatTodayDate('DD/MM/YYYY')})
                  </option>
                  <option value="YYYY-MM-DD">
                    YYYY-MM-DD ({formatTodayDate('YYYY-MM-DD')})
                  </option>
                  <option value="MM-DD-YYYY">
                    MM-DD-YYYY ({formatTodayDate('MM-DD-YYYY')})
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Today's date preview in selected format
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={displaySettings.amountInWords}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, amountInWords: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show amount in words on invoices
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={displaySettings.showCompanyLogo}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, showCompanyLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show company logo on invoices
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={displaySettings.showAuthorizedSignature}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, showAuthorizedSignature: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show authorized signature on invoices
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={displaySettings.showBankDetails}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, showBankDetails: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show bank details on invoices
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Display Settings'}
              </button>
            </form>
          </div>
        )}

        {/* ✅ PHASE 4: Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Invoice Templates</h2>
            
            <p className="text-gray-600 mb-6">
              Choose your default invoice template design. This will be applied to all new invoices.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  id: 'MODERN',
                  name: 'Modern',
                  description: 'Clean and professional design with blue accents',
                  preview: 'Modern layout with bold headers and organized sections',
                },
                {
                  id: 'CLASSIC',
                  name: 'Classic',
                  description: 'Traditional invoice design with formal styling',
                  preview: 'Classic format with traditional structure',
                },
                {
                  id: 'MINIMAL',
                  name: 'Minimal',
                  description: 'Simple and clean design with minimal elements',
                  preview: 'Minimalist layout focusing on essential information',
                },
                {
                  id: 'PROFESSIONAL',
                  name: 'Professional',
                  description: 'Corporate design with professional appearance',
                  preview: 'Professional format suitable for large businesses',
                },
              ].map((template) => (
                <div
                  key={template.id}
                  onClick={() => setDisplaySettings({ ...displaySettings, defaultTemplate: template.id })}
                  className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                    displaySettings.defaultTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {/* Selected Badge */}
                  {displaySettings.defaultTemplate === template.id && (
                    <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      displaySettings.defaultTemplate === template.id
                        ? 'bg-blue-600'
                        : 'bg-gray-100'
                    }`}>
                      <Palette className={`w-6 h-6 ${
                        displaySettings.defaultTemplate === template.id
                          ? 'text-white'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-600">{template.preview}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This template will be used as the default for all new invoices. You can override this for individual invoices during creation.
              </p>
            </div>

            <button
              onClick={handleSaveDisplaySettings}
              disabled={saving}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Template Selection'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}