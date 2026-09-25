export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// ---- Session expiry (spec edge case): pause failed requests until the user signs back in ----
export const sessionEvents = new EventTarget();
let waiters: { resolve: () => void; reject: (e: unknown) => void }[] = [];

function waitForReauth(): Promise<void> {
  return new Promise((resolve, reject) => {
    waiters.push({ resolve, reject });
    if (waiters.length === 1) sessionEvents.dispatchEvent(new Event("session-expired"));
  });
}

export function reauthSucceeded() {
  waiters.forEach((w) => w.resolve());
  waiters = [];
}

export function reauthCancelled() {
  const err = new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  waiters.forEach((w) => w.reject(err));
  waiters = [];
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; retryAfterReauth?: boolean };

/** Calls /api/v1 on the same origin and turns the error envelope into ApiError. */
export async function api<T>(
  path: string,
  { body, retryAfterReauth = true, ...init }: Options = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Network error");
  }

  if (res.status === 401 && retryAfterReauth) {
    await waitForReauth();
    return api<T>(path, { ...init, body, retryAfterReauth: false });
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(res.status, e.code ?? "INTERNAL_ERROR", e.message ?? "", e.fields);
  }
  return data as T;
}

export type Page<T> = { data: T[]; page: number; pageSize: number; total: number };
export type One<T> = { data: T; notices?: { code: string; message: string }[] };
