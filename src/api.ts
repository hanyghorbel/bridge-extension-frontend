import type { CompanyDOMData, SyncConflictResponse, SyncRequest, SyncSuccessResponse } from './types';

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
