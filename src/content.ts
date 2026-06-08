import type {CompanyDOMData, ExtensionMessage} from "./types";

/**
 * Comprehensive LinkedIn company page DOM extractor.
 * Handles UI changes and localization with fallbacks.
 */
function extractLinkedInCompanyData(): CompanyDOMData | null {
    try {
        const data: Partial<CompanyDOMData> = {
            linkedinUrl: window.location.href.split("?")[0],
            companyName: null,
            domain: null,
            companyId: null,
            linkedInEmployeeCount: null,
            website: null,
            industry: null,
            reportedSizeRange: null,
            headquarters: null,
            foundedYear: null,
            companyType: null,
        };

        // 1. Core Identity: Company Name from org-top-card-summary__title
        const titleEl = document.querySelector('.org-top-card-summary__title');
        if (titleEl) {
            data.companyName = titleEl.textContent?.trim() || null;
        }

        // 2. Company ID from follow button tracking data
        const followBtn = document.querySelector('[data-control-name="follow"]');
        if (followBtn) {
            const trackingId = followBtn.getAttribute('data-organization-id');
            data.companyId = trackingId || null;
        }

        // 3. Employee Count from the people search link
        const employeeLink = document.querySelector('a[href*="search/results/people"]');
        if (employeeLink) {
            // Extract numeric value, e.g., "324,102 employees" -> "324,102"
            const extracted = employeeLink.textContent?.replace(/[^0-9,]/g, '').trim() || null;
            if (extracted) {
                data.linkedInEmployeeCount = extracted;
            }
        }

        // 4. Parse metadata from About section (org-page-details-module__card-spacing)
        const infoRows = document.querySelectorAll('.org-page-details-module__card-spacing dl dt');
        infoRows.forEach(dt => {
            const dd = dt.nextElementSibling;
            if (!dd) return;

            const label = dt.textContent?.trim().toLowerCase() || "";
            const value = dd.textContent?.trim() || "";

            // Multi-language support (English + French common)
            if (label.includes('site web') || label.includes('website')) {
                const anchor = dd.querySelector('a');
                if (anchor) {
                    const href = anchor.getAttribute('href');
                    if (href) data.website = href;
                } else {
                    data.website = value;
                }
            } else if (label.includes('secteur') || label.includes('industry')) {
                data.industry = value;
            } else if (label.includes('taille') || label.includes('size')) {
                // Clean extraneous text like "dont X sur LinkedIn"
                data.reportedSizeRange = value.split('\n')[0].trim() || null;
            } else if (label.includes('siège') || label.includes('headquarters')) {
                data.headquarters = value;
            } else if (label.includes('fondée') || label.includes('founded')) {
                data.foundedYear = value;
            } else if (label.includes('type')) {
                data.companyType = value;
            }
        });

        // 5. Extract domain from company website
        if (data.website && !data.domain) {
            try {
                const urlObj = new URL(data.website);
                data.domain = urlObj.hostname.replace('www.', '');
            } catch {
                // Invalid URL, skip
            }
        }

        // 6. Fallback: JSON-LD schema extraction for robustness
        if (!data.companyName || !data.website) {
            const schemaScript = document.querySelector('script[type="application/ld+json"]');
            if (schemaScript) {
                try {
                    const schema = JSON.parse(schemaScript.textContent || '{}');
                    if (schema['@type'] === 'Organization') {
                        data.companyName = data.companyName || schema.name || null;
                        data.website = data.website || schema.url || null;
                        if (schema.logo?.contentUrl) {
                            data.logoUrl = schema.logo.contentUrl;
                        }
                    }
                } catch (parseError) {
                    console.warn('Failed to parse JSON-LD schema:', parseError);
                }
            }
        }

        return data as CompanyDOMData;
    } catch (error) {
        console.error('Error during LinkedIn DOM scraping:', error);
        return null;
    }
}

// Listen for scrape extraction requests coming from the React Panel UI
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "EXTRACT_DOM") {
        const extractedData = extractLinkedInCompanyData();
        sendResponse({ type: "DOM_DATA_RESPONSE", data: extractedData });
    }
    return true; // Keeps the communication message channel open asynchronously
});