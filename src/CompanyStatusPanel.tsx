import type { CompanyRecognitionState } from './useCompanyRecognition';

interface CompanyStatusPanelProps {
    state: CompanyRecognitionState;
    onAdd: () => void;
    adding: boolean;
}

function formatSyncDate(syncedAt: string): string {
    const date = new Date(syncedAt);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function CompanyStatusPanel({ state, onAdd, adding }: CompanyStatusPanelProps) {
    if (state.status === 'idle') {
        return null;
    }

    if (state.status === 'checking') {
        return (
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#64748b',
            }}>
                Checking whether this company is already in Attio...
            </div>
        );
    }

    if (state.status === 'not_company_page') {
        return (
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#64748b',
            }}>
                Open a LinkedIn company page to see whether it is already synced to Attio.
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#fef2f2',
                borderRadius: '4px',
                border: '1px solid #fca5a5',
                fontSize: '13px',
                color: '#dc2626',
            }}>
                {state.message}
            </div>
        );
    }

    if (state.status === 'synced') {
        return (
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#eff6ff',
                borderRadius: '4px',
                border: '1px solid #bfdbfe',
            }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#1d4ed8', fontWeight: 'bold' }}>
                    Known company
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>
                    {state.company.company_name || 'Synced company'}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>
                    Last synced: {formatSyncDate(state.company.synced_at)}
                </p>
                <a
                    href={state.company.record_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}
                >
                    Open record in Attio ↗
                </a>
            </div>
        );
    }

    return (
        <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '4px',
            border: '1px solid #bbf7d0',
        }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#166534', fontWeight: 'bold' }}>
                New company
            </p>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#365314' }}>
                This company has not been added to Attio yet.
            </p>
            <button
                onClick={onAdd}
                disabled={adding}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: adding ? '#9ca3af' : '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: adding ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                }}
            >
                {adding ? 'Adding...' : 'Add to Attio'}
            </button>
        </div>
    );
}
