import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
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

type BlogDTO = {
  id: number;
  title: string;
  content: string;
  authorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string | null;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
};

type CommentDTO = {
  id: number;
  username: string;
  content: string;
};

type OfflineLikeAction = {
  blogId: number;
  liked: boolean;
};

const OFFLINE_LIKES_KEY = "offline_blog_likes";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatDate(value?: string) {
  if (!value) return "no date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "no date";
  }
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

async function apiRequest(path: string, options?: RequestInit) {
  const token = await getToken();

  console.log("API REQUEST:", `${API_BASE_URL}${path}`);
  console.log("TOKEN:", token);

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
    console.log("PARSED JSON:", JSON.stringify(data, null, 2));
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
  const [blogs, setBlogs] = useState<BlogDTO[]>([]);
  const [comments, setComments] = useState<CommentDTO[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [selectedBlog, setSelectedBlog] = useState<BlogDTO | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogDTO | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commentText, setCommentText] = useState("");

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

  const loadBlogs = async () => {
    try {
      console.log("LOAD BLOGS");

      await syncOfflineLikes();

      const data = await apiRequest("/blog/all", { method: "GET" });
      setBlogs(data ?? []);
    } catch (e: any) {
      console.log("LOAD BLOGS ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot load blogs");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBlogs();
    }, [])
  );

  const createBlog = async () => {
    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!content.trim()) throw new Error("Content is required");

      await apiRequest("/blog/create", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          clientId: uid(),
        }),
      });

      setCreateOpen(false);
      setTitle("");
      setContent("");
      await loadBlogs();
    } catch (e: any) {
      console.log("CREATE BLOG ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot create blog");
    }
  };

  const updateBlog = async () => {
    try {
      if (!editingBlog) return;
      if (!title.trim()) throw new Error("Title is required");
      if (!content.trim()) throw new Error("Content is required");

      await apiRequest("/blog/update", {
        method: "PUT",
        body: JSON.stringify({
          id: editingBlog.id,
          title: title.trim(),
          content: content.trim(),
          updatedAt: editingBlog.updatedAt,
          clientId: editingBlog.clientId ?? null,
        }),
      });

      setEditOpen(false);
      setEditingBlog(null);
      setTitle("");
      setContent("");
      await loadBlogs();
    } catch (e: any) {
      console.log("UPDATE BLOG ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot update blog");
    }
  };

  const deleteBlog = async (id: number) => {
    Alert.alert("Delete", "Delete this blog?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest("/blog/delete", {
              method: "DELETE",
              body: JSON.stringify({ id }),
            });

            await loadBlogs();
          } catch (e: any) {
            console.log("DELETE BLOG ERROR:", e);
            Alert.alert("Error", e?.message ?? "Cannot delete blog");
          }
        },
      },
    ]);
  };

  const toggleLike = async (blog: BlogDTO) => {
    const nextLiked = !blog.likedByMe;

    setBlogs((prev) =>
      prev.map((b) =>
        b.id === blog.id
          ? {
              ...b,
              likedByMe: nextLiked,
              likesCount: nextLiked
                ? (b.likesCount ?? 0) + 1
                : Math.max((b.likesCount ?? 1) - 1, 0),
            }
          : b
      )
    );

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

      await apiRequest(
        `/blog/comment/${selectedBlog.id}?content=${encodeURIComponent(
          commentText.trim()
        )}`,
        { method: "POST" }
      );

      setCommentText("");

      const data = await apiRequest(`/blog/comments/${selectedBlog.id}`, {
        method: "GET",
      });

      setComments(data ?? []);
      await loadBlogs();
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
      }

      await loadBlogs();
    } catch (e: any) {
      console.log("DELETE COMMENT ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot delete comment");
    }
  };

  const openEdit = (blog: BlogDTO) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setContent(blog.content);
    setEditOpen(true);
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
        <Pressable style={styles.refreshBtn} onPress={loadBlogs}>
          <Ionicons name="refresh-outline" size={18} color="#34207E" />
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </Pressable>

        <View style={styles.countPill}>
          <Ionicons name="newspaper-outline" size={16} color="#34207E" />
          <ThemedText style={styles.countText}>{blogs.length} posts</ThemedText>
        </View>
      </View>

      <FlatList
        data={blogs}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="newspaper-outline" size={38} color="#7B708F" />
            </View>
            <ThemedText style={styles.emptyTitle}>No blogs yet</ThemedText>
            <ThemedText style={styles.emptyText}>Create the first post</ThemedText>
          </View>
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

              <Pressable style={styles.actionBtn} onPress={() => openComments(item)}>
                <Ionicons name="chatbubble-outline" size={18} color="#34207E" />
                <ThemedText style={styles.actionText}>Comments</ThemedText>
              </Pressable>
            </View>

            <View style={styles.ownerActions}>
              <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={18} color="#34207E" />
                <ThemedText style={styles.ownerText}>Edit</ThemedText>
              </Pressable>

              <Pressable style={styles.trashBtn} onPress={() => deleteBlog(item.id)}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <ThemedText style={styles.trashText}>Delete</ThemedText>
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

              <Pressable style={styles.saveBtn} onPress={createBlog}>
                <ThemedText style={styles.saveText}>Create</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit blog</ThemedText>
              <Pressable
                style={styles.closeCircle}
                onPress={() => {
                  setEditOpen(false);
                  setEditingBlog(null);
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

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setEditOpen(false);
                  setEditingBlog(null);
                  setTitle("");
                  setContent("");
                }}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable style={styles.saveBtn} onPress={updateBlog}>
                <ThemedText style={styles.saveText}>Update</ThemedText>
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
                      <ThemedText style={styles.commentText}>{c.content}</ThemedText>
                    </View>

                    <Pressable
                      style={styles.commentDeleteBtn}
                      onPress={() => deleteComment(c.id)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F3FF",
  },

  header: {
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 20,
    backgroundColor: "#34207E",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
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
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7E0FF",
  },

  refreshText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#34207E",
  },

  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#EEE8FF",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },

  countText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#34207E",
  },

  list: {
    padding: 16,
    paddingBottom: 105,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E7E0FF",
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
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCD2FF",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#34207E",
  },

  blogTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#181126",
  },

  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#7B708F",
  },

  blogContent: {
    fontSize: 15,
    lineHeight: 23,
    color: "#2D2738",
    marginBottom: 14,
  },

  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },

  statPill: {
    backgroundColor: "#F2EEFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  statText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5D4E83",
  },

  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#F2EEFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  likedBtn: {
    backgroundColor: "#34207E",
  },

  actionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#34207E",
  },

  actionTextWhite: {
    color: "#fff",
  },

  ownerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  iconBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F2EEFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  ownerText: {
    color: "#34207E",
    fontWeight: "800",
    fontSize: 13,
  },

  trashBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#E5484D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  trashText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
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
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#181126",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 14,
    color: "#7B708F",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 12, 44, 0.48)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E0FF",
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
    fontSize: 22,
    fontWeight: "900",
    color: "#181126",
  },

  modalSubtitle: {
    marginTop: 3,
    color: "#7B708F",
    fontSize: 13,
  },

  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2EEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: "#F6F3FF",
    borderWidth: 1,
    borderColor: "#E7E0FF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#181126",
    fontSize: 15,
    marginBottom: 12,
  },

  bigInput: {
    minHeight: 130,
    textAlignVertical: "top",
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
    backgroundColor: "#F2EEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#34207E",
  },

  saveBtn: {
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#34207E",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
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
    borderBottomColor: "#EEE8FF",
  },

  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
  },

  commentAvatarText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#34207E",
  },

  commentUser: {
    fontSize: 13,
    fontWeight: "900",
    color: "#181126",
    marginBottom: 3,
  },

  commentText: {
    fontSize: 14,
    color: "#2D2738",
    lineHeight: 20,
  },

  commentDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
});