import { hc } from "hono/client";
import type { AppType } from "../../api";
import { getToken } from "./authClient";

const client = hc<AppType>("/", {
  headers: (): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const api = client.api;
