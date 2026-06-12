const API_BASE = "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("timii_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("timii_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("timii_token");
  }
}

export function hasToken(): boolean {
  return getToken() !== null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: { error?: string } = {};
      try {
        body = await res.json();
      } catch {
        // ignore parse errors
      }
      const err = new ApiError(res.status, body.error || `API error ${res.status}`);
      if (res.status === 401) {
        clearToken();
        // Notify auth store to update user state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("timii:unauthorized"));
        }
      }
      throw err;
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}
