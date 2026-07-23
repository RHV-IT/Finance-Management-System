/**
 * app/api/sheets/fetch/route.js
 *
 * Server-side Google Sheets fetcher.
 * Uses the service account — works for public AND private sheets.
 *
 * To allow a sheet to be fetched, share it with:
 *   rhv-hospital-dashboard@trekking-493220.iam.gserviceaccount.com
 *
 * Required .env.local vars:
 *   GOOGLE_CLIENT_EMAIL   = rhv-hospital-dashboard@trekking-493220.iam.gserviceaccount.com
 *   GOOGLE_PRIVATE_KEY    = -----BEGIN RSA PRIVATE KEY-----\n...
 *
 * ─────────────────────────────────────────────────────────────
 * POST /api/sheets/fetch
 *   Body:    { sheetId, tabName, range }
 *   Returns: { values: string[][], rowCount: number }
 *
 * GET /api/sheets/fetch?sheetId=SHEET_ID
 *   Returns: { ok, sheetTitle, tabs: string[] }
 *   Used by the Test button in Settings
 * ─────────────────────────────────────────────────────────────
 */
 
import { google } from 'googleapis';
 
function getAuth() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey  = process.env.GOOGLE_PRIVATE_KEY;
 
    if (!clientEmail) throw new Error('Missing env var: GOOGLE_CLIENT_EMAIL');
    if (!privateKey)  throw new Error('Missing env var: GOOGLE_PRIVATE_KEY');
 
    // Next.js sometimes double-escapes \n in .env.local
    const formattedKey = privateKey.includes('\\n')
        ? privateKey.replace(/\\n/g, '\n')
        : privateKey;
 
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key:  formattedKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}
 
// ─── POST — fetch sheet data ──────────────────────────────────
 
export async function POST(req) {
    try {
        const { sheetId, tabName, range = 'A:Z' } = await req.json();
 
        if (!sheetId) return Response.json({ error: 'sheetId is required' }, { status: 400 });
        if (!tabName) return Response.json({ error: 'tabName is required' }, { status: 400 });
 
        const auth   = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });
 
        console.log(`[sheets/fetch] Fetching: "${tabName}!${range}" from ${sheetId}`);
 
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range:         `${tabName}!${range}`,
        });
 
        const values = response.data.values || [];
        console.log(`[sheets/fetch] ✓ ${values.length} rows returned`);
 
        return Response.json({ values, rowCount: values.length });
 
    } catch (err) {
        console.error('[sheets/fetch POST] ERROR:', err.message);
 
        if (err.code === 403 || err.message?.includes('403')) {
            return Response.json({
                error: `Permission denied. Share this sheet with the service account: ${process.env.GOOGLE_CLIENT_EMAIL}`,
            }, { status: 403 });
        }
 
        if (err.code === 404 || err.message?.includes('not found') || err.message?.includes('Unable to parse range')) {
            return Response.json({
                error: `Sheet or tab not found. Check the Sheet ID and tab name are correct.`,
            }, { status: 404 });
        }
 
        return Response.json({ error: err.message }, { status: 500 });
    }
}
 
// ─── GET — test connection & get tab names ────────────────────
 
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const sheetId = searchParams.get('sheetId');
 
        if (!sheetId) {
            return Response.json({ error: 'sheetId query param required' }, { status: 400 });
        }
 
        const auth   = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });
 
        const response = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            fields:        'properties.title,sheets.properties.title',
        });
 
        const sheetTitle = response.data.properties?.title;
        const tabs       = (response.data.sheets || [])
            .map(s => s.properties?.title)
            .filter(Boolean);
 
        return Response.json({ ok: true, sheetTitle, tabs });
 
    } catch (err) {
        console.error('[sheets/fetch GET] ERROR:', err.message);
 
        if (err.code === 403 || err.message?.includes('403')) {
            return Response.json({
                ok:    false,
                error: `Permission denied. Share this sheet with: ${process.env.GOOGLE_CLIENT_EMAIL}`,
            }, { status: 403 });
        }
 
        if (err.code === 404) {
            return Response.json({
                ok:    false,
                error: `Sheet not found. Check the Sheet ID is correct.`,
            }, { status: 404 });
        }
 
        return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
}