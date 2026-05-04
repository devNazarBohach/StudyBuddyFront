import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { friendsApi } from "../services/friendsApi";

export type Friend = {
  username: string;
  displayName: string;
};

export type FriendRequest = {
  id: string;
  requester_username: string;
  addressee_username: string;
  createdAt?: number;
};

type AppState = {
  adminMode: boolean;
  setAdminMode: (v: boolean) => void;

  myUsername: string;
  setMyUsername: (v: string) => void;

  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];

  refreshAll: () => Promise<void>;

  sendFriendRequest: (addresseeUsername: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function cleanUsername(u: string) {
  return u.trim().replace(/^@/, "");
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [adminMode, setAdminMode] = useState(false);
  const [myUsername, setMyUsername] = useState("meteor_destroyer");

  const [friends, setFriends] = useState<Friend[]>([
    { username: "meteor_destroyer", displayName: "Andrii" },
  ]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

 const refreshAll = useCallback(async () => {
  if (adminMode) return;

  const [inc, out, fr] = await Promise.all([
    friendsApi.getIncomingRequests(),
    friendsApi.getOutgoingRequests(),
    friendsApi.getFriends(),
  ]);

  setIncomingRequests(
    inc.map((dto: any) => ({
      id: String(dto.id),
      requester_username: dto.username,
      addressee_username: myUsername,
      createdAt: dto.createdAt,
    }))
  );

  setOutgoingRequests(
    out.map((dto: any) => ({
      id: String(dto.id),
      requester_username: myUsername,
      addressee_username: dto.username,
      createdAt: dto.createdAt,
    }))
  );

  setFriends(
    fr.map((x: any) => ({
      username: x.username,
      displayName: x.username,
    }))
  );
}, [adminMode, myUsername]);

  const value = useMemo<AppState>(() => {
    async function sendFriendRequest(addresseeUsername: string) {
      const adr = cleanUsername(addresseeUsername);
      if (!adr || adr === myUsername) return;

      if (adminMode) {
        if (outgoingRequests.some((r) => r.addressee_username === adr)) return;
        setOutgoingRequests((prev) => [
          { id: uid(), requester_username: myUsername, addressee_username: adr },
          ...prev,
        ]);
        return;
      }
      const accepted = await friendsApi.getFriends();

    setFriends(
      accepted.map((f) => ({
        username: f.username,
        displayName: f.username,
      }))
    );

    await friendsApi.makeRequest(adr);
        await refreshAll();
      }

    async function acceptFriendRequest(requestId: string) {
      if (adminMode) {
        const req = incomingRequests.find((r) => r.id === requestId);
        if (!req) return;

        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
        setFriends((prev) => {
          if (prev.some((f) => f.username === req.requester_username)) return prev;
          return [
            { username: req.requester_username, displayName: req.requester_username },
            ...prev,
          ];
        });
        return;
      }

      throw new Error("acceptFriendRequest: backend endpoint not implemented yet");
    }

    async function declineFriendRequest(requestId: string) {
      if (adminMode) {
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
        return;
      }

      throw new Error("declineFriendRequest: backend endpoint not implemented yet");
    }



    return {
      adminMode,
      setAdminMode,
      myUsername,
      setMyUsername,
      friends,
      incomingRequests,
      outgoingRequests,
      refreshAll,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
    };
  }, [adminMode, myUsername, friends, incomingRequests, outgoingRequests]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}

function mapRequest(dto: any): FriendRequest {
  return {
    id: String(dto.id),
    requester_username: dto.requester_username,
    addressee_username: dto.addressee_username,
    createdAt: dto.createdAt,
  };
}

function mapFriend(dto: { username: string; displayName?: string }): Friend {
  return {
    username: dto.username,
    displayName: dto.displayName ?? dto.username,
  };
}