import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { normalizePlayerCode, validatePlayerCode } from '../src/model/playerCode';
import {
    normalizeProfileName,
    PROFILE_MAX_LENGTH,
    PROFILE_MIN_LENGTH,
    validateProfileName,
} from '../src/model/profile';
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

const PROFILES_KEY = 'nback:v2:profiles';

function legacyProgressKey(code: string): string {
    const hash = createHash('sha256').update(code, 'utf8').digest('hex');
    return `nback:v1:progress:${hash}`;
}

function progressKey(profile: string): string {
    return `nback:v2:progress:${encodeURIComponent(profile.toLocaleLowerCase('en-US'))}`;
}

function revisionKey(profile: string): string {
    return `nback:v2:revision:${encodeURIComponent(profile.toLocaleLowerCase('en-US'))}`;
}

const SAVE_IF_UNCHANGED = `
local revision = tonumber(redis.call('GET', KEYS[2]) or '0')
if revision ~= tonumber(ARGV[1]) then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], revision + 1)
redis.call('SADD', KEYS[3], ARGV[3])
return revision + 1
`;

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

function extractProfile(req: VercelRequest): string | null {
    const header = req.headers['x-profile-name'];
    if (typeof header === 'string') {
        return normalizeProfileName(header);
    }
    if (Array.isArray(header) && header[0]) {
        return normalizeProfileName(header[0]);
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

    const profile = extractProfile(req);
    if (req.method === 'GET' && profile == null) {
        try {
            // Import a legacy save only when this browser already has its code.
            const auth = req.headers.authorization;
            const code = typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')
                ? normalizePlayerCode(auth.slice(7)) : null;
            if (code != null) {
                if (validatePlayerCode(code) != null) {
                    sendJson(res, 400, { error: 'Invalid legacy save' });
                    return;
                }
                const raw = await redis.get<string | ProgressDocumentV1>(legacyProgressKey(code));
                if (raw == null) {
                    sendJson(res, 404, { error: 'Legacy save not found' });
                    return;
                }
                sendJson(res, 200, normalizeProgressDocument(
                    typeof raw === 'string' ? JSON.parse(raw) as unknown : raw
                ));
                return;
            }
            const profiles = await redis.smembers(PROFILES_KEY);
            sendJson(res, 200, { profiles: profiles.sort((a, b) => a.localeCompare(b)) });
        } catch {
            sendJson(res, 503, { error: 'Progress sync temporarily unavailable' });
        }
        return;
    }
    if (profile == null) {
        sendJson(res, 400, { error: 'Profile required' });
        return;
    }
    const validationError = validateProfileName(profile);
    if (validationError != null) {
        sendJson(res, 400, {
            error: validationError,
            minLength: PROFILE_MIN_LENGTH,
            maxLength: PROFILE_MAX_LENGTH,
        });
        return;
    }

    const key = progressKey(profile);
    const revision = revisionKey(profile);

    try {
        if (req.method === 'GET') {
            const [raw, currentRevision] = await redis.mget<[
                string | ProgressDocumentV1 | null, string | number | null
            ]>(key, revision);
            res.setHeader('X-Progress-Revision', String(currentRevision ?? 0));
            if (raw == null) {
                sendJson(res, 404, { error: 'Profile does not exist' });
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
        const expectedHeader = req.headers['if-match'];
        const expected = typeof expectedHeader === 'string' ? Number(expectedHeader) : NaN;
        if (!Number.isSafeInteger(expected) || expected < 0) {
            sendJson(res, 428, { error: 'Expected progress revision required' });
            return;
        }
        const incoming = normalizeProgressDocument(req.body);
        const stamped: ProgressDocumentV1 = {
            ...incoming,
            updatedAt: new Date().toISOString(),
        };
        const nextRevision = await redis.eval<string[], number>(SAVE_IF_UNCHANGED,
            [key, revision, PROFILES_KEY],
            [String(expected), JSON.stringify(stamped), profile.toLocaleLowerCase('en-US')]);
        if (nextRevision === -1) {
            sendJson(res, 409, { error: 'Profile changed on another device' });
            return;
        }
        res.setHeader('X-Progress-Revision', String(nextRevision));
        sendJson(res, 200, stamped);
    } catch {
        sendJson(res, 503, { error: 'Progress sync temporarily unavailable' });
    }
}
