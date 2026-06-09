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

async function lookupCompanyState(token: string | null): Promise<CompanyRecognitionState> {
    if (!token) {
        return { status: 'idle' };
    }

    try {
        const response = await lookupCompanyFromActiveTab(token);

        if (response.type === 'not_company_page') {
            return { status: 'not_company_page' };
        }

        if (isSyncedCompany(response.result)) {
            return { status: 'synced', company: response.result };
        }

        return { status: 'not_synced' };
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : 'Failed to check whether this company is synced.';
        return { status: 'error', message };
    }
}

export function useCompanyRecognition(token: string | null) {
    const [state, setState] = useState<CompanyRecognitionState>({ status: 'idle' });

    const refresh = useCallback(async () => {
        setState({ status: 'checking' });
        const nextState = await lookupCompanyState(token);
        setState(nextState);
    }, [token]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const nextState = await lookupCompanyState(token);
            if (!cancelled) {
                setState(nextState);
            }
        }

        void load();

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
            cancelled = true;
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
        };
    }, [token, refresh]);

    return { state, refresh };
}
