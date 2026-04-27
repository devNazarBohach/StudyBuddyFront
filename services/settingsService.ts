import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

export type SettingsDTO = {
  darkMode?: boolean | null;
  highContrast?: boolean | null;
  shareLocation?: boolean | null;
  studyReminderEnabled?: boolean | null;
  studyReminderHour?: number | null;
  studyReminderMinute?: number | null;
  pushNotifications?: boolean | null;
};

/** Fetch current settings from the backend (GET /user/settings) */
export async function fetchSettings(): Promise<SettingsDTO> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE_URL}/user/settings`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message ?? "Failed to fetch settings");
  }
  return json.data as SettingsDTO;
}

/** Save settings to the backend (PUT /user/settings) */
export async function saveSettings(dto: SettingsDTO): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE_URL}/user/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message ?? "Failed to save settings");
  }
}
