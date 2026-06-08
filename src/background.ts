// Enable the side panel to slide open when the user clicks the extension action icon
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Failed setting panel behavior:", error));