/**
 * offlineService.ts
 * Shared offline queue for blog likes and comments.
 * Replaces duplicated logic in blog.tsx and home.tsx.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Keys ────────────────────────────────────────────────────────────────────

const OFFLINE_LIKES_KEY = "offline_blog_likes";
const OFFLINE_COMMENTS_KEY = "offline_blog_comments";
const BLOG_CACHE_KEY = "cached_blogs";
const COMMENT_CACHE_PREFIX = "cached_blog_comments_";
const MAX_CACHED_BLOGS = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

export type OfflineLikeAction = {
  blogId: number;
  liked: boolean;
};

export type OfflineCommentAction = {
  localId: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  blogId: number;
  commentId?: number;
  content?: string;
  createdAt: string;
};

export type BlogDTO = {
  id: number;
  title: string;
  content: string;
  subject?: string;
  authorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
};

export type CommentDTO = {
  id: number;
  username: string;
  content: string;
  createdAt?: string;
};

// ─── Network detection ───────────────────────────────────────────────────────

/**
 * Returns true if the error is a real network failure (no internet),
 * false if it's a server error (4xx / 5xx).
 * This prevents server errors from being queued as offline actions.
 */
export function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  // React Native throws "Network request failed" when truly offline
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout")
  );
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export async function getOfflineLikes(): Promise<OfflineLikeAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineLike(action: OfflineLikeAction) {
  const current = await getOfflineLikes();
  // Replace existing action for same blog (last write wins)
  const filtered = current.filter((x) => x.blogId !== action.blogId);
  await AsyncStorage.setItem(
    OFFLINE_LIKES_KEY,
    JSON.stringify([...filtered, action])
  );
}

export async function removeOfflineLike(blogId: number) {
  const current = await getOfflineLikes();
  const filtered = current.filter((x) => x.blogId !== blogId);
  await AsyncStorage.setItem(OFFLINE_LIKES_KEY, JSON.stringify(filtered));
}

/**
 * FIX: Was using `break` — now uses failedActions pattern.
 * If one like fails, the rest still sync.
 */
export async function syncOfflineLikes(
  apiRequest: (path: string, options?: RequestInit) => Promise<any>
): Promise<void> {
  const actions = await getOfflineLikes();
  if (actions.length === 0) return;

  const failedActions: OfflineLikeAction[] = [];

  for (const action of actions) {
    try {
      if (action.liked) {
        await apiRequest(`/blog/like/${action.blogId}`, { method: "POST" });
      } else {
        await apiRequest(`/blog/dislike/${action.blogId}`, { method: "DELETE" });
      }
      // Successfully synced — don't add to failedActions
    } catch (e) {
      if (isNetworkError(e)) {
        // Truly offline — keep in queue
        failedActions.push(action);
        console.log("LIKE SYNC SKIPPED (offline):", action.blogId);
      } else {
        // Server error (409 already liked, 404 etc.) — drop from queue
        console.log("LIKE SYNC DROPPED (server error):", action.blogId, (e as Error).message);
      }
    }
  }

  await AsyncStorage.setItem(OFFLINE_LIKES_KEY, JSON.stringify(failedActions));
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getOfflineComments(): Promise<OfflineCommentAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineCommentsList(actions: OfflineCommentAction[]) {
  try {
    await AsyncStorage.setItem(OFFLINE_COMMENTS_KEY, JSON.stringify(actions));
  } catch (e) {
    console.log("SAVE OFFLINE COMMENTS LIST ERROR:", e);
  }
}

/**
 * Smart queue — handles conflicts:
 * - CREATE then DELETE = remove both
 * - CREATE then UPDATE = merge into CREATE
 * - UPDATE after server comment = replace previous UPDATE
 */
export async function queueOfflineCommentAction(action: OfflineCommentAction) {
  const actions = await getOfflineComments();
  let next = [...actions];
  const id = action.commentId;

  if (action.type === "CREATE") {
    next.push(action);
    await saveOfflineCommentsList(next);
    return;
  }

  if (action.type === "UPDATE") {
    if (!id || !action.content?.trim()) return;

    const existingCreateIndex = next.findIndex(
      (a) => a.type === "CREATE" && a.blogId === action.blogId && a.commentId === id
    );

    if (existingCreateIndex !== -1) {
      // Merge update into the original CREATE
      next[existingCreateIndex] = {
        ...next[existingCreateIndex],
        content: action.content.trim(),
      };
      await saveOfflineCommentsList(next);
      return;
    }

    const alreadyDeleted = next.some(
      (a) => a.type === "DELETE" && a.blogId === action.blogId && a.commentId === id
    );
    if (alreadyDeleted) return;

    // Replace previous UPDATE for same comment
    next = next.filter(
      (a) => !(a.type === "UPDATE" && a.blogId === action.blogId && a.commentId === id)
    );
    next.push(action);
    await saveOfflineCommentsList(next);
    return;
  }

  if (action.type === "DELETE") {
    if (!id) return;

    const hasOfflineCreate = next.some(
      (a) => a.type === "CREATE" && a.blogId === action.blogId && a.commentId === id
    );

    if (hasOfflineCreate) {
      // Cancel both CREATE and any UPDATE for this comment
      next = next.filter(
        (a) => !(a.blogId === action.blogId && a.commentId === id)
      );
      await saveOfflineCommentsList(next);
      return;
    }

    // Remove previous UPDATE, add DELETE
    next = next.filter(
      (a) => !(a.blogId === action.blogId && a.commentId === id)
    );
    next.push(action);
    await saveOfflineCommentsList(next);
  }
}

/**
 * FIX: Server errors drop the action, network errors keep it.
 */
export async function syncOfflineComments(
  apiRequest: (path: string, options?: RequestInit) => Promise<any>
): Promise<boolean> {
  const actions = await getOfflineComments();
  if (actions.length === 0) return false;

  console.log("SYNC OFFLINE COMMENTS:", actions.length, "actions");

  const failedActions: OfflineCommentAction[] = [];
  let syncedSomething = false;

  for (const action of actions) {
    try {
      if (action.type === "CREATE") {
        if (!action.content?.trim()) continue;
        await apiRequest(
          `/blog/comment/${action.blogId}?content=${encodeURIComponent(
            action.content.trim()
          )}&createdAt=${encodeURIComponent(action.createdAt)}`,
          { method: "POST" }
        );
      } else if (action.type === "UPDATE") {
        if (!action.commentId || !action.content?.trim()) continue;
        await apiRequest(
          `/blog/comments/${action.commentId}?content=${encodeURIComponent(
            action.content.trim()
          )}`,
          { method: "PUT" }
        );
      } else if (action.type === "DELETE") {
        if (!action.commentId) continue;
        await apiRequest(`/blog/comments/${action.commentId}`, { method: "DELETE" });
      }

      syncedSomething = true;
    } catch (e) {
      if (isNetworkError(e)) {
        // Keep in queue — no internet
        failedActions.push(action);
        console.log("COMMENT SYNC SKIPPED (offline):", action.type, action.commentId);
      } else {
        // Server error — drop to avoid infinite loop
        console.log("COMMENT SYNC DROPPED (server error):", action.type, (e as Error).message);
        syncedSomething = true; // consider it handled
      }
    }
  }

  await saveOfflineCommentsList(failedActions);
  return syncedSomething;
}

// ─── Blog cache ───────────────────────────────────────────────────────────────

export async function getCachedBlogs(): Promise<BlogDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCachedBlogs(blogs: BlogDTO[]) {
  try {
    await AsyncStorage.setItem(
      BLOG_CACHE_KEY,
      JSON.stringify(blogs.slice(0, MAX_CACHED_BLOGS))
    );
  } catch (e) {
    console.log("SAVE BLOG CACHE ERROR:", e);
  }
}

// ─── Comment cache ────────────────────────────────────────────────────────────

export async function getCachedComments(blogId: number): Promise<CommentDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(`${COMMENT_CACHE_PREFIX}${blogId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCachedComments(blogId: number, list: CommentDTO[]) {
  try {
    await AsyncStorage.setItem(
      `${COMMENT_CACHE_PREFIX}${blogId}`,
      JSON.stringify(list)
    );
  } catch (e) {
    console.log("SAVE COMMENTS CACHE ERROR:", e);
  }
}

// ─── Local ID helpers ─────────────────────────────────────────────────────────

export function makeLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeLocalCommentId(): number {
  return -(Date.now() + Math.floor(Math.random() * 100000));
}