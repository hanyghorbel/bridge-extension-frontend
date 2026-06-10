import type { CompanyDOMData, ExtensionMessage } from "./types";

// Keep URL helpers inlined here so Vite never emits a shared chunk for content.js.
// Content scripts cannot load separate module chunks unless the manifest declares type:module.
function isLinkedInCompanyPage(url: string): boolean {
    return !!url && /linkedin\.com\/company\//i.test(url);
}

function normalizeLinkedInCompanyUrl(rawUrl: string): string | null {
    const withoutQuery = rawUrl.trim().split("?")[0].replace(/\/$/, "");
    const match = withoutQuery.match(/linkedin\.com\/company\/([^/?#]+)/i);
    if (!match) {
        return null;
    }

    return `https://www.linkedin.com/company/${match[1].toLowerCase()}/`;
}

function getLinkedInCompanyUrlFromTab(tabUrl: string): string | null {
    if (!isLinkedInCompanyPage(tabUrl)) {
        return null;
    }

    return normalizeLinkedInCompanyUrl(tabUrl);
}

chrome.runtime.onMessage.addListener(async (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "EXTRACT_DOM") {
        try {
            const nameElement = document.querySelector("h1");
            const companyName = nameElement ? nameElement.textContent?.trim() || "" : "";
            const linkedinUrl = getLinkedInCompanyUrlFromTab(window.location.href) ?? "";

            const domain = await extractCompanyWebsite() ?? "";

            const extractedData: CompanyDOMData = {
                companyName,
                linkedinUrl,
                domain,
            };

            sendResponse({ type: "DOM_DATA_RESPONSE", data: extractedData });
        } catch (error) {
            console.error("DOM Extraction failed", error);
            sendResponse({ type: "DOM_DATA_RESPONSE", data: null });
        }
    }
    return true;
});
async function extractCompanyWebsite() {
    let domain = null;

    // Try to find the visible "Learn more" or "Visit website" link on the main card
    let websiteLinkEl = document.querySelector('.org-top-card-primary-actions__action[href]');

    // If not found, look for and open the "Three Dots" overflow menu
    if (!websiteLinkEl) {
        const threeDotsBtn = document.querySelector('button.org-overflow-menu__dropdown-trigger') as HTMLButtonElement;

        if (threeDotsBtn) {
            threeDotsBtn.click(); // Click to force LinkedIn to inject the dropdown HTML

            // Wait 300ms for the dropdown animation/render to complete
            await new Promise(resolve => setTimeout(resolve, 300));

            // Find the link inside the newly opened dropdown menu
            websiteLinkEl = document.querySelector('.org-overflow-menu__content a[href*="http"]');
        }
    }

    // Extract and parse the URL if an element was found
    if (websiteLinkEl) {
        const urlAttr = websiteLinkEl.getAttribute("href");

        if (urlAttr) {
            try {
                const parsedUrl = new URL(urlAttr);
                domain = parsedUrl.hostname.replace("www.", "");
            } catch (e) {
                console.error("Invalid URL format found", e);
            }
        }
    }
    return domain;
}

// Run the function
extractCompanyWebsite();
