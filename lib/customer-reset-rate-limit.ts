type RateLimitEntry = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const attempts = new Map<string, RateLimitEntry>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

function now() {
  return Date.now();
}

function cleanup() {
  const current = now();

  for (const [key, entry] of attempts.entries()) {
    const windowExpired = current - entry.firstAttemptAt > WINDOW_MS;
    const blockExpired = !entry.blockedUntil || current > entry.blockedUntil;

    if (windowExpired && blockExpired) {
      attempts.delete(key);
    }
  }
}

export function getClientIdentifier(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function getRateLimitStatus(key: string) {
  cleanup();

  const entry = attempts.get(key);
  const current = now();

  if (!entry) {
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  if (entry.blockedUntil && current < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - current) / 1000),
    };
  }

  if (current - entry.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - entry.count),
    retryAfterSeconds: 0,
  };
}

export function registerFailedAttempt(key: string) {
  cleanup();

  const current = now();
  const entry = attempts.get(key);

  if (!entry || current - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, {
      count: 1,
      firstAttemptAt: current,
    });
    return;
  }

  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = current + BLOCK_MS;
  }

  attempts.set(key, entry);
}

export function clearFailedAttempts(key: string) {
  attempts.delete(key);
}