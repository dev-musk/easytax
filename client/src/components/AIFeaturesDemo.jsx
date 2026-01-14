// ============================================
// FILE: client/src/components/AIFeaturesDemo.jsx
// ============================================

import { useState } from 'react';
import { 
  Upload, 
  Sparkles, 
  FileText, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react';
import OCRDocumentScanner from './OCRDocumentScanner';
import SmartCategorySuggestion from './SmartCategorySuggestion';

export default function AIFeaturesDemo() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Extract, 3: Categorize
  const [extractedData, setExtractedData] = useState(null);
  const [appliedCategory, setAppliedCategory] = useState(null);
  const [showOCR, setShowOCR] = useState(false);

  const handleOCRExtraction = (data) => {
    console.log('📄 OCR Data:', data);
    setExtractedData(data);
    setStep(2);
    setShowOCR(false);
  };

  const handleCategoryApplied = (suggestion) => {
    console.log('🎯 Category Applied:', suggestion);
    setAppliedCategory(suggestion);
    setStep(3);
  };

  const reset = () => {
    setStep(1);
    setExtractedData(null);
    setAppliedCategory(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full mb-4">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">AI-Powered Invoice Processing</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Feature Demo: OCR + Smart Categorization
        </h1>
        <p className="text-gray-600">
          See how AI can extract data from bills and suggest categories automatically
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[
          { num: 1, label: 'Upload Bill', icon: Upload },
          { num: 2, label: 'AI Extract', icon: FileText },
          { num: 3, label: 'Categorize', icon: TrendingUp },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex flex-col items-center ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                step >= s.num 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s.num ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <s.icon className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-medium mt-2 text-gray-700">{s.label}</p>
            </div>
            
            {idx < 2 && (
              <div className={`w-24 h-1 mx-4 ${
                step > s.num ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Step 1: Upload Your Bill
              </h2>
              <p className="text-gray-600">
                Take a photo or upload a PDF of any vendor bill/invoice
              </p>
            </div>

            <button
              onClick={() => setShowOCR(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3 mx-auto"
            >
              <Upload className="w-6 h-6" />
              Upload Bill
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-3 gap-4 mt-8 text-sm">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-900">PDF Support</p>
                <p className="text-xs text-green-700 mt-1">Any PDF document</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-blue-900">Image Support</p>
                <p className="text-xs text-blue-700 mt-1">JPG, PNG formats</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-purple-900">AI Powered</p>
                <p className="text-xs text-purple-700 mt-1">95% accuracy</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Extracted Data */}
      {step === 2 && extractedData && (
        <div className="space-y-6">
          {/* Extraction Success */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-green-900">
                  ✓ Data Extracted Successfully!
                </h2>
                <p className="text-sm text-green-700">
                  Confidence: {extractedData.confidence}% | Found {Object.keys(extractedData).length} fields
                </p>
              </div>
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Extracted Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(extractedData)
                .filter(([key]) => !['rawText', 'confidence', 'success'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {typeof value === 'number' 
                        ? value.toLocaleString('en-IN') 
                        : value || 'Not found'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Smart Categorization */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-lg">
                Step 3: AI Category Suggestion
              </h3>
            </div>

            <SmartCategorySuggestion
              description={extractedData.description}
              vendorName={extractedData.vendorName}
              amount={extractedData.amount}
              onSuggestionAccept={handleCategoryApplied}
              onSuggestionReject={() => {
                alert('You can manually select a category');
              }}
            />
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && appliedCategory && (
        <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-green-200">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎉 Invoice Ready!
              </h2>
              <p className="text-gray-600">
                All data extracted and categorized by AI
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <h3 className="font-bold text-purple-900 mb-4">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-semibold text-gray-900">{extractedData.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-gray-900">
                    ₹{extractedData.amount?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-semibold text-purple-900">{appliedCategory.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GST Rate</p>
                  <p className="font-semibold text-blue-900">
                    {appliedCategory.taxCode?.gstRate}%
                  </p>
                </div>
              </div>
            </div>

            {/* Time Saved */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-900">
                  ⏱️ Time Saved: ~8 minutes per invoice
                </p>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Manual entry would take 10 minutes • AI took 2 minutes
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={reset}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Try Another Bill
              </button>
              <button
                onClick={() => alert('Would create invoice in real app')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Scanner Modal */}
      {showOCR && (
        <OCRDocumentScanner
          onDataExtracted={handleOCRExtraction}
          onClose={() => setShowOCR(false)}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              💡 How These Features Work Together
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">1️⃣</span>
                <span><strong>OCR Extraction:</strong> Scans bill/invoice using AI OCR (Tesseract/Google Vision)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">2️⃣</span>
                <span><strong>Data Parsing:</strong> Extracts vendor, amount, date, HSN, GSTIN using regex patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">3️⃣</span>
                <span><strong>Smart Categorization:</strong> AI suggests expense category based on keywords + history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">4️⃣</span>
                <span><strong>Tax Code Suggestion:</strong> Recommends GST rate and TDS section automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">5️⃣</span>
                <span><strong>Continuous Learning:</strong> System improves accuracy with every invoice processed</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}