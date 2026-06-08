import type {CompanyDOMData, ExtensionMessage} from "./types";

// Listen for scrape extraction requests coming from the React Panel UI
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "EXTRACT_DOM") {
        try {
            // 1. Scrape the Company Name from the main h1 element
            const nameElement = document.querySelector("h1");
            const companyName = nameElement ? nameElement.textContent?.trim() || "" : "";

            // 2. Grab the current LinkedIn clean canonical URL reference
            const linkedinUrl = window.location.href.split("?")[0];

            // 3. Scrape the company domain out of the LinkedIn layout structures
            // Note: LinkedIn changes selectors frequently, a robust fallback strategy reads link references
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
                domain
            };

            sendResponse({ type: "DOM_DATA_RESPONSE", data: extractedData });
        } catch (error) {
            console.error("DOM Extraction failed", error);
            sendResponse({ type: "DOM_DATA_RESPONSE", data: null });
        }
    }
    return true; // Keeps the communication message channel open asynchronously
});