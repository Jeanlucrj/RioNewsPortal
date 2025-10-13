# Design Guidelines: Portal de Notícias - Rio de Janeiro

## Design Approach
**Reference-Based**: Drawing inspiration from modern media platforms (Vice, Complex, Dezeen) combined with Rio's vibrant cultural identity. The design celebrates Rio's energy through bold typography, dynamic layouts, and a sun-soaked color palette that reflects the city's beaches, culture, and nightlife.

## Color Palette

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Primary (Rio Blue): 195 85% 45% - inspired by ocean and sky
- Secondary (Sunset Orange): 15 90% 55% - warm, energetic accent
- Text Primary: 220 15% 15%
- Text Secondary: 220 10% 45%
- Border: 220 15% 88%

**Dark Mode:**
- Background: 220 20% 8%
- Surface: 220 18% 12%
- Primary: 195 80% 55%
- Secondary: 15 85% 60%
- Text Primary: 0 0% 95%
- Text Secondary: 220 10% 65%
- Border: 220 15% 20%

**Category Colors:**
- Cultura: 280 65% 55% (vibrant purple)
- Esportes: 140 60% 45% (fresh green)
- Shows: 330 75% 55% (electric pink)
- Vida Noturna: 250 70% 50% (neon blue)

## Typography

**Font Families:**
- Headlines: 'Playfair Display', serif (dramatic, editorial feel)
- Body/UI: 'Inter', sans-serif (modern, readable)

**Hierarchy:**
- Hero Headline: text-6xl/7xl, font-bold, Playfair
- Section Headlines: text-4xl/5xl, font-bold, Playfair
- Article Titles: text-2xl/3xl, font-semibold, Inter
- Category Labels: text-sm, uppercase, tracking-wide, font-bold
- Body Text: text-base/lg, Inter
- Metadata: text-sm, text-secondary

## Layout System

**Spacing Primitives:** Use Tailwind units of 3, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm.

**Grid System:**
- Container: max-w-7xl mx-auto px-4/6/8
- Article Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6/8
- Featured Layout: Asymmetric masonry-style with primary story taking 2 columns

## Component Library

**Navigation:**
- Sticky header with blur backdrop (backdrop-blur-xl bg-background/80)
- Logo + horizontal category tabs
- Search icon + mobile menu hamburger
- Category indicator bar beneath nav showing active section color

**News Cards:**
- Large image (aspect-ratio 16:9)
- Category pill badge with color-coded background
- Headline in Inter semibold
- Excerpt (2 lines, truncated)
- Metadata: date, author, read time
- Hover: subtle scale transform (scale-102) and shadow increase

**Featured Story (Homepage):**
- Full-width hero with large image background
- Gradient overlay (from-black/70 to-transparent)
- Headline overlaid in white Playfair Display
- Category badge + metadata
- Dual CTAs: "Ler Notícia" (solid) + "Ver Mais" (outline with blur backdrop)

**Event Cards (Agenda):**
- Horizontal layout with square image (left)
- Date badge in corner (day/month in large numbers)
- Event title, venue, time
- "Ingressos" button if available
- Category color accent on left border

**Category Pages:**
- Banner with category name + color-coded background gradient
- Filter pills: "Mais Recentes", "Mais Lidas", subcategories
- Grid layout switching to list on mobile

**Article Page:**
- Wide hero image (max-h-96)
- Breadcrumb navigation
- Article meta: author avatar, name, date, social share buttons
- Content: max-w-prose mx-auto for optimal reading
- Related articles sidebar (desktop) or bottom (mobile)

**Search:**
- Full-screen overlay modal with blur backdrop
- Large search input with autofocus
- Recent searches + trending topics below
- Results appear as you type with highlighting

**Footer:**
- Dark background with light text
- Four columns: About, Categories, Social, Newsletter
- Newsletter signup with inline form
- Social icons for Instagram, Twitter, Facebook
- Rio landmark illustration or pattern as subtle background

## Images

**Homepage Hero:** Large panoramic image of Rio's iconic landscapes (Christ the Redeemer, Sugarloaf, Copacabana) with vibrant sunset/golden hour lighting. Image should convey energy and beauty.

**Category Banners:** Abstract patterns or filtered photos representing each category (music instruments for Shows, stadium for Esportes, art installations for Cultura, nightlife scenes for Vida Noturna)

**News Cards:** High-quality photos relevant to each story. Use 16:9 ratio consistently. Images should be vibrant and engaging.

**Event Cards:** Promotional images or venue photos, square format for consistency.

## Animations

**Minimal & Purposeful:**
- Smooth scroll behavior
- Card hover: transform scale + shadow (duration-200)
- Page transitions: fade-in content (duration-300)
- Sticky nav: slide down with backdrop blur on scroll
- No autoplay carousels or distracting effects

## Special Features

**Category Color System:** Each category has a signature color used for badges, borders, and accent elements throughout the site, creating visual consistency and easy navigation.

**Reading Progress Bar:** Thin colored bar at top of article pages showing scroll progress in category color.

**Responsive Breakpoints:**
- Mobile: Single column, stacked layout
- Tablet (md): 2-column grids, condensed nav
- Desktop (lg+): 3-column grids, full nav with all categories visible

This design creates a modern, energetic news platform that captures Rio's vibrant spirit while maintaining professional credibility and excellent readability.