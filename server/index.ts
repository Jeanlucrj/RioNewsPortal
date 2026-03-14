import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, logRequest } from "./vite.js";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "./passport-config.js";

const app = express();
const SessionStore = MemoryStore(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session before passport
app.use(
  session({
    cookie: {
      maxAge: 86400000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    },
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "rio-news-portal-secret",
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(logRequest);

// Vercel / serverless environment handling
// We initialize routes immediately
const routesPromise = registerRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`🔴 Server Error [${status}]:`, err);
  res.status(status).json({ message });
});

// For local development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  (async () => {
    const server = await routesPromise;
    setupVite(app, server);

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reuseAddr: true,
    }, () => {
      console.log(`🚀 Desenvolvimento rodando em http://localhost:${port}`);
    });
  })();
} else {
  // Production / Vercel
  serveStatic(app);
}

export default app;
