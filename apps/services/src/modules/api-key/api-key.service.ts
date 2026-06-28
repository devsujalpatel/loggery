import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DB } from 'src/database/database.module';
import { REDIS_CLIENT } from 'src/infra/redis.module';
import { and, count, eq } from 'drizzle-orm';
import { api_key } from '../../database/schema';

import Redis from 'ioredis';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { CachedKey, VERSION } from 'src/configs';
import {LRUCache} from 'lru-cache';

const localCache = new LRUCache<string, CachedKey>({ max: 100_1000 });

@Injectable()
export class APIKeyService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private generateKey(): { plaintextKey: string; keyId: string } {
    const keyId = crypto.randomUUID().replace(/-/g, '');
    const secret = randomBytes(32).toString('base64');
    const plaintextKey = `LOGGERY_${keyId}_${secret}`;
    return { plaintextKey, keyId };
  }

  async createApiKey(userId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(api_key)
      .where(eq(api_key.user_id, userId));
    if (result.count >= 5) {
      throw new BadRequestException(
        'You have reached the maximus limit of 5 API keys. Please contact support for more.',
      );
    }
    const { plaintextKey, keyId } = this.generateKey();
    const hash = await argon2.hash(plaintextKey, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 1 << 16,
      parallelism: 1,
    });

    const prefix = plaintextKey.substring(0, 18) + '...';
    await this.db.insert(api_key).values({
      id: keyId,
      userId: userId,
      value: hash,
      prefix: prefix,
    });
    return { key: plaintextKey };
  }

  async listApiKeys(userId: string) {
    return this.db
      .select({
        id: api_key.id,
        prefix: api_key.prefix,
        created_at: api_key.created_at,
        last_used_at: api_key.last_used_at,
        revoked_at: api_key.revoked_at,
      })
      .from(api_key)
      .where(and(eq(api_key.user_id, userId)));
  }
  async deleteApiKey(userId: string, keyId: string) {
    await this.db
      .update(api_key)
      .set({ revoked_at: new Date() })
      .where(and(eq(api_key.user_id, userId)));
    await this.redis.del(`loggery:api_key${VERSION}:${keyId}`);
    localCache.delete(`${VERSION}:${keyId}`)
  }

  async regenerateApiKey(userId: string, keyId: string) {
    
  }
}
