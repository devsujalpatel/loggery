export const VERSION = 'v1';

export type CachedKey = {
  userId: string;
  apiKeyDigest: string;
  expiresAt: number;
}