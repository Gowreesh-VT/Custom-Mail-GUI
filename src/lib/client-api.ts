"use client";

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (res.status === 401) {
    const refresh = await fetch("/api/auth/refresh", { method: "POST" });
    if (refresh.ok) res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  }
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Authentication required");
  }
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text };
    }
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${res.status} ${res.statusText})`);
  }
  return data;
}
