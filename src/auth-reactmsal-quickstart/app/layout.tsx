import type { Metadata } from 'next';
import './globals.css';
import { MsalProvider } from './components/MsalProvider';

export const metadata: Metadata = {
  title: 'Next.js MSAL Authentication',
  description: 'Azure AD authentication with Next.js and MSAL',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MsalProvider>{children}</MsalProvider>
      </body>
    </html>
  );
}
