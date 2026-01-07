import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Building2, Plus, Edit2, Trash2, Check, X, MapPin,
  Star, StarOff, AlertCircle, FileText, Save
} from 'lucide-react';

export default function MultiGSTIN() {
  const [gstins, setGstins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGstin, setEditingGstin] = useState(null);
  const [formData, setFormData] = useState({
    gstin: '',
    address: '',
    city: '',
    pincode: '',
    tradeName: '',
    registrationDate: new Date().toISOString().split('T')[0],
  });

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

  useEffect(() => {
    fetchGSTINs();
  }, []);

  const fetchGSTINs = async () => {
    setLoading(true);
    try {
      // Simulated API call
      const mockGstins = [
        {
          _id: '1',
          gstin: '27AABCU9603R1Z5',
          stateCode: '27',
          stateName: 'Maharashtra',
          address: '123 Business Park, Andheri',
          city: 'Mumbai',
          pincode: '400053',
          tradeName: 'EasyTax Mumbai',
          isActive: true,
          isDefault: true,
          nextInvoiceNumber: 125,
          invoicePrefix: 'INV-MH',
        },
        {
          _id: '2',
          gstin: '29AABCU9603R1Z5',
          stateCode: '29',
          stateName: 'Karnataka',
          address: '456 Tech Hub, Koramangala',
          city: 'Bangalore',
          pincode: '560095',
          tradeName: 'EasyTax Bangalore',
          isActive: true,
          isDefault: false,
          nextInvoiceNumber: 78,
          invoicePrefix: 'INV-KA',
        },
      ];
      setGstins(mockGstins);
    } catch (error) {
      console.error('Error fetching GSTINs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGSTIN = () => {
    // Validate GSTIN
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(formData.gstin)) {
      alert('Invalid GSTIN format');
      return;
    }

    // Check for duplicates
    if (gstins.some(g => g.gstin === formData.gstin)) {
      alert('This GSTIN already exists');
      return;
    }

    try {
      const stateCode = formData.gstin.substring(0, 2);
      const newGstin = {
        ...formData,
        _id: Date.now().toString(),
        stateCode,
        stateName: stateMap[stateCode] || 'Unknown State',
        isActive: true,
        isDefault: gstins.length === 0,
        nextInvoiceNumber: 1,
        invoicePrefix: `INV-${stateCode}`,
      };
      
      setGstins([...gstins, newGstin]);
      setShowAddModal(false);
      resetForm();
      alert('GSTIN added successfully!');
    } catch (error) {
      console.error('Error adding GSTIN:', error);
      alert('Failed to add GSTIN');
    }
  };

  const handleUpdateGSTIN = () => {
    try {
      setGstins(gstins.map(g => 
        g._id === editingGstin._id 
          ? { ...g, ...formData }
          : g
      ));
      
      setEditingGstin(null);
      resetForm();
      alert('GSTIN updated successfully!');
    } catch (error) {
      console.error('Error updating GSTIN:', error);
      alert('Failed to update GSTIN');
    }
  };

  const handleSetDefault = (gstinId) => {
    try {
      setGstins(gstins.map(g => ({
        ...g,
        isDefault: g._id === gstinId
      })));
      alert('Default GSTIN updated!');
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set default GSTIN');
    }
  };

  const handleDelete = (gstinId) => {
    if (gstins.length === 1) {
      alert('Cannot delete the last GSTIN entry');
      return;
    }

    if (!confirm('Are you sure you want to delete this GSTIN?')) return;

    try {
      setGstins(gstins.filter(g => g._id !== gstinId));
      alert('GSTIN deleted successfully!');
    } catch (error) {
      console.error('Error deleting GSTIN:', error);
      alert('Failed to delete GSTIN');
    }
  };

  const resetForm = () => {
    setFormData({
      gstin: '',
      address: '',
      city: '',
      pincode: '',
      tradeName: '',
      registrationDate: new Date().toISOString().split('T')[0],
    });
  };

  const openEditModal = (gstin) => {
    setEditingGstin(gstin);
    setFormData({
      address: gstin.address,
      city: gstin.city,
      pincode: gstin.pincode,
      tradeName: gstin.tradeName || '',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-600" />
              Multi-GSTIN Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage registrations across multiple states
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add GSTIN
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Why Multi-GSTIN?</p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Manage all state registrations in one place</li>
                <li>Generate invoices with correct state GSTIN</li>
                <li>Maintain separate invoice sequences per state</li>
                <li>Comply with GST regulations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* GSTIN Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {gstins.map((gstin) => (
            <div
              key={gstin._id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                gstin.isDefault 
                  ? 'border-blue-500 ring-2 ring-blue-100' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {gstin.stateName}
                    </h3>
                    {gstin.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                    {gstin.gstin}
                  </p>
                  {gstin.tradeName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Trade Name: {gstin.tradeName}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!gstin.isDefault && (
                    <button
                      onClick={() => handleSetDefault(gstin._id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Set as default"
                    >
                      <StarOff className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(gstin)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {gstins.length > 1 && (
                    <button
                      onClick={() => handleDelete(gstin._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>{gstin.address}</p>
                    <p>{gstin.city} - {gstin.pincode}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-600">Invoice Prefix</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {gstin.invoicePrefix}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-600">Next Invoice #</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {gstin.nextInvoiceNumber}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  gstin.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {gstin.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {gstins.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No GSTIN Registered
            </h3>
            <p className="text-gray-600 mb-4">
              Add your first GSTIN to start managing multi-state operations
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add GSTIN
            </button>
          </div>
        )}

        {/* ===== ADD GSTIN MODAL ===== */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Add New GSTIN</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {formData.gstin.length >= 2 && (
                    <p className="text-xs text-gray-500 mt-1">
                      State: {stateMap[formData.gstin.substring(0, 2)] || 'Unknown'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="EasyTax Mumbai"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registered Address *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    placeholder="123 Business Park, Andheri"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="400053"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Date
                  </label>
                  <input
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddGSTIN}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Add GSTIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== EDIT GSTIN MODAL ===== */}
        {editingGstin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Edit GSTIN Details</h2>
                <button
                  onClick={() => {
                    setEditingGstin(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">GSTIN</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {editingGstin.gstin}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {editingGstin.stateName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade Name
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGstin(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateGSTIN}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}