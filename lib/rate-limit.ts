type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

export function rateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const current = store.get(options.key);

  if (!current || current.resetAt <= now) {
    store.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(options.key, current);

  return {
    ok: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
  };
}

export function getRateLimitKey(req: Request, scope: string) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    "unknown";

  return `${scope}:${ip}`;
}