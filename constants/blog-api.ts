import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

export type ApiResponseWrapper<T> = {
  success: boolean;
  message?: string | null;
  data?: T | null;
  token?: string | null;
};

export type BlogDTO = {
  id?: number;
  title: string;
  content: string;
  authorId?: number;
  authorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string | null;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
};

export type CommentDTO = {
  id: number;
  username: string;
  content: string;
};

async function authHeaders(json = true): Promise<Record<string, string>> {
  const token = await getToken();

  const headers: Record<string, string> = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<ApiResponseWrapper<T>> {
  const text = await response.text();

  if (!text) {
    return {
      success: false,
      message: `Empty response from server. Status: ${response.status}`,
      data: null,
      token: null,
    };
  }

  let json: ApiResponseWrapper<T>;

  try {
    json = JSON.parse(text);
  } catch {
    console.log("INVALID SERVER RESPONSE:", text);

    return {
      success: false,
      message: `Invalid server response. Status: ${response.status}`,
      data: null,
      token: null,
    };
  }

  return json;
}

export async function getAllBlogs() {
  const response = await fetch(`${API_BASE_URL}/blog/all`, {
    method: "GET",
    headers: await authHeaders(false),
  });

  return handleResponse<BlogDTO[]>(response);
}

export async function getBlogById(id: number) {
  const response = await fetch(`${API_BASE_URL}/blog/${id}`, {
    method: "GET",
    headers: await authHeaders(false),
  });

  return handleResponse<BlogDTO>(response);
}

export async function createBlog(payload: {
  title: string;
  content: string;
  clientId?: string | null;
}) {
  const response = await fetch(`${API_BASE_URL}/blog/create`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(payload),
  });

  return handleResponse<BlogDTO>(response);
}

export async function updateBlog(payload: {
  id: number;
  title: string;
  content: string;
  updatedAt?: string;
  clientId?: string | null;
}) {
  const response = await fetch(`${API_BASE_URL}/blog/update`, {
    method: "PUT",
    headers: await authHeaders(true),
    body: JSON.stringify(payload),
  });

  return handleResponse<BlogDTO>(response);
}

export async function deleteBlog(id: number) {
  const response = await fetch(`${API_BASE_URL}/blog/delete`, {
    method: "DELETE",
    headers: await authHeaders(true),
    body: JSON.stringify({ id }),
  });

  return handleResponse<string>(response);
}

export async function likeBlog(id: number) {
  const response = await fetch(`${API_BASE_URL}/blog/like/${id}`, {
    method: "POST",
    headers: await authHeaders(false),
  });

  return handleResponse<string>(response);
}

export async function dislikeBlog(id: number) {
  const response = await fetch(`${API_BASE_URL}/blog/dislike/${id}`, {
    method: "DELETE",
    headers: await authHeaders(false),
  });

  return handleResponse<string>(response);
}

export async function getComments(blogId: number) {
  const response = await fetch(`${API_BASE_URL}/blog/comments/${blogId}`, {
    method: "GET",
    headers: await authHeaders(false),
  });

  return handleResponse<CommentDTO[]>(response);
}

export async function addComment(blogId: number, content: string) {
  const response = await fetch(
    `${API_BASE_URL}/blog/comment/${blogId}?content=${encodeURIComponent(content)}`,
    {
      method: "POST",
      headers: await authHeaders(false),
    }
  );

  return handleResponse<string>(response);
}

export async function deleteComment(commentId: number) {
  const response = await fetch(`${API_BASE_URL}/blog/comments/${commentId}`, {
    method: "DELETE",
    headers: await authHeaders(false),
  });

  return handleResponse<string>(response);
}

export async function editComment(commentId: number, content: string) {
  const response = await fetch(
    `${API_BASE_URL}/blog/comments/${commentId}?content=${encodeURIComponent(content)}`,
    {
      method: "PUT",
      headers: await authHeaders(false),
    }
  );

  return handleResponse<string>(response);
}