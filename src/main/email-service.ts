export interface EmailOAuthConfig {
  provider: 'gmail' | 'outlook';
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
}

const GMAIL_REDIRECT_URI = 'http://localhost:5173/auth/gmail/callback';

export function getGmailAuthUrl(clientId: string): string {
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('redirect_uri', GMAIL_REDIRECT_URI);
  params.append('response_type', 'code');
  params.append('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send');
  params.append('access_type', 'offline');
  // Force account selection every time to avoid wrong account issues
  params.append('prompt', 'select_account consent');
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

export async function exchangeGmailCode(code: string, clientId: string, clientSecret: string): Promise<EmailOAuthConfig> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('redirect_uri', GMAIL_REDIRECT_URI);
  params.append('grant_type', 'authorization_code');

  const response = await fetch(tokenUrl, { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const data = await response.json() as any;
  
  return {
    provider: 'gmail',
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
}

export async function fetchGmailMessages(accessToken: string): Promise<EmailMessage[]> {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=5', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  const data = await response.json() as any;
  const messages = data.messages || [];
  const detailedMessages: EmailMessage[] = [];
  
  for (const msg of messages) {
    const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const detail = await detailRes.json() as any;
    const headers = detail.payload.headers;
    detailedMessages.push({
      id: msg.id,
      from: headers.find((h: any) => h.name === 'From')?.value || '',
      subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
      body: '', // Simplified for now
      date: new Date(parseInt(detail.internalDate))
    });
  }
  return detailedMessages;
}

export function classifyEmailType(subject: string, body: string): string {
  const lower = (subject + ' ' + body).toLowerCase();
  if (lower.includes('reject') || lower.includes('unfortunately')) return 'rejection';
  if (lower.includes('interview') || lower.includes('schedule')) return 'interview';
  return 'other';
}