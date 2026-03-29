const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://voicetrace-api-xtzg.onrender.com";

const TOKEN_KEY = "voicetrace_token";
const USER_KEY = "voicetrace_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as { id: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  let response: Response;
  try {
    const contentHeaders: Record<string, string> =
      init?.body && typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {};

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...contentHeaders,
        ...authHeaders,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Start backend server (cd backend && npm run dev).`);
    }
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || `Request failed: ${response.status}`);
  }
  return payload as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function resolveActiveUserId(): Promise<string> {
  const id = getStoredUserId();
  if (id) return id;
  throw new Error("Not authenticated. Please log in.");
}

export { fetchJson };
