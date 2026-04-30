import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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
type UserRole = "STUDENT" | "TEACHER" | string;

type UserDTO = {
  id: number;
  email?: string;
  username: string;
  status?: string;
  enabled?: boolean;
  createdAt?: string;
  role?: UserRole;
};

type StudentProfileDTO = {
  school: string;
  faculty: string;
  subjects: Subject[];
};

type BlogDTO = {
  id: number;
  title: string;
  content: string;
  subject?: Subject;
  authorId?: number;
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

const PAGE_SIZE = 10;

function joinUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  return `${base}${path}`;
}

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

async function apiRequest(path: string, options?: RequestInit) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  const text = await res.text();

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

export default function HomeScreen() {
  useScreenTracking("HomeScreen");

  const { theme, fs } = useTheme();
  const styles = makeStyles(theme, fs);

  const [me, setMe] = useState<UserDTO | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile, setProfile] = useState<StudentProfileDTO | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [school, setSchool] = useState("");
  const [faculty, setFaculty] = useState("");
  const [profileSubjects, setProfileSubjects] = useState<Subject[]>([]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blogs, setBlogs] = useState<BlogDTO[]>([]);
  const [comments, setComments] = useState<CommentDTO[]>([]);

  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [selectedBlog, setSelectedBlog] = useState<BlogDTO | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState<Subject | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const loadMe = async () => {
    try {
      const data: UserDTO = await apiRequest("/user/me", { method: "GET" });
      setMe(data);
    } catch (e: any) {
      console.log("LOAD ME ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot load user");
    }
  };

  const loadAvatar = async () => {
    try {
      const data: string | null = await apiRequest("/user/avatar", {
        method: "GET",
      });

      setAvatarUrl(data ?? null);
    } catch (e) {
      console.log("LOAD AVATAR ERROR:", e);
      setAvatarUrl(null);
    }
  };

  const loadSubjects = async () => {
    try {
      const data: Subject[] = await apiRequest("/user/subjects", {
        method: "GET",
      });

      const loaded = data ?? [];
      setSubjects(loaded);

      if (loaded.length > 0) {
        setSubject((prev) => prev ?? loaded[0]);
      }
    } catch (e) {
      console.log("LOAD SUBJECTS ERROR:", e);
      setSubjects([]);
      setSubject(null);
    }
  };

  const loadProfile = async () => {
    try {
      const data: StudentProfileDTO = await apiRequest("/user/card", {
        method: "GET",
      });

      setProfile(data);
      setSchool(data.school ?? "");
      setFaculty(data.faculty ?? "");
      setProfileSubjects(data.subjects ?? []);
    } catch (e) {
      console.log("LOAD PROFILE ERROR:", e);
      setProfile(null);
      setSchool("");
      setFaculty("");
      setProfileSubjects([]);
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

      const data: PageResponse<BlogDTO> = await apiRequest(
        `/blog/my?page=${pageToLoad}&size=${PAGE_SIZE}`,
        { method: "GET" }
      );

      const newBlogs = data?.content ?? [];

      setBlogs((prev) => {
        if (!append) return newBlogs;

        const existingIds = new Set(prev.map((b) => b.id));
        const filtered = newBlogs.filter((b) => !existingIds.has(b.id));

        return [...prev, ...filtered];
      });

      setPage(data?.number ?? pageToLoad);
      setLastPage(Boolean(data?.last));
    } catch (e: any) {
      console.log("LOAD BLOGS ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot load blogs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const refreshAll = async () => {
    setPage(0);
    setLastPage(false);

    await Promise.all([
      loadMe(),
      loadAvatar(),
      loadSubjects(),
      loadProfile(),
      loadBlogs(0, false),
    ]);
  };

  const loadNextPage = async () => {
    if (loading || loadingMore || lastPage) return;
    await loadBlogs(page + 1, true);
  };

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [])
  );

  const uploadAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Allow gallery access to choose avatar");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      const token = await getToken();

      const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";

      const type =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

      const formData = new FormData();

      formData.append("file", {
        uri: asset.uri,
        name: `avatar.${ext}`,
        type,
      } as any);

      setAvatarUploading(true);

      const res = await fetch(`${API_BASE_URL}/user/upload-avatar`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const text = await res.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON: ${text}`);
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Cannot upload avatar");
      }

      setAvatarUrl(data.data);
      Alert.alert("Success", "Avatar updated");
    } catch (e: any) {
      console.log("UPLOAD AVATAR ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const toggleProfileSubject = (s: Subject) => {
    setProfileSubjects((prev) => {
      if (prev.includes(s)) {
        return prev.filter((x) => x !== s);
      }

      return [...prev, s];
    });
  };

  const saveProfile = async () => {
    try {
      if (!school.trim()) throw new Error("School is required");
      if (!faculty.trim()) throw new Error("Faculty is required");
      if (profileSubjects.length === 0) {
        throw new Error("At least one subject is required");
      }

      await apiRequest("/user/update-card", {
        method: "PUT",
        body: JSON.stringify({
          school: school.trim(),
          faculty: faculty.trim(),
          subjects: profileSubjects,
        }),
      });

      setProfileOpen(false);
      await loadProfile();

      Alert.alert("Success", "Profile card updated");
    } catch (e: any) {
      console.log("SAVE PROFILE ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot save profile");
    }
  };

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
      setSubject(subjects[0] ?? null);

      await loadBlogs(0, false);
    } catch (e: any) {
      console.log("CREATE BLOG ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot create blog");
    }
  };

  const openEditBlog = (blog: BlogDTO) => {
    setSelectedBlog(blog);
    setEditTitle(blog.title ?? "");
    setEditContent(blog.content ?? "");
    setEditSubject(blog.subject ?? subjects[0] ?? null);
    setEditOpen(true);
  };

  const closeEditBlog = () => {
    setSelectedBlog(null);
    setEditTitle("");
    setEditContent("");
    setEditSubject(null);
    setEditOpen(false);
  };

  const saveEditedBlog = async () => {
    try {
      if (!selectedBlog) return;
      if (!editTitle.trim()) throw new Error("Title is required");
      if (!editContent.trim()) throw new Error("Content is required");
      if (!editSubject) throw new Error("Subject is required");

      await apiRequest("/blog/update", {
        method: "PUT",
        body: JSON.stringify({
          id: selectedBlog.id,
          title: editTitle.trim(),
          content: editContent.trim(),
          subject: editSubject,
          updatedAt: selectedBlog.updatedAt,
        }),
      });

      closeEditBlog();
      await loadBlogs(0, false);
    } catch (e: any) {
      console.log("EDIT BLOG ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot edit blog");
    }
  };

  const deleteBlog = async (blog: BlogDTO) => {
    Alert.alert("Delete blog", "Are you sure you want to delete this blog?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest("/blog/delete", {
              method: "DELETE",
              body: JSON.stringify({
                id: blog.id,
              }),
            });

            setBlogs((prev) => prev.filter((b) => b.id !== blog.id));
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
    } catch (e: any) {
      console.log("LIKE ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot update like");

      setBlogs((prev) =>
        prev.map((b) =>
          b.id === blog.id
            ? {
                ...b,
                likedByMe: blog.likedByMe,
                likesCount: blog.likesCount,
              }
            : b
        )
      );
    }
  };

  const openComments = async (blog: BlogDTO) => {
    try {
      setSelectedBlog(blog);
      setCommentsOpen(true);
      setCommentText("");
      setEditingCommentId(null);
      setEditingCommentText("");

      const data: CommentDTO[] = await apiRequest(`/blog/comments/${blog.id}`, {
        method: "GET",
      });

      setComments(data ?? []);
    } catch (e: any) {
      console.log("LOAD COMMENTS ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot load comments");
    }
  };

  const closeComments = () => {
    setCommentsOpen(false);
    setSelectedBlog(null);
    setComments([]);
    setCommentText("");
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const addComment = async () => {
    try {
      if (!selectedBlog) return;
      if (!commentText.trim()) throw new Error("Comment cannot be empty");

      const text = commentText.trim();

      await apiRequest(
        `/blog/comment/${selectedBlog.id}?content=${encodeURIComponent(text)}`,
        { method: "POST" }
      );

      setCommentText("");

      const data: CommentDTO[] = await apiRequest(
        `/blog/comments/${selectedBlog.id}`,
        { method: "GET" }
      );

      setComments(data ?? []);

      setBlogs((prev) =>
        prev.map((b) =>
          b.id === selectedBlog.id
            ? { ...b, commentsCount: (b.commentsCount ?? 0) + 1 }
            : b
        )
      );
    } catch (e: any) {
      console.log("ADD COMMENT ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot add comment");
    }
  };

  const startEditComment = (comment: CommentDTO) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async () => {
    try {
      if (!selectedBlog || !editingCommentId) return;
      if (!editingCommentText.trim()) {
        throw new Error("Comment cannot be empty");
      }

      await apiRequest(
        `/blog/comments/${editingCommentId}?content=${encodeURIComponent(
          editingCommentText.trim()
        )}`,
        { method: "PUT" }
      );

      const data: CommentDTO[] = await apiRequest(
        `/blog/comments/${selectedBlog.id}`,
        { method: "GET" }
      );

      setComments(data ?? []);
      cancelEditComment();
    } catch (e: any) {
      console.log("EDIT COMMENT ERROR:", e);
      Alert.alert(
        "Error",
        e?.message ??
          "Cannot edit comment. Backend allows editing only your own comments."
      );
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      if (!selectedBlog) return;

      await apiRequest(`/blog/comments/${commentId}`, {
        method: "DELETE",
      });

      setComments((prev) => prev.filter((c) => c.id !== commentId));

      setBlogs((prev) =>
        prev.map((b) =>
          b.id === selectedBlog.id
            ? {
                ...b,
                commentsCount: Math.max((b.commentsCount ?? 1) - 1, 0),
              }
            : b
        )
      );
    } catch (e: any) {
      console.log("DELETE COMMENT ERROR:", e);
      Alert.alert("Error", e?.message ?? "Cannot delete comment");
    }
  };

  const renderSubjectPicker = (
    selected: Subject | null,
    onSelect: (s: Subject) => void
  ) => {
    if (subjects.length === 0) {
      return <ThemedText style={styles.emptyText}>No subjects available</ThemedText>;
    }

    return (
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
              selected === s && styles.subjectChoiceActive,
            ]}
            onPress={() => onSelect(s)}
          >
            <ThemedText
              style={[
                styles.subjectChoiceText,
                selected === s && styles.subjectChoiceTextActive,
              ]}
            >
              {formatSubject(s)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.profileAvatarWrap} onPress={uploadAvatar}>
          {joinUrl(avatarUrl) ? (
            <Image
              source={{ uri: joinUrl(avatarUrl)! }}
              style={styles.profileAvatarImage}
            />
          ) : (
            <View style={styles.profileAvatarPlaceholder}>
              <Ionicons name="person" size={38} color="#fff" />
            </View>
          )}

          <View style={styles.avatarUploadBtn}>
            {avatarUploading ? (
              <ActivityIndicator size="small" color="#34207E" />
            ) : (
              <Ionicons name="camera" size={16} color="#34207E" />
            )}
          </View>
        </Pressable>

        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>My Profile</ThemedText>
          <ThemedText style={styles.subtitle}>
            @{me?.username ?? "user"} · {me?.role ?? "role"}
          </ThemedText>
        </View>

        <Pressable style={styles.plusBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.profileTitle}>
            {profile?.school || "No school"}
          </ThemedText>

          <ThemedText style={styles.profileSubtitle}>
            {profile?.faculty || "No faculty"}
          </ThemedText>

          <View style={styles.profileSubjectsRow}>
            {(profile?.subjects ?? []).slice(0, 4).map((s) => (
              <View key={s} style={styles.profileSubjectPill}>
                <ThemedText style={styles.profileSubjectText}>
                  {formatSubject(s)}
                </ThemedText>
              </View>
            ))}

            {!profile && (
              <ThemedText style={styles.emptyText}>
                Create your student card
              </ThemedText>
            )}
          </View>
        </View>

        {me?.role === "STUDENT" && (
          <Pressable
            style={styles.editProfileBtn}
            onPress={() => setProfileOpen(true)}
          >
            <Ionicons name="create-outline" size={18} color="#34207E" />
          </Pressable>
        )}
      </View>

      <View style={styles.topPanel}>
        <Pressable style={styles.refreshBtn} onPress={refreshAll}>
          <Ionicons name="refresh-outline" size={18} color="#34207E" />
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </Pressable>

        <View style={styles.countPill}>
          <Ionicons name="newspaper-outline" size={16} color="#34207E" />
          <ThemedText style={styles.countText}>{blogs.length} my blogs</ThemedText>
        </View>
      </View>

      <FlatList
        data={blogs}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={refreshAll}
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
              <ThemedText style={styles.emptyText}>Create your first post</ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {(item.authorUsername?.[0] ?? me?.username?.[0] ?? "?").toUpperCase()}
                </ThemedText>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.blogTitle}>{item.title}</ThemedText>

                <ThemedText style={styles.meta}>
                  @{item.authorUsername ?? me?.username ?? "unknown"} ·{" "}
                  {formatDate(item.createdAt)}
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
                <ThemedText style={styles.statText}>
                  ❤️ {item.likesCount ?? 0}
                </ThemedText>
              </View>

              <View style={styles.statPill}>
                <ThemedText style={styles.statText}>
                  💬 {item.commentsCount ?? 0}
                </ThemedText>
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
              <Pressable style={styles.editBlogBtn} onPress={() => openEditBlog(item)}>
                <Ionicons name="create-outline" size={17} color="#34207E" />
                <ThemedText style={styles.editBlogText}>Edit</ThemedText>
              </Pressable>

              <Pressable style={styles.deleteBlogBtn} onPress={() => deleteBlog(item)}>
                <Ionicons name="trash-outline" size={17} color="#E5484D" />
                <ThemedText style={styles.deleteBlogText}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={profileOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Student card</ThemedText>

              <Pressable
                style={styles.closeCircle}
                onPress={() => setProfileOpen(false)}
              >
                <Ionicons name="close" size={20} color="#34207E" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="School"
              placeholderTextColor="#8D83A3"
              value={school}
              onChangeText={setSchool}
            />

            <TextInput
              style={styles.input}
              placeholder="Faculty"
              placeholderTextColor="#8D83A3"
              value={faculty}
              onChangeText={setFaculty}
            />

            <View style={styles.subjectBox}>
              <ThemedText style={styles.subjectLabel}>Subjects</ThemedText>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectScroll}
              >
                {subjects.map((s) => {
                  const active = profileSubjects.includes(s);

                  return (
                    <Pressable
                      key={s}
                      style={[
                        styles.subjectChoice,
                        active && styles.subjectChoiceActive,
                      ]}
                      onPress={() => toggleProfileSubject(s)}
                    >
                      <ThemedText
                        style={[
                          styles.subjectChoiceText,
                          active && styles.subjectChoiceTextActive,
                        ]}
                      >
                        {formatSubject(s)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setProfileOpen(false)}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable style={styles.saveBtn} onPress={saveProfile}>
                <ThemedText style={styles.saveText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              {renderSubjectPicker(subject, setSubject)}
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

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit blog</ThemedText>

              <Pressable style={styles.closeCircle} onPress={closeEditBlog}>
                <Ionicons name="close" size={20} color="#34207E" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#8D83A3"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <TextInput
              style={[styles.input, styles.bigInput]}
              placeholder="Content"
              placeholderTextColor="#8D83A3"
              value={editContent}
              onChangeText={setEditContent}
              multiline
            />

            <View style={styles.subjectBox}>
              <ThemedText style={styles.subjectLabel}>Subject</ThemedText>
              {renderSubjectPicker(editSubject, setEditSubject)}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={closeEditBlog}>
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.saveBtn, !editSubject && styles.disabledBtn]}
                onPress={saveEditedBlog}
                disabled={!editSubject}
              >
                <ThemedText style={styles.saveText}>Save</ThemedText>
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

              <Pressable style={styles.closeCircle} onPress={closeComments}>
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

                      {editingCommentId === c.id ? (
                        <>
                          <TextInput
                            style={styles.editCommentInput}
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            multiline
                          />

                          <View style={styles.commentEditActions}>
                            <Pressable
                              style={styles.smallCancelBtn}
                              onPress={cancelEditComment}
                            >
                              <ThemedText style={styles.smallCancelText}>
                                Cancel
                              </ThemedText>
                            </Pressable>

                            <Pressable
                              style={styles.smallSaveBtn}
                              onPress={saveEditedComment}
                            >
                              <ThemedText style={styles.smallSaveText}>
                                Save
                              </ThemedText>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <ThemedText style={styles.commentText}>{c.content}</ThemedText>
                      )}
                    </View>

                    {editingCommentId !== c.id && (
                      <View style={styles.commentActionsRight}>
                        <Pressable
                          style={styles.commentIconBtn}
                          onPress={() => startEditComment(c)}
                        >
                          <Ionicons name="create-outline" size={17} color="#34207E" />
                        </Pressable>

                        <Pressable
                          style={styles.commentDeleteBtn}
                          onPress={() => deleteComment(c.id)}
                        >
                          <Ionicons name="trash-outline" size={17} color="#E5484D" />
                        </Pressable>
                      </View>
                    )}
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
              <Pressable style={styles.cancelBtn} onPress={closeComments}>
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

    profileAvatarWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "#ffffff24",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#ffffff42",
    },

    profileAvatarImage: {
      width: 70,
      height: 70,
      borderRadius: 35,
    },

    profileAvatarPlaceholder: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff22",
    },

    avatarUploadBtn: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#DDD3FF",
    },

    title: {
      fontSize: fs(29),
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

    profileCard: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    profileTitle: {
      fontSize: fs(18),
      fontWeight: "900",
      color: theme.text,
    },

    profileSubtitle: {
      marginTop: 4,
      fontSize: fs(13),
      color: theme.secondaryText,
    },

    profileSubjectsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 10,
    },

    profileSubjectPill: {
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },

    profileSubjectText: {
      fontSize: fs(11),
      fontWeight: "900",
      color: theme.primary,
    },

    editProfileBtn: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
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

    ownerActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },

    editBlogBtn: {
      flex: 1,
      height: 42,
      borderRadius: 15,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },

    editBlogText: {
      fontSize: fs(13),
      fontWeight: "900",
      color: theme.primary,
    },

    deleteBlogBtn: {
      flex: 1,
      height: 42,
      borderRadius: 15,
      backgroundColor: theme.danger + "18",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },

    deleteBlogText: {
      fontSize: fs(13),
      fontWeight: "900",
      color: theme.danger,
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

    commentDate: {
      fontSize: fs(11),
      color: theme.secondaryText,
      marginBottom: 3,
    },

    commentText: {
      fontSize: fs(14),
      color: theme.text,
      lineHeight: 20,
    },

    commentActionsRight: {
      flexDirection: "row",
      gap: 6,
    },

    commentIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    commentDeleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: theme.danger + "18",
      alignItems: "center",
      justifyContent: "center",
    },

    editCommentInput: {
      minHeight: 42,
      borderRadius: 13,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: theme.text,
      fontSize: fs(14),
      marginTop: 4,
    },

    commentEditActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },

    smallCancelBtn: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    smallCancelText: {
      fontSize: fs(12),
      fontWeight: "900",
      color: theme.primary,
    },

    smallSaveBtn: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    smallSaveText: {
      fontSize: fs(12),
      fontWeight: "900",
      color: theme.card,
    },
  });
}