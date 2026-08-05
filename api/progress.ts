import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import {
    normalizePlayerCode,
    PLAYER_CODE_MAX_LENGTH,
    PLAYER_CODE_MIN_LENGTH,
    validatePlayerCode,
} from '../src/model/playerCode';
import {
    normalizeProgressDocument,
    type ProgressDocumentV1,
} from '../src/model/progressDocument';

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 40;

function getRedis(): Redis {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url == null || url === '' || token == null || token === '') {
        throw new Error('Redis is not configured');
    }
    return new Redis({ url, token });
}

function progressKey(code: string): string {
    const hash = createHash('sha256').update(code, 'utf8').digest('hex');
    return `nback:v1:progress:${hash}`;
}

function clientIp(req: VercelRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0]!.trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].split(',')[0]!.trim();
    }
    return req.socket?.remoteAddress ?? 'unknown';
}

function extractPlayerCode(req: VercelRequest): string | null {
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
        return normalizePlayerCode(auth.slice(7));
    }
    const header = req.headers['x-player-code'];
    if (typeof header === 'string') {
        return normalizePlayerCode(header);
    }
    if (Array.isArray(header) && header[0]) {
        return normalizePlayerCode(header[0]);
    }
    return null;
}

async function allowRequest(redis: Redis, ip: string): Promise<boolean> {
    const key = `nback:v1:rl:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
    }
    return count <= RATE_LIMIT_MAX;
}

function sendJson(res: VercelResponse, status: number, body: unknown): void {
    res.status(status).setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'PUT') {
        res.setHeader('Allow', 'GET, PUT');
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }

    let redis: Redis;
    try {
        redis = getRedis();
    } catch {
        sendJson(res, 503, { error: 'Progress sync is not configured' });
        return;
    }

    const ip = clientIp(req);
    try {
        const allowed = await allowRequest(redis, ip);
        if (!allowed) {
            sendJson(res, 429, { error: 'Too many requests — try again in a minute' });
            return;
        }
    } catch {
        sendJson(res, 503, { error: 'Progress sync temporarily unavailable' });
        return;
    }

    const code = extractPlayerCode(req);
    if (code == null || code === '') {
        sendJson(res, 401, { error: 'Player code required' });
        return;
    }
    const validationError = validatePlayerCode(code);
    if (validationError != null) {
        sendJson(res, 400, {
            error: validationError,
            minLength: PLAYER_CODE_MIN_LENGTH,
            maxLength: PLAYER_CODE_MAX_LENGTH,
        });
        return;
    }

    const key = progressKey(code);

    try {
        if (req.method === 'GET') {
            const raw = await redis.get<string | ProgressDocumentV1>(key);
            if (raw == null) {
                sendJson(res, 404, { error: 'No progress for this player code' });
                return;
            }
            const doc =
                typeof raw === 'string'
                    ? normalizeProgressDocument(JSON.parse(raw) as unknown)
                    : normalizeProgressDocument(raw);
            sendJson(res, 200, doc);
            return;
        }

        // PUT
        const incoming = normalizeProgressDocument(req.body);
        const stamped: ProgressDocumentV1 = {
            ...incoming,
            updatedAt: isIsoDate(incoming.updatedAt)
                ? incoming.updatedAt
                : new Date().toISOString(),
        };
        await redis.set(key, JSON.stringify(stamped));
        sendJson(res, 200, stamped);
    } catch {
        sendJson(res, 503, { error: 'Progress sync temporarily unavailable' });
    }
}

function isIsoDate(value: string): boolean {
    return Number.isFinite(Date.parse(value));
}
