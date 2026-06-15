const API_URL = import.meta.env.VITE_API_URL;

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function apiPatch<T>(
  path: string,
  token: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PATCH ${path} failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function apiPost<T>(
  path: string,
  token: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed: ${response.status} ${text}`);
  }

  return response.json();
}
