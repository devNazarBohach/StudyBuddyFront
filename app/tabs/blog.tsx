import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";

type Subject = string;

type BlogDTO = {
  id: number;
  title: string;
  content: string;
  subject?: Subject;
  authorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
};

type CommentDTO = {
  id: number;
  username: string;
  content: string;
  createdAt?: string;
};

type PageResponse<T> = {
  content: T[];
  last: boolean;
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

type OfflineLikeAction = {
  blogId: number;
  liked: boolean;
};
type OfflineCommentAction = {
  localId: number;
  blogId: number;
  content: string;
  createdAt: string;
};

const OFFLINE_LIKES_KEY = "offline_blog_likes";
const OFFLINE_COMMENTS_KEY = "offline_blog_comments";
const BLOG_CACHE_KEY = "cached_blogs";
const PAGE_SIZE = 10;
const MAX_CACHED_BLOGS = 30;

function formatDate(value?: string) {
  if (!value) return "no date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "no date";
  }
}

function formatSubject(value?: string) {
  if (!value) return "No subject";
  return value.split("_").join(" ");
}

async function getOfflineLikes(): Promise<OfflineLikeAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveOfflineLike(action: OfflineLikeAction) {
  const current = await getOfflineLikes();
  const filtered = current.filter((x) => x.blogId !== action.blogId);

  await AsyncStorage.setItem(
    OFFLINE_LIKES_KEY,
    JSON.stringify([...filtered, action])
  );
}

async function removeOfflineLike(blogId: number) {
  const current = await getOfflineLikes();
  const filtered = current.filter((x) => x.blogId !== blogId);

  await AsyncStorage.setItem(OFFLINE_LIKES_KEY, JSON.stringify(filtered));
}

async function getOfflineComments(): Promise<OfflineCommentAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveOfflineComment(action: OfflineCommentAction) {
  const current = await getOfflineComments();

  await AsyncStorage.setItem(
    OFFLINE_COMMENTS_KEY,
    JSON.stringify([...current, action])
  );
}

async function removeOfflineComment(localId: number) {
  const current = await getOfflineComments();
  const filtered = current.filter((x) => x.localId !== localId);

  await AsyncStorage.setItem(OFFLINE_COMMENTS_KEY, JSON.stringify(filtered));
}
async function getCachedBlogs(): Promise<BlogDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOG_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveCachedBlogs(blogs: BlogDTO[]) {
  try {
    const sliced = blogs.slice(0, MAX_CACHED_BLOGS);
    await AsyncStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(sliced));
  } catch (e) {
    console.log("SAVE BLOG CACHE ERROR:", e);
  }
}

async function apiRequest(path: string, options?: RequestInit) {
  const token = await getToken();

  console.log("API REQUEST:", `${API_BASE_URL}${path}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  const text = await res.text();

  console.log("STATUS:", res.status);
  console.log("RAW RESPONSE:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  if (!data?.success) {
    throw new Error(data?.message || "Request failed");
  }

  return data.data;
}

export default function BlogScreen() {
  useScreenTracking("BlogScreen");

  const { theme, fs } = useTheme();
  const styles = makeStyles(theme, fs);

  const [blogs, setBlogs] = useState<BlogDTO[]>([]);
  const [comments, setComments] = useState<CommentDTO[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [selectedBlog, setSelectedBlog] = useState<BlogDTO | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);

  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadCachedBlogsToScreen = async () => {
    const cached = await getCachedBlogs();

    if (cached.length > 0) {
      setBlogs(cached);
    }
  };

  const syncOfflineLikes = async () => {
    const actions = await getOfflineLikes();

    if (actions.length === 0) return;

    console.log("SYNC OFFLINE LIKES:", actions);

    for (const action of actions) {
      try {
        if (action.liked) {
          await apiRequest(`/blog/like/${action.blogId}`, { method: "POST" });
        } else {
          await apiRequest(`/blog/dislike/${action.blogId}`, {
            method: "DELETE",
          });
        }

        await removeOfflineLike(action.blogId);
      } catch (e) {
        console.log("CANNOT SYNC LIKE YET:", e);
        break;
      }
    }
  };

  const syncOfflineComments = async () => {
  const token = await getToken();

  if (!token) return;

  const actions = await getOfflineComments();

  if (actions.length === 0) return;

  console.log("SYNC OFFLINE COMMENTS:", actions);

  for (const action of actions) {
    try {
    await apiRequest(
  `/blog/comment/${action.blogId}?content=${encodeURIComponent(
    action.content
  )}&createdAt=${encodeURIComponent(action.createdAt)}`,
  { method: "POST" }
);

      await removeOfflineComment(action.localId);
    } catch (e) {
      console.log("CANNOT SYNC COMMENT YET:", e);
      break;
    }
  }
};

  const loadSubjects = async () => {
    try {
      const data: Subject[] = await apiRequest("/user/subjects", {
        method: "GET",
      });

      const loadedSubjects = data ?? [];

      setSubjects(loadedSubjects);

      if (loadedSubjects.length > 0) {
        setSubject((prev) => prev ?? loadedSubjects[0]);
      } else {
        setSubject(null);
      }
    } catch (e: any) {
      console.log("LOAD SUBJECTS ERROR:", e);
      setSubjects([]);
      setSubject(null);
    }
  };

  const loadBlogs = async (pageToLoad = 0, append = false) => {
    try {
      if (append) {
        if (loadingMore || lastPage) return;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      await syncOfflineLikes();
      await syncOfflineComments();

      const data: PageResponse<BlogDTO> = await apiRequest(
        `/blog/all?page=${pageToLoad}&size=${PAGE_SIZE}`,
        { method: "GET" }
      );

      const newBlogs = data?.content ?? [];

      setBlogs((prev) => {
        let nextBlogs: BlogDTO[];

        if (!append) {
          nextBlogs = newBlogs;
        } else {
          const existingIds = new Set(prev.map((x) => x.id));
          const filtered = newBlogs.filter((x) => !existingIds.has(x.id));
          nextBlogs = [...prev, ...filtered];
        }

        saveCachedBlogs(nextBlogs);
        return nextBlogs;
      });

      setPage(data?.number ?? pageToLoad);
      setLastPage(Boolean(data?.last));
    } catch (e: any) {
      console.log("LOAD BLOGS ERROR:", e);

      if (!append) {
        const cached = await getCachedBlogs();

        if (cached.length > 0) {
          setBlogs(cached);
          setLastPage(true);

          Alert.alert(
            "Offline mode",
            "Showing cached blogs because server is unavailable"
          );
        } else {
          Alert.alert("Error", e?.message ?? "Cannot load blogs");
        }
      } else {
        Alert.alert("Offline mode", "Cannot load more blogs while offline");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const refreshBlogs = async () => {
    setPage(0);
    setLastPage(false);
    await loadBlogs(0, false);
  };

  const loadNextPage = async () => {
    if (loading || loadingMore || lastPage) return;
    await loadBlogs(page + 1, true);
  };

  useFocusEffect(
    useCallback(() => {
      loadCachedBlogsToScreen();
      loadSubjects();
      setPage(0);
      setLastPage(false);
      loadBlogs(0, false);
    }, [])
  );

  const createBlog = async () => {
    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!content.trim()) throw new Error("Content is required");
      if (!subject) throw new Error("Subject is required");

      await apiRequest("/blog/create", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          subject,
        }),
      });

      setCreateOpen(false);
      setTitle("");
      setContent("");

      if (subjects.length > 0) {
        setSubject(subjects[0]);
      } else {
        setSubject(null);
      }

      await refreshBlogs();
    } catch (e: any) {
      console.log("CREATE BLOG ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot create blog");
    }
  };

  const toggleLike = async (blog: BlogDTO) => {
    const nextLiked = !blog.likedByMe;

    let updatedBlogs: BlogDTO[] = [];

    setBlogs((prev) => {
      updatedBlogs = prev.map((b) =>
        b.id === blog.id
          ? {
              ...b,
              likedByMe: nextLiked,
              likesCount: nextLiked
                ? (b.likesCount ?? 0) + 1
                : Math.max((b.likesCount ?? 1) - 1, 0),
            }
          : b
      );

      saveCachedBlogs(updatedBlogs);
      return updatedBlogs;
    });

    try {
      if (nextLiked) {
        await apiRequest(`/blog/like/${blog.id}`, { method: "POST" });
      } else {
        await apiRequest(`/blog/dislike/${blog.id}`, { method: "DELETE" });
      }

      await removeOfflineLike(blog.id);
    } catch (e) {
      console.log("LIKE SAVED OFFLINE:", e);

      await saveOfflineLike({
        blogId: blog.id,
        liked: nextLiked,
      });
    }
  };

  const openComments = async (blog: BlogDTO) => {
    try {
      setSelectedBlog(blog);
      setCommentsOpen(true);

      const data = await apiRequest(`/blog/comments/${blog.id}`, {
        method: "GET",
      });

      setComments(data ?? []);
    } catch (e: any) {
      console.log("LOAD COMMENTS ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot load comments");
    }
  };


const addComment = async () => {
  try {
    if (!selectedBlog) return;
    if (!commentText.trim()) throw new Error("Comment cannot be empty");

    const token = await getToken();

    if (!token) {
      Alert.alert("Login required", "Please log in first.");
      return;
    }

    const text = commentText.trim();
    const localId = -Date.now();
    const createdAt = new Date().toISOString();

    setCommentText("");

    setComments((prev) => [
      ...prev,
      {
        id: localId,
        username: "You",
        content: text,
        createdAt,
      },
    ]);

    setBlogs((prev) => {
      const updated = prev.map((b) =>
        b.id === selectedBlog.id
          ? { ...b, commentsCount: (b.commentsCount ?? 0) + 1 }
          : b
      );

      saveCachedBlogs(updated);
      return updated;
    });

    try {
      await apiRequest(
        `/blog/comment/${selectedBlog.id}?content=${encodeURIComponent(
          text
        )}&createdAt=${encodeURIComponent(createdAt)}`,
        { method: "POST" }
      );

      const data = await apiRequest(`/blog/comments/${selectedBlog.id}`, {
        method: "GET",
      });

      setComments(data ?? []);
    } catch (e) {
      console.log("COMMENT SAVED OFFLINE:", e);

      await saveOfflineComment({
        localId,
        blogId: selectedBlog.id,
        content: text,
        createdAt,
      });
    }
  } catch (e: any) {
    console.log("ADD COMMENT ERROR:", e);
    Alert.alert("Error", e?.message ?? "Cannot add comment");
  }
};

  const deleteComment = async (id: number) => {
    try {
      await apiRequest(`/blog/comments/${id}`, {
        method: "DELETE",
      });

      if (selectedBlog) {
        const data = await apiRequest(`/blog/comments/${selectedBlog.id}`, {
          method: "GET",
        });

        setComments(data ?? []);

        setBlogs((prev) => {
          const updated = prev.map((b) =>
            b.id === selectedBlog.id
              ? {
                  ...b,
                  commentsCount: Math.max((b.commentsCount ?? 1) - 1, 0),
                }
              : b
          );

          saveCachedBlogs(updated);
          return updated;
        });
      }
    } catch (e: any) {
      console.log("DELETE COMMENT ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot delete comment");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Study Blogs</ThemedText>
          <ThemedText style={styles.subtitle}>
            Share ideas, notes and updates with your group
          </ThemedText>
        </View>

        <Pressable style={styles.plusBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.topPanel}>
        <Pressable style={styles.refreshBtn} onPress={refreshBlogs}>
          <Ionicons name="refresh-outline" size={18} color="#34207E" />
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </Pressable>

        <View style={styles.countPill}>
          <Ionicons name="newspaper-outline" size={16} color="#34207E" />
          <ThemedText style={styles.countText}>{blogs.length} loaded</ThemedText>
        </View>
      </View>

      <FlatList
        data={blogs}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refreshBlogs}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator />
              <ThemedText style={styles.footerText}>Loading more...</ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="newspaper-outline" size={38} color="#7B708F" />
              </View>
              <ThemedText style={styles.emptyTitle}>No blogs yet</ThemedText>
              <ThemedText style={styles.emptyText}>Create the first post</ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {(item.authorUsername?.[0] ?? "?").toUpperCase()}
                </ThemedText>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.blogTitle}>{item.title}</ThemedText>

                <ThemedText style={styles.meta}>
                  @{item.authorUsername ?? "unknown"} · {formatDate(item.createdAt)}
                </ThemedText>

                {!!item.subject && (
                  <View style={styles.subjectPill}>
                    <ThemedText style={styles.subjectText}>
                      {formatSubject(item.subject)}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <ThemedText style={styles.blogContent}>{item.content}</ThemedText>

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <ThemedText style={styles.statText}>❤️ {item.likesCount ?? 0}</ThemedText>
              </View>

              <View style={styles.statPill}>
                <ThemedText style={styles.statText}>💬 {item.commentsCount ?? 0}</ThemedText>
              </View>
            </View>

            <View style={styles.actionGrid}>
              <Pressable
                style={[styles.actionBtn, item.likedByMe && styles.likedBtn]}
                onPress={() => toggleLike(item)}
              >
                <Ionicons
                  name={item.likedByMe ? "heart" : "heart-outline"}
                  size={18}
                  color={item.likedByMe ? "#fff" : "#34207E"}
                />

                <ThemedText
                  style={[
                    styles.actionText,
                    item.likedByMe && styles.actionTextWhite,
                  ]}
                >
                  {item.likedByMe ? "Liked" : "Like"}
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.actionBtn}
                onPress={() => openComments(item)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#34207E" />
                <ThemedText style={styles.actionText}>Comments</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create blog</ThemedText>

              <Pressable
                style={styles.closeCircle}
                onPress={() => {
                  setCreateOpen(false);
                  setTitle("");
                  setContent("");
                }}
              >
                <Ionicons name="close" size={20} color="#34207E" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#8D83A3"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.bigInput]}
              placeholder="Content"
              placeholderTextColor="#8D83A3"
              value={content}
              onChangeText={setContent}
              multiline
            />

            <View style={styles.subjectBox}>
              <ThemedText style={styles.subjectLabel}>Subject</ThemedText>

              {subjects.length === 0 ? (
                <ThemedText style={styles.emptyText}>No subjects available</ThemedText>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subjectScroll}
                >
                  {subjects.map((s) => (
                    <Pressable
                      key={s}
                      style={[
                        styles.subjectChoice,
                        subject === s && styles.subjectChoiceActive,
                      ]}
                      onPress={() => setSubject(s)}
                    >
                      <ThemedText
                        style={[
                          styles.subjectChoiceText,
                          subject === s && styles.subjectChoiceTextActive,
                        ]}
                      >
                        {formatSubject(s)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setCreateOpen(false);
                  setTitle("");
                  setContent("");
                }}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.saveBtn, !subject && styles.disabledBtn]}
                onPress={createBlog}
                disabled={!subject}
              >
                <ThemedText style={styles.saveText}>Create</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={commentsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.commentsModal]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>Comments</ThemedText>
                <ThemedText style={styles.modalSubtitle}>
                  {selectedBlog?.title ?? ""}
                </ThemedText>
              </View>

              <Pressable
                style={styles.closeCircle}
                onPress={() => {
                  setCommentsOpen(false);
                  setSelectedBlog(null);
                  setComments([]);
                  setCommentText("");
                }}
              >
                <Ionicons name="close" size={20} color="#34207E" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {comments.length === 0 ? (
                <View style={styles.noCommentsBox}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={32}
                    color="#7B708F"
                  />
                  <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentCard}>
                    <View style={styles.commentAvatar}>
                      <ThemedText style={styles.commentAvatarText}>
                        {(c.username?.[0] ?? "?").toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                     <ThemedText style={styles.commentUser}>@{c.username}</ThemedText>

                    {!!c.createdAt && (
                    <ThemedText style={styles.commentDate}>
                     {formatDate(c.createdAt)}
                    </ThemedText>
                    )}
                    <ThemedText style={styles.commentText}>{c.content}</ThemedText>
                    </View>

                    <Pressable
                      style={styles.commentDeleteBtn}
                      onPress={() =>{
                        if(c.id <0){
                          Alert.alert("Offline comment", "this comment will be sent when u aare online");
                          return;
                        }
                        deleteComment(c.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#E5484D" />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Write comment..."
              placeholderTextColor="#8D83A3"
              value={commentText}
              onChangeText={setCommentText}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setCommentsOpen(false);
                  setSelectedBlog(null);
                  setComments([]);
                  setCommentText("");
                }}
              >
                <ThemedText style={styles.cancelText}>Close</ThemedText>
              </Pressable>

              <Pressable style={styles.saveBtn} onPress={addComment}>
                <ThemedText style={styles.saveText}>Send</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </ThemedView>
  );
}

function makeStyles(
  theme: import("@/constants/theme").AppTheme,
  fs: (n: number) => number
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.inputBackground,
    },

    header: {
      paddingTop: 58,
      paddingHorizontal: 18,
      paddingBottom: 20,
      backgroundColor: theme.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    commentDate: {
      fontSize: fs(11),
      color: theme.secondaryText,
      marginBottom: 3,
    },
    title: {
      fontSize: fs(30),
      fontWeight: "900",
      color: theme.card,
    },

    subtitle: {
      marginTop: 5,
      fontSize: fs(14),
      color: "#DCD5FF",
      lineHeight: 20,
    },

    plusBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#ffffff26",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#ffffff38",
    },

    topPanel: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    refreshBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.card,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
    },

    refreshText: {
      fontSize: fs(14),
      fontWeight: "800",
      color: theme.primary,
    },

    countPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 999,
    },

    countText: {
      fontSize: fs(14),
      fontWeight: "800",
      color: theme.primary,
    },

    list: {
      padding: 16,
      paddingBottom: 105,
    },

    card: {
      backgroundColor: theme.card,
      borderRadius: 26,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 5,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#DCD2FF",
    },

    avatarText: {
      fontSize: fs(18),
      fontWeight: "900",
      color: theme.primary,
    },

    blogTitle: {
      fontSize: fs(20),
      fontWeight: "900",
      color: theme.text,
    },

    meta: {
      marginTop: 4,
      fontSize: fs(12),
      color: theme.secondaryText,
    },

    subjectPill: {
      alignSelf: "flex-start",
      marginTop: 7,
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },

    subjectText: {
      fontSize: fs(11),
      fontWeight: "900",
      color: theme.primary,
    },

    blogContent: {
      fontSize: fs(15),
      lineHeight: 23,
      color: theme.text,
      marginBottom: 14,
    },

    statsRow: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 14,
    },

    statPill: {
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },

    statText: {
      fontSize: fs(13),
      fontWeight: "800",
      color: "#5D4E83",
    },

    actionGrid: {
      flexDirection: "row",
      gap: 10,
    },

    actionBtn: {
      flex: 1,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },

    likedBtn: {
      backgroundColor: theme.primary,
    },

    actionText: {
      fontSize: fs(14),
      fontWeight: "900",
      color: theme.primary,
    },

    actionTextWhite: {
      color: theme.card,
    },

    emptyBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 70,
    },

    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: fs(19),
      fontWeight: "900",
      color: theme.text,
    },

    emptyText: {
      marginTop: 5,
      fontSize: fs(14),
      color: theme.secondaryText,
    },

    footerLoader: {
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    footerText: {
      fontSize: fs(13),
      fontWeight: "800",
      color: theme.secondaryText,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(20, 12, 44, 0.48)",
      justifyContent: "center",
      paddingHorizontal: 16,
    },

    modalCard: {
      backgroundColor: theme.card,
      borderRadius: 28,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
    },

    commentsModal: {
      maxHeight: "84%",
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },

    modalTitle: {
      fontSize: fs(22),
      fontWeight: "900",
      color: theme.text,
      flex: 1,
    },

    modalSubtitle: {
      marginTop: 3,
      color: theme.secondaryText,
      fontSize: fs(13),
    },

    closeCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    input: {
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      fontSize: fs(15),
      marginBottom: 12,
    },

    bigInput: {
      minHeight: 130,
      textAlignVertical: "top",
    },

    subjectBox: {
      marginBottom: 12,
    },

    subjectLabel: {
      fontSize: fs(14),
      fontWeight: "900",
      color: theme.text,
      marginBottom: 8,
    },

    subjectScroll: {
      gap: 8,
      paddingRight: 8,
    },

    subjectChoice: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },

    subjectChoiceActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },

    subjectChoiceText: {
      fontSize: fs(12),
      fontWeight: "900",
      color: theme.primary,
    },

    subjectChoiceTextActive: {
      color: theme.card,
    },

    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 4,
    },

    cancelBtn: {
      paddingHorizontal: 18,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    cancelText: {
      fontSize: fs(14),
      fontWeight: "900",
      color: theme.primary,
    },

    saveBtn: {
      paddingHorizontal: 20,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    saveText: {
      fontSize: fs(14),
      fontWeight: "900",
      color: theme.card,
    },

    disabledBtn: {
      opacity: 0.5,
    },

    commentsList: {
      maxHeight: 340,
      marginBottom: 10,
    },

    noCommentsBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 26,
    },

    commentCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    commentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },

    commentAvatarText: {
      fontSize: fs(13),
      fontWeight: "900",
      color: theme.primary,
    },

    commentUser: {
      fontSize: fs(13),
      fontWeight: "900",
      color: theme.text,
      marginBottom: 3,
    },

    commentText: {
      fontSize: fs(14),
      color: theme.text,
      lineHeight: 20,
    },

    commentDeleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: theme.danger + "18",
      alignItems: "center",
      justifyContent: "center",
    },
  });
}