const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

export async function getJson(path) {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function postForm(path, form) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString()
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.text();
}

export async function getToken(kind, params) {
  const qs = new URLSearchParams(params).toString();
  return getJson(`/api/twilio/token/${kind}?${qs}`);
}

export { BACKEND_URL };

