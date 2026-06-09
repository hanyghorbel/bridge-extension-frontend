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

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "EXTRACT_DOM") {
        try {
            const nameElement = document.querySelector("h1");
            const companyName = nameElement ? nameElement.textContent?.trim() || "" : "";
            const linkedinUrl = getLinkedInCompanyUrlFromTab(window.location.href) ?? "";

            let domain = "";
            const websiteLink = document.querySelector("a[href*='//'][target='_blank']");
            if (websiteLink) {
                const urlAttr = websiteLink.getAttribute("href");
                if (urlAttr) {
                    const parsedUrl = new URL(urlAttr);
                    domain = parsedUrl.hostname.replace("www.", "");
                }
            }

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
