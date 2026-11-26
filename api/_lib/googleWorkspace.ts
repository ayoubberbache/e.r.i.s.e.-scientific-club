import crypto from 'node:crypto';

/**
 * Google Workspace Option B Automation (Service Account with Domain-Wide Delegation
 * OR OAuth2 Refresh Token) for Gmail API (erise.club@hns-re2sd.dz) + Google Sheets API v4.
 */

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

let cachedToken: { accessToken: string; expiresAt: number; mode: 'service_account' | 'oauth2' } | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getServiceAccountConfig() {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw);
      clientEmail = parsed.client_email || clientEmail;
      privateKey = parsed.private_key || privateKey;
    } catch {
      // Ignore malformed JSON
    }
  }

  privateKey = privateKey.replace(/\\n/g, '\n');
  const impersonateEmail = process.env.GOOGLE_IMPERSONATE_EMAIL || 'erise.club@hns-re2sd.dz';

  if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    return { clientEmail, privateKey, impersonateEmail };
  }
  return null;
}

function getOAuth2Config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken };
  }
  return null;
}

export function getGoogleConfigStatus() {
  const sa = getServiceAccountConfig();
  const oauth = getOAuth2Config();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '';
  const senderEmail = process.env.GOOGLE_IMPERSONATE_EMAIL || 'erise.club@hns-re2sd.dz';

  return {
    gmailConfigured: Boolean(sa || oauth),
    authMode: sa ? 'service_account' : (oauth ? 'oauth2' : 'none'),
    senderEmail,
    sheetsConfigured: Boolean((sa || oauth) && spreadsheetId),
    spreadsheetIdMasked: spreadsheetId ? `${spreadsheetId.slice(0, 6)}...${spreadsheetId.slice(-4)}` : null,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
  };
}

export async function getGoogleAccessToken(): Promise<{ accessToken: string; mode: 'service_account' | 'oauth2' } | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return { accessToken: cachedToken.accessToken, mode: cachedToken.mode };
  }

  const sa = getServiceAccountConfig();
  if (sa) {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimSet = base64UrlEncode(JSON.stringify({
      iss: sa.clientEmail,
      sub: sa.impersonateEmail,
      scope: GOOGLE_SCOPES,
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    }));

    const signatureInput = `${header}.${claimSet}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    signer.end();
    const signature = base64UrlEncode(signer.sign(sa.privateKey));
    const assertion = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    const data: any = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(`Google Service Account auth failed: ${data.error_description || data.error || res.status}`);
    }

    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      mode: 'service_account',
    };
    return { accessToken: cachedToken.accessToken, mode: 'service_account' };
  }

  const oauth = getOAuth2Config();
  if (oauth) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data: any = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(`Google OAuth2 refresh failed: ${data.error_description || data.error || res.status}`);
    }

    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      mode: 'oauth2',
    };
    return { accessToken: cachedToken.accessToken, mode: 'oauth2' };
  }

  return null;
}

function encodeSubjectRfc2047(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

export async function sendGmailAsErise(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ id: string; sender: string }> {
  const auth = await getGoogleAccessToken();
  if (!auth) {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendKey) {
      const fromAddr = process.env.SENDER_EMAIL || 'E.R.I.S.E. Scientific Club <recruitment@erise-scientific-club.site>';
      const replyTo = params.replyTo || process.env.GOOGLE_IMPERSONATE_EMAIL || 'erise.club@hns-re2sd.dz';
      const rRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [params.to],
          reply_to: replyTo,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });
      const rData: any = await rRes.json().catch(() => ({}));
      if (!rRes.ok) {
        throw new Error(`Resend API error (${rRes.status}): ${rData?.message || JSON.stringify(rData)}`);
      }
      return { id: rData.id || `resend_${Date.now()}`, sender: fromAddr };
    }
    throw new Error('Neither Google Cloud credentials nor RESEND_API_KEY are configured');
  }

  const senderAddr = process.env.GOOGLE_IMPERSONATE_EMAIL || 'erise.club@hns-re2sd.dz';
  const replyTo = params.replyTo || senderAddr;
  const boundary = `erise_boundary_${crypto.randomBytes(8).toString('hex')}`;

  const mimeMessage = [
    `From: "E.R.I.S.E. Scientific Club" <${senderAddr}>`,
    `To: ${params.to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeSubjectRfc2047(params.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.text, 'utf8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.html, 'utf8').toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const raw = base64UrlEncode(mimeMessage);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  const data: any = await res.json();
  if (!res.ok) {
    throw new Error(`Gmail API error (${res.status}): ${data?.error?.message || JSON.stringify(data)}`);
  }

  return { id: data.id || `gmail_${Date.now()}`, sender: senderAddr };
}

export async function listSentGmailMessages(maxResults = 100): Promise<Array<{ id: string; to: string; subject: string; date: string }>> {
  const auth = await getGoogleAccessToken();
  if (!auth) throw new Error('Google Cloud credentials are not configured');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=${Math.min(100, maxResults)}`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } }
  );
  const listData: any = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Gmail list error: ${listData?.error?.message || listRes.status}`);
  }

  const messages = Array.isArray(listData.messages) ? listData.messages : [];
  const results: Array<{ id: string; to: string; subject: string; date: string }> = [];

  for (const m of messages.slice(0, 60)) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${auth.accessToken}` } }
    );
    if (!detailRes.ok) continue;
    const detail: any = await detailRes.json();
    const headers = detail?.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    results.push({
      id: m.id,
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date') || new Date(Number(detail.internalDate || Date.now())).toISOString(),
    });
  }

  return results;
}

async function ensureSheetTabExists(accessToken: string, spreadsheetId: string, tabName: string): Promise<void> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) {
    const err: any = await metaRes.json().catch(() => ({}));
    throw new Error(`Google Sheets metadata error (${metaRes.status}): ${err?.error?.message || metaRes.status}`);
  }
  const meta: any = await metaRes.json();
  const exists = (meta.sheets || []).some((s: any) => s.properties?.title === tabName);
  if (exists) return;

  const addRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabName } } }],
      }),
    }
  );
  if (!addRes.ok) {
    const err: any = await addRes.json().catch(() => ({}));
    throw new Error(`Could not create sheet tab "${tabName}": ${err?.error?.message || addRes.status}`);
  }
}

export async function replaceSheetTab(
  tabName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Promise<{ updatedRows: number }> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not configured');

  const auth = await getGoogleAccessToken();
  if (!auth) throw new Error('Google Cloud credentials are not configured');

  await ensureSheetTabExists(auth.accessToken, spreadsheetId, tabName);

  const range = `'${tabName}'!A1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A:Z:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    }
  );

  const values = [headers, ...rows.map(r => r.map(v => (v === null || v === undefined ? '' : String(v))))];
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const err: any = await updateRes.json().catch(() => ({}));
    throw new Error(`Sheets write error: ${err?.error?.message || updateRes.status}`);
  }

  return { updatedRows: rows.length };
}

export async function appendRowToSheet(
  tabName: string,
  headers: string[],
  row: (string | number | boolean | null | undefined)[]
): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) return false;
  const auth = await getGoogleAccessToken();
  if (!auth) return false;

  await ensureSheetTabExists(auth.accessToken, spreadsheetId, tabName);

  // Check if header row exists
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:A1`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } }
  );
  const checkJson: any = checkRes.ok ? await checkRes.json() : {};
  if (!checkJson.values || checkJson.values.length === 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [headers] }),
      }
    );
  }

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(tabName)}'!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row.map(v => (v === null || v === undefined ? '' : String(v)))] }),
    }
  );

  return appendRes.ok;
}
