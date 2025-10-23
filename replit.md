# Diário do Carioca - Portal de Notícias do Rio de Janeiro

## Overview
"Diário do Carioca" is a comprehensive news portal focused on Rio de Janeiro, covering culture, sports, shows, gastronomy, international, and general news. The project integrates RSS feeds from 15+ Brazilian portals and utilizes free APIs to deliver real-time updated content, aiming to be the go-to source for local news and events in Rio.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder Z.
Do not make changes to the file Y.

## System Architecture

### UI/UX Decisions
The design is mobile-first and fully responsive, featuring a dark mode as the default production theme. It prioritizes accessibility with `data-testid` on interactive elements and aims for high performance through lazy image loading and API caching. Visuals incorporate gradients, hero images, and color-coded badges for categories.
**Color Scheme:**
- Primary (Rio Blue): `195 85% 45%`
- Secondary (Sunset Orange): `15 90% 55%`
- Category-specific colors: Purple for Culture, Green for Sports, Pink for Shows, Orange for Gastronomy.
**Typography:** Playfair Display (serif) and Inter (sans-serif).

### Technical Implementations
**Frontend:**
- **Framework:** React + TypeScript
- **Routing:** Wouter
- **Styling:** Tailwind CSS + Shadcn UI
- **State Management:** TanStack Query (React Query)
- **Icons:** Lucide React

**Backend:**
- **Runtime:** Node.js + Express with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Cache:** In-memory cache (2-minute duration) to reduce API calls and improve performance.
- **RSS Parser:** Native `rss-parser` for efficient feed processing without external API dependencies or rate limits.
- **Authentication:** Passport.js with `express-session`, bcryptjs for secure password hashing, and middleware for route protection.

**Features:**
- **Homepage:** Featured news with hero image, recent news grid, event agenda, responsive design.
- **Categories:** Dedicated pages for Culture, Sports, Shows, Gastronomy, and General news.
- **Article Pages:** Full article view, breadcrumb navigation, social sharing, source link, metadata.
- **Search System:** Full-screen modal with real-time search (min. 3 characters), filtering across title and description, loading and empty states.
- **Navigation:** Fixed header, category menu with visual indicators, responsive mobile menu, dark mode toggle.
- **CMS (Content Management System):** Full CRUD for news articles (protected routes, Zod validation, draft/publish separation), admin panel in frontend using TanStack Query.

### System Design Choices
- **Database Schema:** `users` (editorial team), `news_articles` (API + manual), `events` (external APIs + manual), `comments`, `newsletter_subscribers`.
- **API Endpoints:**
    - **Authentication:** Register, Login, Logout, Get current user.
    - **News:** Get all, by category, search, specific article, real-time RSS, synchronize RSS to DB (UPSERT, auto-sync on server start).
    - **Events:** Get all, by category, synchronize (Sympla + Eventbrite UPSERT).
    - **Sports:** Get matches, team info.
    - **Admin:** CRUD for news, clear cache.
- **Frontend Routes:** Homepage, Login, Register, Admin panel, Category pages, Article pages, 404.
- **Automatic Categorization:** News articles are categorized based on keywords in title/description, with feed-provided category taking precedence. A blacklist prevents miscategorization of sensitive topics.
- **Events System:**
    - **Auto-seed:** On server startup, if events table is empty, 8 realistic mock events are automatically seeded to database (2 cultura, 2 esportes, 2 shows, 2 vida-noturna).
    - **Mock events:** Cover venues like CCBB, Maracanã, Vivo Rio, Arcos da Lapa, with realistic pricing and dates.
    - **API integration:** `POST /api/events/sync` fetches from Sympla and Eventbrite when API keys are configured, otherwise uses seeded mock data.
    - **Database-first:** All events served from PostgreSQL database, ensuring consistency and persistence.
- **Automatic Cleanup:**
    - **News retention:** On server startup, automatically deletes RSS-sourced news articles older than 15 days to prevent database bloat.
    - **Manual articles preserved:** Only non-manual articles (is_manual = false) are deleted during cleanup.
    - **Cache invalidation:** Cache is cleared after cleanup to ensure fresh data.
- **Login Session:** Adjusted `sameSite: "lax"` and `trust proxy` for production environments to ensure cookie functionality.

## External Dependencies

-   **NewsData.io:** Used for general news (Brazilian/Rio).
-   **TheSportsDB:** Provides sports data.
-   **Sympla API:** (Optional) For Brazilian events, persists data to PostgreSQL.
-   **Eventbrite API:** (Optional) For international events, persists data to PostgreSQL.
-   **RSS Feeds (15 configured from 13 portals):**
    -   **General:** G1 Rio, O Globo Rio, O Dia, Diário do Rio, Veja Rio, Gazeta do Povo.
    -   **Culture:** Gazeta do Povo Cultura, O Globo Cultura.
    -   **Sports:** GloboEsporte.
    -   **Shows:** Rolling Stone Brasil.
    -   **Gastronomy:** Veja Rio Comer & Beber, G1 - Pop & Arte.
    -   *Note: Some feeds may be temporarily inactive or have parsing issues.*