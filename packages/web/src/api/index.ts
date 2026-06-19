import { Hono } from 'hono';
import { cors } from "hono/cors"
import { auth } from "./auth";
import { profiles } from "./routes/profiles";
import { orders } from "./routes/orders";
import { stories } from "./routes/stories";
import { assets } from "./routes/assets";
import { members } from "./routes/members";
import { acknowledgements } from "./routes/acknowledgements";
import { productions } from "./routes/productions";
import { admin } from "./routes/admin";
import { onboardingRoutes } from "./routes/onboarding";
import { jobRoutes } from "./routes/jobs";
import { providers } from "./routes/providers";
import { automations } from "./routes/automations";
import { sophia } from "./routes/sophia";
import { simli } from "./routes/simli";
import { dodo } from "./routes/dodo";

const app = new Hono()
  .basePath('api')
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get('/health', (c) => c.json({ status: 'ok' }, 200))

  // Auth — Better Auth handles /api/auth/*
  // Note: basePath('api') is set, so use /auth/* (single glob, not /**)
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  // Feature routes
  .route("/profiles", profiles)
  .route("/orders", orders)
  .route("/stories", stories)
  .route("/assets", assets)
  .route("/members", members)
  .route("/acknowledgements", acknowledgements)
  .route("/productions", productions)
  .route("/admin", admin)
  .route("/onboarding", onboardingRoutes)
  .route("/jobs", jobRoutes)
  .route("/providers", providers)
  .route("/automations", automations)
  .route("/sophia", sophia)
  .route("/simli", simli)
  .route("/dodo", dodo);

export type AppType = typeof app;
export default app;
