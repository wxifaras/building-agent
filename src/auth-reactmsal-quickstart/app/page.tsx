'use client';

import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/authConfig';
import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const { instance, accounts } = useMsal();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');

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
  };

  const isSignedIn = accounts.length > 0;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>🔑 MSAL Authentication</h1>
        
        <div className={styles.content}>
          {!isSignedIn ? (
            <div>
              <p style={{ marginBottom: '10px' }}>Sign in to test authenticated endpoints</p>
              <button onClick={handleLogin} className={styles.button}>
                Sign In
              </button>
            </div>
          ) : (
            <div>
              <p>Signed in as: <strong>{accounts[0].username}</strong></p>
              
              <button onClick={handleGetToken} className={styles.button}>
                Get Token & Copy
              </button>
            
              {error && (
                <div className={styles.errorBox}>
                  <p><strong>❌ Error getting token:</strong></p>
                  <pre>{error}</pre>
                </div>
              )}

              {token && (
                <div className={styles.tokenBox}>
                  <p><strong>✓ Access Token (copied to clipboard):</strong></p>
                  <textarea 
                    readOnly 
                    value={token} 
                    className={styles.textarea}
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <p className={styles.expiryText}>
                    Expires: {new Date(accounts[0].idTokenClaims?.exp! * 1000).toLocaleString()}
                  </p>
                </div>
              )}
              
              {token && (
                <div className={styles.apiDocs}>
                  <p><strong>📖 API Documentation:</strong></p>
                  <p>
                    Use your token to test API endpoints at:{' '}
                    <a href={`${process.env.NEXT_PUBLIC_API_URL}/api-docs`} target="_blank" rel="noopener noreferrer">
                      {process.env.NEXT_PUBLIC_API_URL}/api-docs
                    </a>
                  </p>
                </div>
              )}

              <button 
                onClick={handleLogout} 
                className={`${styles.button} ${styles.logoutButton}`}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
