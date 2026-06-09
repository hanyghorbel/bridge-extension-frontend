import { useState, useEffect } from 'react';
import CompanyStatusPanel from './CompanyStatusPanel';
import { getAuthUrl, syncCompany, SyncConflictError } from './api';
import { extractDomFromTab } from './extension';
import { useCompanyRecognition } from './useCompanyRecognition';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state: recognitionState, refresh: refreshRecognition } = useCompanyRecognition(token);

  useEffect(() => {
    chrome.storage.local.get(['attio_jwt'], (result) => {
      if (result.attio_jwt) {
        setToken(result.attio_jwt as string);
      }
    });

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ATTIO_AUTH_SUCCESS' && event.data?.token) {
        const jwt = event.data.token;
        chrome.storage.local.set({ attio_jwt: jwt });
        setToken(jwt);
        setError(null);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  useEffect(() => {
    const clearSyncFeedback = () => {
      setSyncResult(null);
      setSyncConflict(null);
      setError(null);
    };

    const handleTabActivated = () => {
      clearSyncFeedback();
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: { url?: string },
    ) => {
      if (changeInfo.url) {
        clearSyncFeedback();
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);

  const handleConnect = () => {
    window.open(getAuthUrl(), '_blank');
  };

  const handleSyncCompany = async () => {
    setLoading(true);
    setError(null);
    setSyncResult(null);
    setSyncConflict(null);

    try {
      if (!token) {
        throw new Error('Please connect your Attio account first.');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.includes('linkedin.com/company/')) {
        throw new Error('Please navigate to a valid LinkedIn company page.');
      }

      const companyData = await extractDomFromTab(tab.id);
      const result = await syncCompany(token, companyData);
      setSyncResult(result.record_url);
      await refreshRecognition();
    } catch (err) {
      if (err instanceof SyncConflictError) {
        setSyncConflict(err.recordUrl || null);
        setError(err.message);
        await refreshRecognition();
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected execution error occurred.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(['attio_jwt']);
    setToken(null);
    setSyncResult(null);
    setSyncConflict(null);
    setError(null);
  };

  const showStandaloneSyncButton =
      recognitionState.status !== 'not_synced' &&
      recognitionState.status !== 'synced';

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
              <p style={{ fontSize: '13px', color: '#16a34a', marginBottom: '16px' }}>✓ Connected to Attio Workspace</p>

              <CompanyStatusPanel
                  state={recognitionState}
                  onAdd={handleSyncCompany}
                  adding={loading}
              />

              {showStandaloneSyncButton && (
                  <button
                      onClick={handleSyncCompany}
                      disabled={loading || recognitionState.status === 'not_company_page'}
                      style={{ width: '100%', padding: '12px', background: loading ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}
                  >
                    {loading ? 'Syncing...' : 'Sync Company to Attio'}
                  </button>
              )}

              {syncResult && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>Success!</p>
                    <a href={syncResult} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}>
                      Open Record in Attio ↗
                    </a>
                  </div>
              )}

              {error && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: syncConflict ? '#fffbeb' : '#fef2f2',
                    borderRadius: '4px',
                    border: syncConflict ? '1px solid #fcd34d' : '1px solid #fca5a5',
                    color: syncConflict ? '#b45309' : '#dc2626',
                    fontSize: '13px',
                  }}>
                    <p style={{ margin: 0 }}>{error}</p>
                    {syncConflict && (
                        <a
                            href={syncConflict}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}
                        >
                          Open existing record in Attio ↗
                        </a>
                    )}
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
