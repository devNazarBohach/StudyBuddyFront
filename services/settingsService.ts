import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

export async function updateUserSetting(key: string, value: boolean) {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      setting: key,
      value,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update setting");
  }

  return response.json();
}