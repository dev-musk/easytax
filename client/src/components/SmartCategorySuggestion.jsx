// ============================================
// FILE: client/src/components/SmartCategorySuggestion.jsx
// ============================================

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Lightbulb,
  Target,
  BarChart2,
} from 'lucide-react';
import api from '../utils/api';

export default function SmartCategorySuggestion({ 
  description, 
  vendorName, 
  clientId,
  amount,
  items,
  onSuggestionAccept,
  onSuggestionReject,
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    // Only fetch if we have meaningful data
    if ((description && description.length > 5) || vendorName || clientId) {
      fetchSuggestions();
    }
  }, [description, vendorName, clientId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    setAccepted(false);
    setRejected(false);

    try {
      const response = await api.post('/api/smart-categorization/suggest-category', {
        description,
        vendorName,
        clientId,
        amount,
        items,
      });

      setSuggestions(response.data);
      
      // Log suggestion for analytics
      console.log('🤖 AI Suggestion:', response.data.primarySuggestion);
    } catch (err) {
      console.error('Suggestion error:', err);
      setError(err.response?.data?.error || 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    setAccepted(true);

    // Call parent callback
    if (onSuggestionAccept) {
      onSuggestionAccept(suggestion);
    }

    // Confirm usage for learning (fire and forget)
    try {
      await api.post('/api/smart-categorization/confirm', {
        clientId,
        category: suggestion.category,
        description,
      });
      console.log('✅ AI learned from acceptance');
    } catch (err) {
      console.error('Failed to record acceptance:', err);
    }

    // Auto-hide after 2 seconds
    setTimeout(() => {
      setAccepted(false);
    }, 2000);
  };

  const handleRejectSuggestion = async () => {
    setRejected(true);

    // Call parent callback
    if (onSuggestionReject) {
      onSuggestionReject();
    }

    // Hide after 1 second
    setTimeout(() => {
      setRejected(false);
      setSuggestions(null);
    }, 1000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">AI is analyzing...</p>
            <p className="text-xs text-purple-600 mt-1">
              Checking historical patterns and keywords
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Suggestion temporarily unavailable
            </p>
            <p className="text-xs text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-900">
              ✓ Suggestion Applied!
            </p>
            <p className="text-xs text-green-700 mt-1">
              AI is learning from your selection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected state
  if (rejected) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-gray-600" />
          <p className="text-sm text-gray-700">Suggestion dismissed</p>
        </div>
      </div>
    );
  }

  // No suggestions
  if (!suggestions || !suggestions.primarySuggestion) {
    return null;
  }

  const primary = suggestions.primarySuggestion;
  const hasAlternatives = suggestions.suggestions && suggestions.suggestions.length > 1;

  // Confidence color coding
  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 75) return 'text-blue-600 bg-blue-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 90) return <Target className="w-4 h-4" />;
    if (confidence >= 75) return <TrendingUp className="w-4 h-4" />;
    return <Lightbulb className="w-4 h-4" />;
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">
              🤖 AI Recommendation
            </h3>
            <p className="text-xs text-purple-600">
              Based on {primary.source === 'confirmed_mapping' ? 'your confirmed patterns' : 'keyword analysis'}
            </p>
          </div>
        </div>

        <button
          onClick={handleRejectSuggestion}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss suggestion"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Suggestion Card */}
      <div className="bg-white rounded-lg border-2 border-purple-200 p-4 space-y-3">
        {/* Confidence Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getConfidenceColor(primary.confidence)}`}>
            {getConfidenceIcon(primary.confidence)}
            <span>{primary.confidence.toFixed(0)}% Match</span>
          </div>
          
          {primary.confidence >= 90 && (
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              High Confidence
            </span>
          )}
        </div>

        {/* Category & Tax Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium">Category</p>
            <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200">
              <p className="text-sm font-bold text-purple-900">{primary.category}</p>
            </div>
          </div>

          {primary.taxCode && (
            <div>
              <p className="text-xs text-gray-600 mb-1 font-medium">GST Rate</p>
              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                <p className="text-sm font-bold text-blue-900">{primary.taxCode.gstRate}%</p>
              </div>
            </div>
          )}

          {primary.taxCode?.tdsSection && (
            <div className="col-span-2">
              <p className="text-xs text-gray-600 mb-1 font-medium">TDS Section</p>
              <div className="bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-200">
                <p className="text-sm font-bold text-indigo-900">{primary.taxCode.tdsSection}</p>
                <p className="text-xs text-indigo-600 mt-0.5">Tax Deducted at Source</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleAcceptSuggestion(primary)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium transition-all shadow-sm hover:shadow-md"
        >
          <CheckCircle className="w-4 h-4" />
          Apply This Suggestion
        </button>
      </div>

      {/* Alternative Suggestions */}
      {hasAlternatives && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-semibold text-purple-900">
              Other Possible Categories:
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestions.suggestions.slice(1, 4).map((alt, idx) => (
              <button
                key={idx}
                onClick={() => handleAcceptSuggestion(alt)}
                className="group px-3 py-2 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-purple-900">
                    {alt.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(alt.confidence)}`}>
                    {alt.confidence.toFixed(0)}%
                  </span>
                </div>
                {alt.taxCode && (
                  <p className="text-xs text-gray-600 mt-1">
                    GST {alt.taxCode.gstRate}%
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Learning Indicator */}
      <div className="flex items-start gap-2 pt-3 border-t border-purple-200">
        <Lightbulb className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-purple-800 font-medium">
            💡 AI improves with every invoice
          </p>
          <p className="text-xs text-purple-600 mt-0.5">
            Your selections help train the system for better future suggestions
          </p>
        </div>
      </div>

      {/* Stats (if confidence is high) */}
      {primary.confidence >= 85 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-800">
              <strong>High confidence match!</strong> This suggestion is based on {
                primary.source === 'confirmed_mapping' 
                  ? 'your previously confirmed categorization for this vendor' 
                  : 'strong keyword matches and historical patterns'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}