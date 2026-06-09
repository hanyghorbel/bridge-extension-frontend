export interface CompanyDOMData {
    companyName: string;
    linkedinUrl: string;
    domain: string;
}

export type ExtensionMessage =
    | { type: "EXTRACT_DOM" }
    | { type: "DOM_DATA_RESPONSE"; data: CompanyDOMData | null };

export interface SyncRequest {
    company_name: string;
    linkedin_url: string;
    domain: string;
}

export interface SyncSuccessResponse {
    status: "success";
    record_url: string;
}

export interface SyncConflictResponse {
    status: "conflict";
    message: string;
    record_url: string;
}
