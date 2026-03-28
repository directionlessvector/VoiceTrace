import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type UserProfile = {
  id: string;
  phone: string;
  name: string;
  businessName: string | null;
  businessType: string | null;
  languagePreference: string | null;
  city: string | null;
  state: string | null;
  profileImageUrl: string | null;
};

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const userId = await resolveActiveUserId();
  return fetchJson<UserProfile>(`/users/${userId}`);
}

export async function updateCurrentUserProfile(data: Partial<{
  name: string;
  businessName: string | null;
  businessType: string | null;
  languagePreference: string;
  city: string | null;
  state: string | null;
}>): Promise<UserProfile> {
  const userId = await resolveActiveUserId();
  return fetchJson<UserProfile>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function uploadCurrentUserProfileImage(file: File): Promise<{ ok: boolean; imageUrl: string; user: UserProfile }> {
  const userId = await resolveActiveUserId();
  const form = new FormData();
  form.append("image", file);

  return fetchJson<{ ok: boolean; imageUrl: string; user: UserProfile }>(`/users/${userId}/profile-image`, {
    method: "POST",
    body: form,
  });
}
