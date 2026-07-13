export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiOptions = {
  timeoutMs?: number;
};

function hasRequestBody(init?: RequestInit): boolean {
  return init?.body !== undefined && init.body !== null;
}

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      throw new ApiError('The server returned an invalid response. Please try again.', 502);
    }
  }
  const text = await res.text();
  return text || null;
}

export async function apiJson<T>(input: RequestInfo | URL, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 15000);

  try {
    const headers = new Headers(init.headers);
    if (hasRequestBody(init) && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(input, {
      credentials: "same-origin",
      ...init,
      headers,
      signal: controller.signal,
    });
    const payload = await parseResponse(res);

    if (!res.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error || "Request failed")
        : `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, payload);
    }

    return payload as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && timedOut) {
      throw new ApiError('Request timed out. Please check your connection and try again.', 408);
    }
    if (err instanceof TypeError) {
      throw new ApiError('We could not reach GoTogether. Check your connection and try again.', 0);
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}
