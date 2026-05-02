import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes.js";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "../server/passport-config.js";

const app = express();
const SessionStore = MemoryStore(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    cookie: {
      maxAge: 86400000,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    },
    store: new SessionStore({ checkPeriod: 86400000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "rio-news-portal-secret",
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Aguarda registro das rotas (evita race condition no cold start da Vercel)
let routesReady = false;
const routesPromise = registerRoutes(app).then(() => {
  routesReady = true;
});

// Middleware: bloqueia requisições até as rotas estarem prontas
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!routesReady) await routesPromise;
  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`🔴 Server Error [${status}]:`, err);
  res.status(status).json({ message });
});

export default app;

