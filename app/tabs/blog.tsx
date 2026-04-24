import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BlogDTO,
  CommentDTO,
  addComment,
  createBlog,
  deleteBlog,
  deleteComment,
  dislikeBlog,
  editComment,
  getAllBlogs,
  getComments,
  likeBlog,
  updateBlog,
} from "@/constants/blog-api";
import { getToken } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function BlogScreen() {
  const [blogs, setBlogs] = useState<BlogDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editingBlog, setEditingBlog] = useState<BlogDTO | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogDTO | null>(null);

  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const sortedBlogs = useMemo(() => {
    return [...blogs].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [blogs]);

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllBlogs();

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to load blogs");
        return;
      }

      setBlogs(result.data ?? []);
    } catch (e) {
      console.log("LOAD BLOGS ERROR", e);
      Alert.alert("Error", "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const result = await getAllBlogs();

      if (result.success) {
        setBlogs(result.data ?? []);
      }
    } catch (e) {
      console.log("REFRESH BLOGS ERROR", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const token = await getToken();
      if (!token) return;
      await loadBlogs();
    }

    init();
  }, [loadBlogs]);

  async function handleCreateBlog() {
    const t = title.trim();
    const c = content.trim();

    if (!t) {
      Alert.alert("Error", "Title is required");
      return;
    }

    if (!c) {
      Alert.alert("Error", "Content is required");
      return;
    }

    try {
      const result = await createBlog({
        title: t,
        content: c,
        clientId: uid(),
      });

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to create blog");
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setContent("");
      await loadBlogs();
    } catch (e) {
      console.log("CREATE BLOG ERROR", e);
      Alert.alert("Error", "Failed to create blog");
    }
  }

  function openEdit(blog: BlogDTO) {
    setEditingBlog(blog);
    setTitle(blog.title || "");
    setContent(blog.content || "");
    setEditOpen(true);
  }

  async function handleUpdateBlog() {
    if (!editingBlog?.id) return;

    const t = title.trim();
    const c = content.trim();

    if (!t) {
      Alert.alert("Error", "Title is required");
      return;
    }

    if (!c) {
      Alert.alert("Error", "Content is required");
      return;
    }

    try {
      const result = await updateBlog({
        id: editingBlog.id,
        title: t,
        content: c,
        updatedAt: editingBlog.updatedAt,
        clientId: editingBlog.clientId || null,
      });

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to update blog");
        return;
      }

      setEditOpen(false);
      setEditingBlog(null);
      setTitle("");
      setContent("");
      await loadBlogs();
    } catch (e) {
      console.log("UPDATE BLOG ERROR", e);
      Alert.alert("Error", "Failed to update blog");
    }
  }

  async function handleDeleteBlog(blogId?: number) {
    if (!blogId) return;

    Alert.alert("Delete", "Are you sure you want to delete this blog?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await deleteBlog(blogId);

            if (!result.success) {
              Alert.alert("Error", result.message || "Failed to delete blog");
              return;
            }

            await loadBlogs();
          } catch (e) {
            console.log("DELETE BLOG ERROR", e);
            Alert.alert("Error", "Failed to delete blog");
          }
        },
      },
    ]);
  }

  async function handleLike(blogId?: number) {
    if (!blogId) return;

    try {
      const result = await likeBlog(blogId);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to like blog");
        return;
      }

      await loadBlogs();
    } catch (e) {
      console.log("LIKE BLOG ERROR", e);
      Alert.alert("Error", "Failed to like blog");
    }
  }

  async function handleDislike(blogId?: number) {
    if (!blogId) return;

    try {
      const result = await dislikeBlog(blogId);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to dislike blog");
        return;
      }

      await loadBlogs();
    } catch (e) {
      console.log("DISLIKE BLOG ERROR", e);
      Alert.alert("Error", "Failed to dislike blog");
    }
  }

  async function openComments(blog: BlogDTO) {
    if (!blog.id) return;

    try {
      setSelectedBlog(blog);
      setCommentsOpen(true);
      setCommentsLoading(true);

      const result = await getComments(blog.id);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to load comments");
        setComments([]);
        return;
      }

      setComments(result.data ?? []);
    } catch (e) {
      console.log("LOAD COMMENTS ERROR", e);
      Alert.alert("Error", "Failed to load comments");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleAddComment() {
    if (!selectedBlog?.id) return;

    const c = commentText.trim();

    if (!c) {
      Alert.alert("Error", "Comment cannot be empty");
      return;
    }

    try {
      const result = await addComment(selectedBlog.id, c);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to add comment");
        return;
      }

      setCommentText("");

      const commentsResult = await getComments(selectedBlog.id);
      if (commentsResult.success) {
        setComments(commentsResult.data ?? []);
      }

      await loadBlogs();
    } catch (e) {
      console.log("ADD COMMENT ERROR", e);
      Alert.alert("Error", "Failed to add comment");
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      const result = await deleteComment(commentId);

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to delete comment");
        return;
      }

      if (selectedBlog?.id) {
        const commentsResult = await getComments(selectedBlog.id);
        if (commentsResult.success) {
          setComments(commentsResult.data ?? []);
        }
      }

      await loadBlogs();
    } catch (e) {
      console.log("DELETE COMMENT ERROR", e);
      Alert.alert("Error", "Failed to delete comment");
    }
  }

  async function handleEditComment(comment: CommentDTO) {
    Alert.prompt?.(
      "Edit comment",
      "Update your comment",
      async (value) => {
        const next = value?.trim();
        if (!next) return;

        try {
          const result = await editComment(comment.id, next);

          if (!result.success) {
            Alert.alert("Error", result.message || "Failed to edit comment");
            return;
          }

          if (selectedBlog?.id) {
            const commentsResult = await getComments(selectedBlog.id);
            if (commentsResult.success) {
              setComments(commentsResult.data ?? []);
            }
          }
        } catch (e) {
          console.log("EDIT COMMENT ERROR", e);
          Alert.alert("Error", "Failed to edit comment");
        }
      },
      "plain-text",
      comment.content
    );

    if (Platform.OS !== "ios") {
      Alert.alert(
        "Edit comment",
        "For Android зроби окрему modal/form, бо Alert.prompt працює нормально тільки на iOS."
      );
    }
  }

  const renderBlog = ({ item }: { item: BlogDTO }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.blogTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.blogMeta}>
              by {item.authorUsername || "unknown"} ·{" "}
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : "no date"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.blogContent}>{item.content}</ThemedText>

        <View style={styles.statsRow}>
          <ThemedText style={styles.statText}>
            Likes: {item.likesCount ?? 0}
          </ThemedText>
          <ThemedText style={styles.statText}>
            Comments: {item.commentsCount ?? 0}
          </ThemedText>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={() => handleLike(item.id)} style={styles.actionBtn}>
            <Ionicons name="heart-outline" size={18} color="#111" />
            <ThemedText style={styles.actionText}>Like</ThemedText>
          </Pressable>

          <Pressable onPress={() => handleDislike(item.id)} style={styles.actionBtn}>
            <Ionicons name="heart-dislike-outline" size={18} color="#111" />
            <ThemedText style={styles.actionText}>Dislike</ThemedText>
          </Pressable>

          <Pressable onPress={() => openComments(item)} style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#111" />
            <ThemedText style={styles.actionText}>Comments</ThemedText>
          </Pressable>
        </View>

        <View style={styles.ownerRow}>
          <Pressable onPress={() => openEdit(item)} style={styles.smallBtn}>
            <Ionicons name="create-outline" size={18} color="#111" />
          </Pressable>

          <Pressable onPress={() => handleDeleteBlog(item.id)} style={styles.smallBtnDanger}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Blogs</ThemedText>
          <ThemedText style={styles.subtitle}>
            Create, update, delete, like and comment
          </ThemedText>
        </View>

        <Pressable onPress={() => setCreateOpen(true)} style={styles.plusBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={sortedBlogs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBlog}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Create blog</ThemedText>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor="#888"
              style={styles.input}
            />

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Content"
              placeholderTextColor="#888"
              style={[styles.input, styles.bigInput]}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setCreateOpen(false);
                  setTitle("");
                  setContent("");
                }}
                style={styles.cancelBtn}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable onPress={handleCreateBlog} style={styles.saveBtn}>
                <ThemedText style={styles.saveText}>Create</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Edit blog</ThemedText>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor="#888"
              style={styles.input}
            />

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Content"
              placeholderTextColor="#888"
              style={[styles.input, styles.bigInput]}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setEditOpen(false);
                  setEditingBlog(null);
                  setTitle("");
                  setContent("");
                }}
                style={styles.cancelBtn}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable onPress={handleUpdateBlog} style={styles.saveBtn}>
                <ThemedText style={styles.saveText}>Update</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={commentsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "82%" }]}>
            <ThemedText style={styles.modalTitle}>
              Comments {selectedBlog ? `for "${selectedBlog.title}"` : ""}
            </ThemedText>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {commentsLoading ? (
                <ThemedText style={styles.emptyText}>Loading comments...</ThemedText>
              ) : comments.length === 0 ? (
                <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
              ) : (
                comments.map((item) => (
                  <View key={item.id} style={styles.commentCard}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.commentUser}>{item.username}</ThemedText>
                      <ThemedText style={styles.commentText}>{item.content}</ThemedText>
                    </View>

                    <View style={styles.commentActions}>
                      <Pressable
                        onPress={() => handleEditComment(item)}
                        style={styles.commentActionBtn}
                      >
                        <Ionicons name="create-outline" size={16} color="#111" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteComment(item.id)}
                        style={styles.commentActionBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#111" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write comment..."
              placeholderTextColor="#888"
              style={[styles.input, { marginTop: 12 }]}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setCommentsOpen(false);
                  setSelectedBlog(null);
                  setComments([]);
                  setCommentText("");
                }}
                style={styles.cancelBtn}
              >
                <ThemedText style={styles.cancelText}>Close</ThemedText>
              </Pressable>

              <Pressable onPress={handleAddComment} style={styles.saveBtn}>
                <ThemedText style={styles.saveText}>Send</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },

  plusBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#34207E",
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    padding: 14,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ececec",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  blogTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  blogMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },

  blogContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },

  statText: {
    fontSize: 13,
    color: "#555",
  },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 12,
  },

  actionText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },

  ownerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },

  smallBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ededed",
    alignItems: "center",
    justifyContent: "center",
  },

  smallBtnDanger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#d11a2a",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },

  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
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
    marginTop: 6,
  },

  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ededed",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#34207E",
  },

  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  emptyText: {
    fontSize: 14,
    color: "#666",
    paddingVertical: 12,
  },

  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },

  commentUser: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  commentText: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },

  commentActions: {
    flexDirection: "row",
    gap: 6,
  },

  commentActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
});