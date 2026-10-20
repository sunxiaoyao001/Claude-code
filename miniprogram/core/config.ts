// Deployment configuration. The CDN must be HTTPS, ICP-filed and listed as a downloadFile domain in the
// mini program admin console (README launch checklist). Empty = built-in packs only, no network at all.
export const CDN_BASE = '';
export const MANIFEST_URL = CDN_BASE ? `${CDN_BASE}/packs/manifest.json` : '';
