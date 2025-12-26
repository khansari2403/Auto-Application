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

export function getGmailAuthUrl(): string {
  return 'https://accounts.google.com/o/oauth2/v2/auth';
}

export async function exchangeGmailCode(code: string): Promise<EmailOAuthConfig> {
  return {
    provider: 'gmail',
    accessToken: 'mock_token',
    refreshToken: 'mock_refresh',
    expiresAt: Date.now() + 3600000,
  };
}

export async function refreshAccessToken(config: EmailOAuthConfig): Promise<EmailOAuthConfig> {
  return config;
}

export async function fetchGmailMessages(accessToken: string): Promise<EmailMessage[]> {
  return [];
}

export function classifyEmailType(subject: string, body: string): string {
  const lower = (subject + ' ' + body).toLowerCase();
  if (lower.includes('reject') || lower.includes('unfortunately')) return 'rejection';
  if (lower.includes('interview') || lower.includes('schedule')) return 'interview';
  if (lower.includes('offer') || lower.includes('congratulations')) return 'offer';
  if (lower.includes('information') || lower.includes('additional')) return 'info_needed';
  return 'other';
}