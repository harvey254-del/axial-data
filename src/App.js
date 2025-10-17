import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [content, setContent] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // FIXED: Proper error handling + validation
  const ingestData = async () => {
    if (!content.trim()) {
      alert('Please enter some content first!');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Sending to backend:', { source: 'web', content: content.substring(0, 50) + '...' });
      
      const response = await axios.post('http://localhost:8000/ingest', {
        source: 'web',
        content: content.trim()
      });
      
      console.log('✅ Ingested:', response.data);
      await fetchData();  // Wait for refresh
      setContent('');
      alert('✅ Data ingested successfully!');
      
    } catch (error) {
      console.error('❌ Backend error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to ingest data';
      setError(errorMsg);
      alert(`Failed: ${errorMsg}`);
    }
    
    setLoading(false);
  };

  // FIXED: Added await + error handling for Supabase
  const fetchData = async () => {
    try {
      console.log('🔄 Fetching data from Supabase...');
      const { data: items, error } = await supabase  // ← ADDED AWAIT + ERROR CHECK
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
      setError('Connection error - check backend and Supabase');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // FIXED: onChange bug - e.value → e.target.value
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🪐 Axial Data Dashboard</h1>
      <p>Africa's Scale AI - Ingest & Label Multilingual Data</p>
      
      {/* Error display */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          ❌ {error}
        </div>
      )}
      
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Ingest New Data</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}  // ← FIXED: e.value → e.target.value
          placeholder="Paste Swahili, Yoruba, Amharic text here... e.g., 'Jambo! Teknolojia ya Afrika inakua'"
          style={{ 
            width: '100%', 
            height: '100px', 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            marginBottom: '10px'
          }}
          rows={4}
        />
        <button 
          onClick={ingestData} 
          disabled={loading || !content.trim()}
          style={{ 
            padding: '10px 20px', 
            background: loading || !content.trim() ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading || !content.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : '🚀 Ingest & Label'}
        </button>
      </div>

      <h3>Recent Data ({data.length})</h3>
      {data.length === 0 ? (
        <p>No data yet. Try ingesting some African language text above!</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {data.map((item) => (
            <div key={item.id} style={{ 
              border: '1px solid #e0e0e0', 
              padding: '15px', 
              borderRadius: '8px',
              background: '#f9f9f9'
            }}>
              <div><strong>📝 Content:</strong> {item.content.substring(0, 100)}...</div>
              <div><strong>🌍 Language:</strong> {item.language_code || 'undetected'}</div>
              <div><strong>🏷️ Labels:</strong> {Array.isArray(item.labels) ? item.labels.join(', ') : 'None'}</div>
              <div><strong>📡 Source:</strong> {item.source}</div>
              <small>Added: {new Date(item.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;