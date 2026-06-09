import type { CompanyDOMData } from './types';

export function extractDomFromTab(tabId: number): Promise<CompanyDOMData> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_DOM' }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error('Could not reach the LinkedIn page. Refresh the tab and try again.'));
                return;
            }

            if (!response || response.type !== 'DOM_DATA_RESPONSE' || !response.data) {
                reject(new Error('Failed to extract data from page. Refresh the tab and try again.'));
                return;
            }

            if (!response.data.companyName.trim()) {
                reject(new Error('Could not find a company name on this page.'));
                return;
            }

            if (!response.data.linkedinUrl.includes('linkedin.com/company/')) {
                reject(new Error('Please navigate to a valid LinkedIn company page.'));
                return;
            }

            resolve(response.data);
        });
    });
}
