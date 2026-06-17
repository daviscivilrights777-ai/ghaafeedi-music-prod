import { createGateway } from "ai";

export const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL ?? "https://gateway.ai.cloudflare.com/v1/placeholder",
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});
