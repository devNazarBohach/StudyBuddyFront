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
};

export type CommentDTO = {
  id: number;
  username: string;
  content: string;
};

async function authHeaders(extra?: Record<string, string>) {
  const token = await getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  };
}

async function handleJsonResponse<T>(response: Response): Promise<ApiResponseWrapper<T>> {
  let result: ApiResponseWrapper<T>;

  try {
    result = await response.json();
  } catch {
    return {
      success: false,
      message: "invalid server response",
      data: null,
      token: null,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      message: result?.message || "request failed",
      data: null,
      token: null,
    };
  }

  return result;
}

export async function getAllBlogs() {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/all`, {
    method: "GET",
    headers,
  });

  return handleJsonResponse<BlogDTO[]>(response);
}

export async function getBlogById(id: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/${id}`, {
    method: "GET",
    headers,
  });

  return handleJsonResponse<BlogDTO>(response);
}

export async function createBlog(payload: {
  title: string;
  content: string;
  clientId?: string | null;
}) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<BlogDTO>(response);
}

export async function updateBlog(payload: {
  id: number;
  title: string;
  content: string;
  updatedAt?: string;
  clientId?: string | null;
}) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/update`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<BlogDTO>(response);
}

export async function deleteBlog(id: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/delete`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ id }),
  });

  return handleJsonResponse<string>(response);
}

export async function likeBlog(id: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/like/${id}`, {
    method: "POST",
    headers,
  });

  return handleJsonResponse<string>(response);
}

export async function dislikeBlog(id: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/dislike/${id}`, {
    method: "DELETE",
    headers,
  });

  return handleJsonResponse<string>(response);
}

export async function getComments(blogId: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/comments/${blogId}`, {
    method: "GET",
    headers,
  });

  return handleJsonResponse<CommentDTO[]>(response);
}

export async function addComment(blogId: number, content: string) {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/blog/comment/${blogId}?content=${encodeURIComponent(content)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleJsonResponse<string>(response);
}

export async function deleteComment(commentId: number) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE_URL}/blog/comments/${commentId}`, {
    method: "DELETE",
    headers,
  });

  return handleJsonResponse<string>(response);
}

export async function editComment(commentId: number, content: string) {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/blog/comments/${commentId}?content=${encodeURIComponent(content)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleJsonResponse<string>(response);
}