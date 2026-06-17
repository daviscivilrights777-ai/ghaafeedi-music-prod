import { createAuthClient } from "better-auth/react";

export const TOKEN_KEY = "gm_bearer_token";

export function getToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}

export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) { try { localStorage.setItem(TOKEN_KEY, token); } catch {} }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (import.meta.env.VITE_APP_URL ?? "http://localhost:4200"),
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getToken(),
    },
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
