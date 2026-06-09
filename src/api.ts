import { getLinkedInCompanyUrlFromTab } from './linkedin';
import type {
    CompanyDOMData,
    CompanyLookupResponse,
    SyncConflictResponse,
    SyncRequest,
    SyncSuccessResponse,
    SyncedCompanySummary,
} from './types';

export const API_BASE_URL = 'http://localhost:8080';

export class SyncConflictError extends Error {
    readonly recordUrl: string;

    constructor(message: string, recordUrl: string) {
        super(message);
        this.name = 'SyncConflictError';
        this.recordUrl = recordUrl;
    }
}

async function readErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    const bodyText = await response.text();

    if (contentType.includes('application/json') && bodyText) {
        try {
            const json = JSON.parse(bodyText) as { message?: string };
            if (json.message) {
                return json.message;
            }
        } catch {
            // Fall through to plain text
        }
    }

    return bodyText.trim() || `Request failed (${response.status})`;
}

export async function syncCompany(
    token: string,
    companyData: CompanyDOMData,
): Promise<SyncSuccessResponse> {
    const payload: SyncRequest = {
        company_name: companyData.companyName,
        linkedin_url: companyData.linkedinUrl,
        domain: companyData.domain || 'unknown.com',
    };

    const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (response.status === 409) {
        const contentType = response.headers.get('content-type') ?? '';
        const bodyText = await response.text();

        if (contentType.includes('application/json') && bodyText) {
            try {
                const conflict = JSON.parse(bodyText) as SyncConflictResponse;
                throw new SyncConflictError(
                    conflict.message || 'Company record already exists in Attio',
                    conflict.record_url ?? '',
                );
            } catch (error) {
                if (error instanceof SyncConflictError) {
                    throw error;
                }
            }
        }

        throw new SyncConflictError(
            bodyText.trim() || 'Company record already exists in Attio',
            '',
        );
    }

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    const result = (await response.json()) as SyncSuccessResponse;

    if (!result.record_url) {
        throw new Error('Backend returned an invalid sync response.');
    }

    return result;
}

export function getAuthUrl(): string {
    return `${API_BASE_URL}/auth/attio`;
}

export async function lookupCompany(
    token: string,
    linkedinUrl: string,
): Promise<CompanyLookupResponse> {
    const params = new URLSearchParams({ linkedin_url: linkedinUrl });

    const response = await fetch(`${API_BASE_URL}/api/companies/lookup?${params}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    return (await response.json()) as CompanyLookupResponse;
}

export async function lookupCompanyFromActiveTab(
    token: string,
): Promise<{ type: 'not_company_page' } | { type: 'lookup'; result: CompanyLookupResponse }> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const linkedinUrl = tab?.url ? getLinkedInCompanyUrlFromTab(tab.url) : null;

    if (!linkedinUrl) {
        return { type: 'not_company_page' };
    }

    const result = await lookupCompany(token, linkedinUrl);
    return { type: 'lookup', result };
}

export function isSyncedCompany(
    response: CompanyLookupResponse,
): response is SyncedCompanySummary {
    return response.status === 'synced';
}
