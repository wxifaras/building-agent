'use client';

import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider as MsalReactProvider } from '@azure/msal-react';
import { msalConfig } from '@/lib/authConfig';
import { useEffect, useState } from 'react';

const msalInstance = new PublicClientApplication(msalConfig);

export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      setIsInitialized(true);
    });
  }, []);

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: 'white'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <MsalReactProvider instance={msalInstance}>
      {children}
    </MsalReactProvider>
  );
}
