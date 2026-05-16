import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function injectArticleOG(html: string, articleId: string, req: any): Promise<string> {
  try {
    const { storage } = await import("./storage.js");
    const article = await storage.getNewsById(articleId);
    if (!article) return html;

    const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
    const pageUrl = `${baseUrl}/noticia/${encodeURIComponent(articleId)}`;
    const title = article.title.replace(/"/g, "&quot;");
    const description = (article.description || "").replace(/"/g, "&quot;").slice(0, 200);
    const image = article.imageUrl || `${baseUrl}/og-default.png`;

    const ogTags = `
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="${image}" />
    <meta property="og:site_name" content="Diário do Carioca" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <title>${title} — Diário do Carioca</title>`;

    // Replace existing title + og tags with dynamic ones
    return html
      .replace(/<title>[^<]*<\/title>/, "")
      .replace(/<meta property="og:[^"]*"[^>]*>/g, "")
      .replace("</head>", `${ogTags}\n  </head>`);
  } catch {
    return html;
  }
}

export async function setupVite(app: Express, server: Server) {
  // Move all Vite-related imports inside setupVite for production safety
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = (await import("../vite.config.js")).default;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      // Inject dynamic Open Graph meta tags for article pages
      const articleMatch = url.match(/\/noticia\/([^?#]+)/);
      if (articleMatch) {
        template = await injectArticleOG(template, decodeURIComponent(articleMatch[1]), req);
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist");

  if (!fs.existsSync(distPath)) {
    // Vercel output handling
    const vercelPath = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(vercelPath)) {
      app.use(express.static(vercelPath, { index: false }));
      app.use("*", async (req, res) => {
        const indexPath = path.resolve(vercelPath, "index.html");
        try {
          let html = await fs.promises.readFile(indexPath, "utf-8");
          const articleMatch = req.originalUrl.match(/\/noticia\/([^?#]+)/);
          if (articleMatch) {
            html = await injectArticleOG(html, decodeURIComponent(articleMatch[1]), req);
          }
          res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch {
          res.sendFile(indexPath);
        }
      });
      return;
    }

    console.warn(`Could not find the build directory: ${distPath}`);
    return;
  }

  app.use(express.static(distPath, { index: false }));
  app.use("*", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    try {
      let html = await fs.promises.readFile(indexPath, "utf-8");
      const articleMatch = req.originalUrl.match(/\/noticia\/([^?#]+)/);
      if (articleMatch) {
        html = await injectArticleOG(html, decodeURIComponent(articleMatch[1]), req);
      }
      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch {
      res.sendFile(indexPath);
    }
  });
}

export function logRequest(req: any, res: any, next: any) {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
}
