export function isLinkedInCompanyPage(url: string | undefined): boolean {
    return !!url && /linkedin\.com\/company\//i.test(url);
}

export function normalizeLinkedInCompanyUrl(rawUrl: string): string | null {
    const withoutQuery = rawUrl.trim().split('?')[0].replace(/\/$/, '');
    const match = withoutQuery.match(/linkedin\.com\/company\/([^/?#]+)/i);
    if (!match) {
        return null;
    }

    return `https://www.linkedin.com/company/${match[1].toLowerCase()}/`;
}

export function getLinkedInCompanyUrlFromTab(tabUrl: string): string | null {
    if (!isLinkedInCompanyPage(tabUrl)) {
        return null;
    }

    return normalizeLinkedInCompanyUrl(tabUrl);
}
