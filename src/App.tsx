import { useState, useEffect } from 'react';
import type { CompanyDOMData } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Load the JWT token from storage on startup and listen for OAuth callback messages
  useEffect(() => {
    chrome.storage.local.get(['attio_jwt'], (result) => {
      if (result.attio_jwt) {
        setToken(result.attio_jwt as string); // <-- Add 'as string' here
      }
    });

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ATTIO_AUTH_SUCCESS' && event.data?.token) {
        const jwt = event.data.token;
        chrome.storage.local.set({ attio_jwt: jwt });
        setToken(jwt);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // 2. Trigger the Go backend OAuth Flow
  const handleConnect = () => {
    window.open('http://localhost:8080/auth/attio', '_blank');
  };

  // 3. Coordinate DOM extraction and execute sync API call
  const handleSyncCompany = async () => {
    setLoading(true);
    setError(null);
    setSyncResult(null);

    try {
      // Find the active LinkedIn tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.includes('linkedin.com/company/')) {
        throw new Error('Please navigate to a valid LinkedIn company page.');
      }

      // Send extraction message to the content script running in that active tab
      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DOM' }, async (response) => {
        if (!response || response.type !== 'DOM_DATA_RESPONSE' || !response.data) {
          setError('Failed to extract data from page. Refresh the tab and try again.');
          setLoading(false);
          return;
        }

        const companyData: CompanyDOMData = response.data;

        // Post the extracted structural details to your Go backend
        const apiResponse = await fetch('http://localhost:8080/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            company_name: companyData.companyName,
            linkedin_url: companyData.linkedinUrl,
            domain: companyData.domain || 'unknown.com',
          }),
        });

        if (!apiResponse.ok) {
          throw new Error('Backend failed to sync record to Attio.');
        }

        const result = await apiResponse.json();
        setSyncResult(result.record_url);
        setLoading(false);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected execution error occurred.';

      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(['attio_jwt']);
    setToken(null);
    setSyncResult(null);
  };

  return (
      <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
        <h2 style={{ margin: '0 0 16px 0' }}>Attio Bridge</h2>

        {!token ? (
            <div>
              <p style={{ color: '#555', fontSize: '14px' }}>Connect your workspace to get started.</p>
              <button
                  onClick={handleConnect}
                  style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Connect Attio Account
              </button>
            </div>
        ) : (
            <div>
              <p style={{ fontSize: '13px', color: '#16a34a' }}>✓ Connected to Attio Workspace</p>

              <button
                  onClick={handleSyncCompany}
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', background: loading ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}
              >
                {loading ? 'Syncing...' : 'Sync Company to Attio'}
              </button>

              {syncResult && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>Success!</p>
                    <a href={syncResult} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}>
                      Open Record in Attio ↗
                    </a>
                  </div>
              )}

              {error && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '4px', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '13px' }}>
                    {error}
                  </div>
              )}

              <button
                  onClick={handleLogout}
                  style={{ marginTop: '32px', background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Disconnect Account
              </button>
            </div>
        )}
      </div>
  );
}