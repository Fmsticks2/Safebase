import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TweetAnalysis = ({ query }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query) {
      fetchAnalysis();
    }
  }, [query]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/social', { query });
      setAnalysis(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-4">Loading analysis...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!analysis) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Twitter Sentiment Analysis</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Sentiment Breakdown</h3>
        <div className="flex gap-4 mb-2">
          <span className={`px-3 py-1 rounded-full ${getSentimentColor('positive')}`}>
            Positive: {analysis.twitter?.positive || 0}
          </span>
          <span className={`px-3 py-1 rounded-full ${getSentimentColor('negative')}`}>
            Negative: {analysis.twitter?.negative || 0}
          </span>
          <span className={`px-3 py-1 rounded-full ${getSentimentColor('neutral')}`}>
            Neutral: {analysis.twitter?.neutral || 0}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{
              width: `${analysis.twitter ? (analysis.twitter.positive / analysis.twitter.total * 100) : 0}%`,
              backgroundColor: analysis.twitter?.positive > analysis.twitter?.negative ? '#10B981' : '#EF4444'
            }}
          ></div>
        </div>
      </div>

      {analysis.twitter?.links?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Verified Links</h3>
          <ul className="space-y-2">
            {analysis.twitter.links.map((link, index) => (
              <li key={index}>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {link.length > 50 ? `${link.substring(0, 50)}...` : link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <h3 className="font-bold text-lg mb-2">Investment Recommendation</h3>
        <p className="text-gray-800">{analysis.recommendation}</p>
      </div>
    </div>
  );
};

export default TweetAnalysis;