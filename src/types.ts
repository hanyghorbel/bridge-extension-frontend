export interface CompanyDOMData {
    companyName: string;
    linkedinUrl: string;
    domain: string;
}

export type ExtensionMessage =
    | { type: "EXTRACT_DOM" }
    | { type: "DOM_DATA_RESPONSE"; data: CompanyDOMData | null };