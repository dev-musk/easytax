// ============================================
// FILE: client/src/components/GlobalSearch.jsx
// IMPROVED: Better visibility with backdrop
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search, FileText, Users, Package, CreditCard, X } from 'lucide-react';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState({
    invoices: [],
    clients: [],
    products: [],
    payments: [],
  });
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search function
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults({ invoices: [], clients: [], products: [], payments: [] });
        return;
      }

      setLoading(true);
      try {
        // Search invoices
        const invoicesRes = await api.get('/api/invoices');
        const filteredInvoices = invoicesRes.data
          .filter(
            (inv) =>
              inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
              inv.client?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 5);

        // Search clients
        const clientsRes = await api.get('/api/clients');
        const filteredClients = clientsRes.data
          .filter((client) =>
            client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 5);

        // Search products
        const productsRes = await api.get('/api/products');
        const filteredProducts = productsRes.data
          .filter((product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.hsnSacCode?.includes(searchTerm)
          )
          .slice(0, 5);

        // Search payments
        const paymentsRes = await api.get('/api/payments');
        const filteredPayments = paymentsRes.data
          .filter((payment) =>
            payment.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 5);

        setResults({
          invoices: filteredInvoices,
          clients: filteredClients,
          products: filteredProducts,
          payments: filteredPayments,
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleNavigate = (type, id) => {
    setIsOpen(false);
    setSearchTerm('');
    
    switch (type) {
      case 'invoice':
        navigate(`/invoices/view/${id}`);
        break;
      case 'client':
        navigate(`/clients/edit/${id}`);
        break;
      case 'product':
        navigate(`/products/edit/${id}`);
        break;
      case 'payment':
        navigate('/payments');
        break;
      default:
        break;
    }
  };

  const totalResults =
    results.invoices.length +
    results.clients.length +
    results.products.length +
    results.payments.length;

  return (
    <>
      {/* ✅ IMPROVED: Full-screen backdrop when search is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div ref={searchRef} className="relative z-[70]">
        {/* Search Button */}
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
        >
          <Search className="w-5 h-5" />
          <span className="hidden md:inline">Search</span>
          <span className="hidden lg:inline text-xs text-gray-500 ml-2">Ctrl+K</span>
        </button>

        {/* ✅ IMPROVED: Search Modal with better positioning and visibility */}
        {isOpen && (
          <div className="fixed left-1/2 top-20 transform -translate-x-1/2 w-[600px] max-w-[90vw] bg-white rounded-lg shadow-2xl border-2 border-blue-500 z-[70]">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 w-5 h-5" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoices, clients, products..."
                  className="w-full pl-10 pr-10 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-4 font-medium">Searching...</p>
                </div>
              ) : searchTerm.length < 2 ? (
                <div className="p-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Type at least 2 characters to search</p>
                </div>
              ) : totalResults === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 font-medium">No results found</p>
                  <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Invoices */}
                  {results.invoices.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-3 text-xs font-bold text-gray-600 uppercase bg-gray-50 sticky top-0">
                        Invoices ({results.invoices.length})
                      </p>
                      {results.invoices.map((invoice) => (
                        <button
                          key={invoice._id}
                          onClick={() => handleNavigate('invoice', invoice._id)}
                          className="w-full px-4 py-4 hover:bg-blue-50 flex items-center gap-4 transition-colors text-left border-b border-gray-100"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {invoice.client?.companyName} • ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Clients */}
                  {results.clients.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-3 text-xs font-bold text-gray-600 uppercase bg-gray-50 sticky top-0">
                        Clients ({results.clients.length})
                      </p>
                      {results.clients.map((client) => (
                        <button
                          key={client._id}
                          onClick={() => handleNavigate('client', client._id)}
                          className="w-full px-4 py-4 hover:bg-green-50 flex items-center gap-4 transition-colors text-left border-b border-gray-100"
                        >
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">
                              {client.companyName}
                            </p>
                            <p className="text-sm text-gray-600 truncate">{client.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Products */}
                  {results.products.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-3 text-xs font-bold text-gray-600 uppercase bg-gray-50 sticky top-0">
                        Products ({results.products.length})
                      </p>
                      {results.products.map((product) => (
                        <button
                          key={product._id}
                          onClick={() => handleNavigate('product', product._id)}
                          className="w-full px-4 py-4 hover:bg-purple-50 flex items-center gap-4 transition-colors text-left border-b border-gray-100"
                        >
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {product.hsnSacCode} • ₹{product.rate?.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Payments */}
                  {results.payments.length > 0 && (
                    <div>
                      <p className="px-4 py-3 text-xs font-bold text-gray-600 uppercase bg-gray-50 sticky top-0">
                        Payments ({results.payments.length})
                      </p>
                      {results.payments.map((payment) => (
                        <button
                          key={payment._id}
                          onClick={() => handleNavigate('payment', payment._id)}
                          className="w-full px-4 py-4 hover:bg-yellow-50 flex items-center gap-4 transition-colors text-left border-b border-gray-100"
                        >
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 truncate">
                              {payment.invoice?.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {payment.paymentMode} • ₹{payment.amount?.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalResults > 0 && (
              <div className="px-4 py-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-lg">
                <p className="text-sm text-gray-600 text-center font-medium">
                  {totalResults} result{totalResults !== 1 ? 's' : ''} found • Press ESC to close
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}