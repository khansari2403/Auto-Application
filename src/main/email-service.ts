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

// Gmail OAuth Configuration from environment variables
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5173/auth/gmail/callback';

export function getGmailAuthUrl(): string {
  const params = new URLSearchParams();
  params.append('client_id', GMAIL_CLIENT_ID);
  params.append('redirect_uri', GMAIL_REDIRECT_URI);
  params.append('response_type', 'code');
  params.append('scope', 'https://www.googleapis.com/auth/gmail.readonly');
  params.append('access_type', 'offline');
  params.append('prompt', 'consent');
  
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  console.log('Gmail Auth URL generated:', authUrl);
  return authUrl;
}

export async function exchangeGmailCode(code: string): Promise<EmailOAuthConfig> {
  try {
    console.log('Exchanging Gmail authorization code for token...');
    
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', GMAIL_CLIENT_ID);
    params.append('client_secret', GMAIL_CLIENT_SECRET);
    params.append('redirect_uri', GMAIL_REDIRECT_URI);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token: ' + response.statusText);
    }

    const data = await response.json() as any;
    
    console.log('Successfully exchanged code for token');
    
    return {
      provider: 'gmail',
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
  } catch (error) {
    console.error('Failed to exchange Gmail code:', error);
    throw error;
  }
}

export async function refreshAccessToken(config: EmailOAuthConfig): Promise<EmailOAuthConfig> {
  try {
    console.log('Refreshing Gmail access token...');
    
    if (!config.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('client_id', GMAIL_CLIENT_ID);
    params.append('client_secret', GMAIL_CLIENT_SECRET);
    params.append('refresh_token', config.refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token: ' + response.statusText);
    }

    const data = await response.json() as any;
    
    console.log('Successfully refreshed access token');
    
    return {
      ...config,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
}

export async function fetchGmailMessages(accessToken: string): Promise<EmailMessage[]> {
  try {
    console.log('Fetching Gmail messages...');
    
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Gmail messages: ' + response.statusText);
    }

    const data = await response.json() as any;
    console.log('Fetched ' + (data.messages?.length || 0) + ' unread emails');
    
    return [];
  } catch (error) {
    console.error('Failed to fetch Gmail messages:', error);
    throw error;
  }
}

export function classifyEmailType(subject: string, body: string): string {
  const lower = (subject + ' ' + body).toLowerCase();
  if (lower.includes('reject') || lower.includes('unfortunately')) return 'rejection';
  if (lower.includes('interview') || lower.includes('schedule')) return 'interview';
  if (lower.includes('offer') || lower.includes('congratulations')) return 'offer';
  if (lower.includes('information') || lower.includes('additional')) return 'info_needed';
  return 'other';
}