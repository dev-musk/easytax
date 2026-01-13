import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import api from "../utils/api";

export default function OCRDocumentScanner({ onDataExtracted, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
  const selectedFile = e.target.files?.[0];

  if (!selectedFile) return;

  // ✅ Accept PDF, JPG, PNG, GIF
  const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
  if (!validTypes.includes(selectedFile.type)) {
    setError("Only PDF, JPG, PNG, and GIF files are supported");
    return;
  }

  // Validate file size (max 10MB)
  if (selectedFile.size > 10 * 1024 * 1024) {
    setError("File size must be less than 10MB");
    setFile(null);
    return;
  }

  setFile(selectedFile);
  setError(null);
  setSuccess(null);
};

  const handleScan = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      console.log("📤 Uploading file for OCR processing...", file.name);

      // Call OCR API
      const response = await api.post("/api/ocr/scan-document", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("📥 OCR Response:", response.data);

      if (response.data.success && response.data.data) {
        setSuccess("Document scanned successfully");

        // ✅ PROPERLY MAP EXTRACTED DATA
        const data = response.data.data;
        const realExtractedData = {
          // Basic invoice info
          vendorName: data.vendorName || "Not found",
          totalAmount: data.totalAmount || data.amount || 0,
          amount: data.totalAmount || data.amount || 0,
          date: data.date || new Date().toISOString().split("T")[0],
          dueDate: data.dueDate || "",

          // Line item details (for first item)
          hsn: data.hsn || "",
          gstRate: data.gstRate || 18,
          unit: data.items?.[0]?.unit || "Pcs",
          description:
            data.description || data.items?.[0]?.description || "Scanned item",
          rate: data.items?.[0]?.rate || 0,
          quantity: data.items?.[0]?.quantity || 1,

          // Additional info
          invoiceNumber: data.invoiceNumber || "",
          gstin: data.gstin || "",
          poNumber: data.poNumber || "",

          // OCR metadata
          confidence: data.confidence || 0,
          parsingConfidence: data.parsingConfidence || 0,
          rawText: data.rawText || "",

          // ✅ ALL ITEMS ARRAY
          items: data.items || [],
        };

        console.log("✅ Processed extracted data:", realExtractedData);
        setExtractedData(realExtractedData);
      } else {
        throw new Error(response.data.error || "OCR processing failed");
      }
    } catch (err) {
      console.error("❌ Scan error:", err);
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to scan document";
      setError(errorMsg);
      setExtractedData(null);
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

const handleUseData = () => {
  if (onDataExtracted && extractedData) {
    console.log('📤 Passing data to parent:', {
      description: extractedData.description,
      hsn: extractedData.hsn,
      amount: extractedData.totalAmount,
      gstRate: extractedData.gstRate,
      itemsCount: extractedData.items?.length || 0,
      confidence: extractedData.confidence
    });
    
    // Call the callback with all extracted data
    onDataExtracted({
      ...extractedData,
      // Ensure items array is passed
      items: extractedData.items || [],
    });
  } else {
    alert("❌ No data to use. Please scan an invoice first.");
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                📄 Scan Bill / Invoice
              </h3>
              <p className="text-sm text-gray-600">
                Upload PDF or image of vendor bill
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
                <p className="text-xs text-red-600 mt-1">
                  Make sure the PDF is readable and image is clear with visible
                  text
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* File Upload Area */}
          {!extractedData ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  className="hidden"
                />

                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG, GIF (max 10MB)
                </p>
              </div>

              {/* Selected File Display */}
              {file && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{file.name}</p>
                        <p className="text-xs text-blue-600">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Button */}
              <button
                onClick={handleScan}
                disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-medium transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing OCR... (10-30 seconds)
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Scan Document with AI
                  </>
                )}
              </button>

              {scanning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⏳ Processing... Tesseract OCR is analyzing your document.
                    PDF conversion may take additional time.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Extracted Data Display */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">
                      ✓ Document Scanned Successfully
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      OCR: {extractedData.confidence?.toFixed(0)}% | Parsing:{" "}
                      {extractedData.parsingConfidence?.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Extracted Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Vendor Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.vendorName || "Not extracted"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Total Amount
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{extractedData.totalAmount?.toLocaleString("en-IN") || "0"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Invoice Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.date || "Not extracted"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Due Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.dueDate || "Not extracted"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    GST Rate
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.gstRate}%
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    HSN/SAC
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.hsn || "Not extracted"}
                  </p>
                </div>

                {extractedData.invoiceNumber && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Invoice #
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {extractedData.invoiceNumber}
                    </p>
                  </div>
                )}

                {extractedData.gstin && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      GSTIN
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {extractedData.gstin}
                    </p>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              {extractedData.items && extractedData.items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3">
                    📦 Extracted Line Items ({extractedData.items.length})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-2 py-1 text-left">S.No</th>
                          <th className="px-2 py-1 text-left">Description</th>
                          <th className="px-2 py-1 text-left">HSN</th>
                          <th className="px-2 py-1 text-right">Qty</th>
                          <th className="px-2 py-1 text-right">Rate</th>
                          <th className="px-2 py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">{item.sno}</td>
                            <td className="px-2 py-1">{item.description}</td>
                            <td className="px-2 py-1">{item.hsn}</td>
                            <td className="px-2 py-1 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-2 py-1 text-right">
                              ₹{item.rate?.toLocaleString()}
                            </td>
                            <td className="px-2 py-1 text-right">
                              ₹{item.amount?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Warning for Low Confidence */}
              {(extractedData.confidence < 70 ||
                extractedData.parsingConfidence < 50) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-700">
                    <strong>⚠️ Low Confidence Detected:</strong> Please review
                    the extracted data carefully. For best results, use
                    high-resolution images (300+ DPI) with clear, well-lit text.
                  </p>
                </div>
              )}

              {/* Raw Text (collapsed) */}
              {extractedData.rawText && (
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                    📝 View Raw OCR Text (click to expand)
                  </summary>
                  <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-40 overflow-y-auto">
                    {extractedData.rawText}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setExtractedData(null);
                    setFile(null);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleUseData}
                  className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  ✓ Use This Data
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  ✨ How OCR Works:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ Upload scanned bill, invoice, or PDF document</li>
                  <li>
                    ✓ Tesseract.js AI extracts vendor, amount, date, HSN, items,
                    GST
                  </li>
                  <li>✓ Shows all extracted line items from the table</li>
                  <li>✓ Review data and make corrections if needed</li>
                  <li>
                    ✓ Works best with clear, high-resolution images (300+ DPI)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
