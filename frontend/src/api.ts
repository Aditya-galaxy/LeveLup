// API client — backend integration.
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export type ApiError = {
  status: number;
  code?: string;
  message: string;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  appUserId?: string
): Promise<T> {
  const url = `${BASE}/api${path}`;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (appUserId) headers["x-app-user-id"] = appUserId;

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e: any) {
    throw {
      status: 0,
      message: "System unavailable. Retry when connection stabilizes.",
    } as ApiError;
  }

  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {}
    const code =
      (detail && detail.detail && detail.detail.code) ||
      (detail && detail.code) ||
      undefined;
    const message =
      (detail && detail.detail && (detail.detail.message || detail.detail)) ||
      (detail && detail.message) ||
      `Request failed (${res.status})`;
    throw {
      status: res.status,
      code,
      message: typeof message === "string" ? message : JSON.stringify(message),
    } as ApiError;
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  ready: () => request<{ status: string }>("/ready"),
  config: () => request<any>("/config"),
  analyzeImage: async (
    file: { uri: string; name: string; type: string },
    mealType: string,
    appUserId: string
  ) => {
    const form = new FormData();
    // @ts-ignore RN multipart
    form.append("image", { uri: file.uri, name: file.name, type: file.type });
    form.append("mealType", mealType);
    const url = `${BASE}/api/nutrition/analyze-image`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-app-user-id": appUserId },
      body: form,
    });
    if (!res.ok) {
      let d: any = null;
      try {
        d = await res.json();
      } catch {}
      throw {
        status: res.status,
        code: d?.detail?.code,
        message: d?.detail?.message || d?.detail || "AI scan failed.",
      } as ApiError;
    }
    return res.json();
  },
  generatePlan: (payload: any, appUserId: string) =>
    request<any>(
      "/plans/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      appUserId
    ),
};
