import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// 🚀 LIVE BACKEND CONFIG - Replace with your actual Railway URL
const API_URL = process.env.REACT_APP_API_URL || 'https://your-railway-app.railway.app'; // ← FIXED: Live backend
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [content, setContent] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // FIXED: Use LIVE API_URL instead of localhost
  const ingestData = async () => {
    if (!content.trim()) {
      alert('Please enter some content first!');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Sending to LIVE backend:', { 
        source: 'web', 
        content: content.substring(0, 50) + '...',
        url: API_URL 
      });
      
      // FIXED: Hits Railway, not localhost
      const response = await axios.post(`${API_URL}/ingest`, {
        source: 'web',
        content: content.trim()
      }, {
        timeout: 10000 // 10s timeout for slow Railway cold starts
      });
      
      console.log('✅ Ingested:', response.data);
      await fetchData();  // Refresh data from Supabase
      setContent('');
      alert('✅ Data ingested successfully to Africa\'s Scale AI!');
      
    } catch (error) {
      console.error('❌ Backend error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || 
                      error.code === 'ECONNABORTED' ? 'Backend timeout - try again' :
                      error.message || 'Failed to ingest data';
      setError(errorMsg);
      alert(`Failed: ${errorMsg}`);
    }
    
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching data from Supabase...');
      const { data: items, error } = await supabase
        .from('data_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Supabase error:', error);
        setError(`Failed to fetch data: ${error.message}`);
        return;
      }
      
      setData(items || []);
      console.log('✅ Fetched', items?.length || 0, 'records');
      
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Connection error - check Supabase config');
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2563eb', margin: 0 }}>🪐 Axial Data Dashboard</h1>
        <p style={{ color: '#6b7280', margin: '5px 0 0' }}>
          Africa's Scale AI - Ingest & Label 2,000+ Languages
        </p>
        <small style={{ color: '#9ca3af' }}>
          Backend: {API_URL.startsWith('http://localhost') ? '🟡 Local' : '🟢 Live'}
        </small>
      </header>
      
      {/* Error display */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#991b1b', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          borderLeft: '4px solid #ef4444'
        }}>
          ❌ {error}
          <button 
            onClick={() => setError(null)} 
            style={{ 
              float: 'right', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: '#991b1b'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* INGEST FORM */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '12px',
        background: '#f9fafb'
      }}>
        <h3 style={{ margin: '0 0 15px', color: '#374151' }}>📤 Ingest New Data</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste Swahili, Yoruba, Amharic, Hausa... e.g., 'Jambo! Teknolojia ya Afrika inakua haraka' or 'Ẹ ṣeun, AI yoo ṣe iranlọwọ fun wa'"
          style={{ 
            width: '100%', 
            minHeight: '100px', 
            padding: '12px', 
            borderRadius: '6px', 
            border: '1px solid #d1d5db',
            marginBottom: '12px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'monospace'
          }}
          disabled={loading}
        />
        <button 
          onClick={ingestData} 
          disabled={loading || !content.trim()}
          style={{ 
            padding: '12px 24px', 
            background: loading || !content.trim() ? '#9ca3af' : '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                ⏳
              </span>
              Processing...
            </>
          ) : (
            '🚀 Ingest & Auto-Label'
          )}
        </button>
      </div>

      {/* DATA DISPLAY */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#1f2937' }}>📊 Recent Data ({data.length})</h3>
          <button 
            onClick={fetchData}
            disabled={loading}
            style={{ 
              padding: '6px 12px', 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
        
        {data.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#6b7280',
            border: '2px dashed #d1d5db',
            borderRadius: '8px'
          }}>
            <p>No data yet. Try ingesting some African language text above!</p>
            <small>💡 Tip: Paste market prices, tweets, or local news</small>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map((item) => (
              <div key={item.id} style={{ 
                border: '1px solid #e5e7eb', 
                padding: '15px', 
                borderRadius: '8px',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong>📝 Content:</strong> 
                  <span style={{ color: '#374151' }}>{item.content.substring(0, 100)}...</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>🌍 Language:</span>
                  <span style={{ 
                    background: '#dbeafe', 
                    color: '#1e40af', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {item.language_code || 'undetected'}
                  </span>
                  
                  <span style={{ color: '#6b7280' }}>🏷️ Labels:</span>
                  <span>
                    {Array.isArray(item.labels) ? 
                      item.labels.map(label => 
                        <span key={label} style={{ 
                          background: '#d1fae5', 
                          color: '#065f46', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontSize: '11px',
                          marginRight: '4px',
                          marginBottom: '2px',
                          display: 'inline-block'
                        }}>
                          {label}
                        </span>
                      ) : 'None'
                    }
                  </span>
                  
                  <span style={{ color: '#6b7280' }}>📡 Source:</span>
                  <span style={{ color: '#059669', fontWeight: '500' }}>{item.source}</span>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#9ca3af', 
                  marginTop: '8px',
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: '8px'
                }}>
                  Added: {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;