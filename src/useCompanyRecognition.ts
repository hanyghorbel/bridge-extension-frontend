import { useCallback, useEffect, useState } from 'react';
import { isSyncedCompany, lookupCompanyFromActiveTab } from './api';
import type { SyncedCompanySummary } from './types';

export type CompanyRecognitionState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'not_company_page' }
    | { status: 'synced'; company: SyncedCompanySummary }
    | { status: 'not_synced' }
    | { status: 'error'; message: string };

export function useCompanyRecognition(token: string | null) {
    const [state, setState] = useState<CompanyRecognitionState>({ status: 'idle' });

    const refresh = useCallback(async () => {
        if (!token) {
            setState({ status: 'idle' });
            return;
        }

        setState({ status: 'checking' });

        try {
            const response = await lookupCompanyFromActiveTab(token);

            if (response.type === 'not_company_page') {
                setState({ status: 'not_company_page' });
                return;
            }

            if (isSyncedCompany(response.result)) {
                setState({ status: 'synced', company: response.result });
                return;
            }

            setState({ status: 'not_synced' });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Failed to check whether this company is synced.';
            setState({ status: 'error', message });
        }
    }, [token]);

    useEffect(() => {
        void refresh();

        const handleTabActivated = () => {
            void refresh();
        };

        const handleTabUpdated = (
            _tabId: number,
            changeInfo: { url?: string; status?: string },
        ) => {
            if (changeInfo.url || changeInfo.status === 'complete') {
                void refresh();
            }
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
        };
    }, [refresh]);

    return { state, refresh };
}
