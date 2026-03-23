import { authedFetch } from "./http";

export type RoomDTO = {
  id: number;
  roomType?: "DIRECT" | "GROUP";
  directKey?: string;
  title?: string;
  unread?: number;
};

export type MessageDTO = {
  content: string;
  messageType?: string;
  senderUsername: string;
};

export const roomApi = {
  listDirectRooms: async (): Promise<RoomDTO[]> => {
    return await authedFetch("/room/direct-rooms", { method: "GET" });
  },

  createDirect: async (username: string): Promise<RoomDTO> => {
    return await authedFetch("/room/create-direct", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  createGroup: async (name: string): Promise<RoomDTO> => {
    return await authedFetch("/room/group-room", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  addUserToGroup: async (
    roomId: number,
    username: string
  ): Promise<RoomDTO> => {
    return await authedFetch("/room/add-user-to-group", {
      method: "POST",
      body: JSON.stringify({ id: String(roomId), username }),
    });
  },

  enterRoom: async (roomId: number): Promise<MessageDTO[]> => {
    return await authedFetch("/room/enter", {
      method: "POST",
      body: JSON.stringify({ id: String(roomId) }),
    });
  },

  markRead: async (roomId: number): Promise<string> => {
    return await authedFetch("/room/read", {
      method: "POST",
      body: JSON.stringify({ id: String(roomId) }),
    });
  },
};