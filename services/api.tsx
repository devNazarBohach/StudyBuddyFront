// import { clearToken, getToken } from "../constants/tokens";

// import { API_BASE_URL } from "@/constants/api";
// //dsadsadasdferfe


// async function request(path: string, options: RequestInit = {}, withAuth = false) {
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//     ...(options.headers as any),
//   };

//   if (withAuth) {
//     const token = await getToken();
//     if (!token) throw new Error("No token. Please login again.");
//     headers.Authorization = `Bearer ${token}`;
//   }

//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     ...options,
//     headers,
//   });

//   const text = await res.text();
//   let data: any = null;
//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = text;
//   }

//   if (res.status === 401) {
//     await clearToken();
//     throw new Error("Unauthorized (401). Please login again.");
//   }

//   return { ok: res.ok, status: res.status, data };
// }

// export type RoomDTO = {
//   id: number;
//   roomType?: "DIRECT" | "GROUP";
//   directKey?: string;
//   title?: string;
//   unread?: number; 
// };

// export type MessageDTO = {
//   content: string;
//   messageType?: string;
//   senderUsername: string;
// };

// async function authedFetch(path: string, options: RequestInit = {}) {
//   const token = await getToken();
//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(options.headers ?? {}),
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//   });

//   const json = await res.json().catch(() => null);
//   if (!res.ok) {
//     throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
//   }
//   return json?.data ?? json;
// }

// export const roomsApi = {
//   listDirectRooms: async (): Promise<RoomDTO[]> => {
//     return await authedFetch("/room/direct-rooms", { method: "GET" });
//   },

//   createDirect: async (username: string): Promise<RoomDTO> => {
//     return await authedFetch("/room/create-direct", {
//       method: "POST",
//       body: JSON.stringify({ username }),
//     });
//   },

//   enterRoom: async (roomId: number): Promise<MessageDTO[]> => {
//     return await authedFetch("/room/enter", {
//       method: "POST",
//       body: JSON.stringify({ id: String(roomId) }),
//     });
//   },

//   markRead: async (roomId: number): Promise<string> => {
//     return await authedFetch("/room/read", {
//       method: "POST",
//       body: JSON.stringify({ id: String(roomId) }),
//     });
//   },
// };

// export const authApi = {
//   register: (payload: { email: string; username: string; password: string }) =>
//     request("/auth/register", { method: "POST", body: JSON.stringify(payload) }, false),

//   login: (payload: { username: string; password: string }) =>
//     request("/auth/login", { method: "POST", body: JSON.stringify(payload) }, false),
// };

// export const friendsApi = {
//   makeRequest: (addressee_username: string) =>
//     request(
//       "/user/make_request",
//       { method: "POST", body: JSON.stringify({ addressee_username }) },
//       true
//   ),

//   incoming: () =>
//     request("/user/friend-requests/incoming", { method: "GET" }, true),

//   outgoing: () =>
//     request("/user/friend-requests/outgoing", { method: "GET" }, true),

//   accept: (requester_username: string) =>
//     request(
//       "/user/friend-requests/accept",
//       { method: "PUT", body: JSON.stringify({ requester_username }) },
//       true
//     ),

//   reject: (requester_username: string) =>
//     request(
//       "/user/friend-requests/reject",
//       { method: "PUT", body: JSON.stringify({ requester_username }) },
//       true
//     ),
// };