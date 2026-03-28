const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const USER_ID_STORAGE_KEY = "voicetrace_user_id";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
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
  const cached = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (cached) return cached;

  const users = await fetchJson<Array<{ id: string }>>("/users");
  if (!users.length) {
    throw new Error("No users found. Please create a user first.");
  }

  const userId = users[0].id;
  localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  return userId;
}

export { fetchJson };
