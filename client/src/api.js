const STUDENT_TOKEN_KEY = "msj_student_token";
const ADMIN_TOKEN_KEY = "msj_admin_token";

export function getStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
}
export function setStudentToken(t) {
  if (t) localStorage.setItem(STUDENT_TOKEN_KEY, t);
  else localStorage.removeItem(STUDENT_TOKEN_KEY);
}
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(t) {
  if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request(method, path, body, { admin = false, isForm = false } = {}) {
  const headers = {};
  const token = admin ? getAdminToken() : getStudentToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let payload;
  if (isForm) {
    payload = body; // FormData
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (p, opts) => request("GET", p, undefined, opts),
  post: (p, b, opts) => request("POST", p, b, opts),
  put: (p, b, opts) => request("PUT", p, b, opts),
  del: (p, opts) => request("DELETE", p, undefined, opts),
  // Send FormData (admin only here)
  postForm: (p, formData) => request("POST", p, formData, { admin: true, isForm: true }),
  putForm: (p, formData) => request("PUT", p, formData, { admin: true, isForm: true }),
};
