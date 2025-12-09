import { useMsal } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { useState } from 'react';
import './App.css';
import { apiClient } from './apiClient';

function App() {
  const { instance, accounts } = useMsal();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    try {
      console.log('🔑 Starting login with config:', loginRequest);
      const response = await instance.loginPopup(loginRequest);
      console.log('✅ Login successful:', response);
      console.log('📋 Accounts after login:', instance.getAllAccounts());
    } catch (e) {
      console.error('❌ Login failed:', e);
      setError('Login failed: ' + (e as any).message);
    }
  };

  const handleGetToken = async () => {
    if (accounts.length === 0) {
      alert('Please sign in first');
      return;
    }
    setError('');

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });

      setToken(response.accessToken);
      navigator.clipboard.writeText(response.accessToken);
      console.log('Token:', response.accessToken);
    } catch (err: any) {
      console.error("Silent token acquisition failed. Trying popup.", err);
      try {
        const response = await instance.acquireTokenPopup({
          ...loginRequest,
          account: accounts[0]
        });
        setToken(response.accessToken);
        navigator.clipboard.writeText(response.accessToken);
        console.log('Token:', response.accessToken);
      } catch (popupErr: any) {
        console.error(popupErr);
        setError(popupErr.message || JSON.stringify(popupErr));
      }
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
    setToken('');
    setApiResponse('');
  };

  const callApi = async (endpoint: string, method: 'GET' | 'POST' = 'GET') => {
    if (!token) {
      setError('Please get a token first');
      return;
    }

    setLoading(true);
    setApiResponse('');
    setError('');

    try {
      const result = await apiClient.callApi(endpoint, token, method);
      
      if (result.error) {
        setError(`API Error (${result.status}): ${result.error}`);
      } else {
        setApiResponse(JSON.stringify(result.data, null, 2));
      }
    } catch (err: any) {
      setError('Failed to call API: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isSignedIn = accounts.length > 0;

  // Debug logging
  console.log('🔍 Current accounts:', accounts);
  console.log('🔍 Is signed in:', isSignedIn);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔑 Token Getter</h1>
                
        {!isSignedIn ? (
          <button onClick={handleLogin} style={buttonStyle}>
            Sign In
          </button>
        ) : (
          <div style={{ maxWidth: '90%', width: '800px' }}>
            <p>Signed in as: <strong>{accounts[0].username}</strong></p>
            
            <button onClick={handleGetToken} style={buttonStyle}>
              Get Token & Copy
            </button>
            
            {error && (
              <div style={{...tokenBoxStyle, backgroundColor: '#3e0b0b', border: '1px solid #ff4444'}}>
                <p style={{color: '#ff4444'}}><strong>❌ Error getting token:</strong></p>
                <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', color: '#ffcccc'}}>{error}</pre>
              </div>
            )}

            {token && (
              <div style={tokenBoxStyle}>
                <p><strong>✓ Access Token (copied to clipboard):</strong></p>
                <textarea 
                  readOnly 
                  value={token} 
                  style={textareaStyle}
                  onClick={(e) => e.currentTarget.select()}
                />
                <p style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
                  Expires: {new Date(accounts[0].idTokenClaims?.exp! * 1000).toLocaleString()}
                </p>

                {/* API Testing Section */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #30363d', paddingTop: '20px' }}>
                  <p><strong>🔌 Test API Endpoints:</strong></p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                    <button 
                      onClick={() => callApi('/api/health')} 
                      style={{...apiButtonStyle, backgroundColor: '#28a745'}}
                      disabled={loading}
                    >
                      Health Check
                    </button>
                    <button 
                      onClick={() => callApi('/api/projects')} 
                      style={apiButtonStyle}
                      disabled={loading}
                    >
                      Get Projects
                    </button>
                  </div>
                  
                  {loading && (
                    <p style={{ color: '#58a6ff', marginTop: '10px' }}>⏳ Loading...</p>
                  )}

                  {apiResponse && (
                    <div style={{ marginTop: '15px' }}>
                      <p style={{ color: '#28a745', marginBottom: '5px' }}><strong>✓ API Response:</strong></p>
                      <pre style={apiResponseStyle}>{apiResponse}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button 
              onClick={handleLogout} 
              style={{...buttonStyle, backgroundColor: '#d13438', marginTop: '10px'}}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  backgroundColor: '#0078d4',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '20px',
  fontWeight: 'bold',
};

const tokenBoxStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '20px',
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  width: '100%',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '150px',
  padding: '10px',
  fontFamily: 'monospace',
  fontSize: '12px',
  backgroundColor: '#0d1117',
  color: '#58a6ff',
  border: '1px solid #30363d',
  borderRadius: '6px',
  resize: 'vertical',
};

const apiButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  backgroundColor: '#0078d4',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '500',
};

const apiResponseStyle: React.CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  padding: '10px',
  fontFamily: 'monospace',
  fontSize: '12px',
  backgroundColor: '#0d1117',
  color: '#58a6ff',
  border: '1px solid #30363d',
  borderRadius: '6px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export default App;
