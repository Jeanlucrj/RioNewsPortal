# Rio Notícias - Portal de Notícias do Rio de Janeiro

## Visão Geral
Portal de notícias completo focado no Rio de Janeiro, cobrindo cultura, esportes, shows e vida noturna. O projeto integra APIs gratuitas para fornecer conteúdo atualizado em tempo real.

## Funcionalidades Implementadas

### Homepage
- Notícia em destaque com hero image e gradiente
- Grid de notícias recentes (6 artigos)
- Seção de agenda de eventos
- Design responsivo completo

### Categorias
- Cultura: Museus, exposições, teatro, cinema (26 artigos)
- Esportes: Flamengo, Fluminense, Vasco, Botafogo, campeonatos (11 artigos)
- Shows: Festivais, concertos, música ao vivo (17 artigos)
- Gastronomia: Restaurantes, bares, culinária carioca (16 artigos)
- Geral: Notícias variadas do Rio (54 artigos)

### Páginas Individuais
- Visualização completa de artigos
- Breadcrumb navigation
- Botões de compartilhamento social (Facebook, Twitter)
- Link para fonte original
- Metadata (data, fonte, autor)

### Sistema de Busca
- Modal de busca full-screen com blur backdrop
- Busca em tempo real (mínimo 3 caracteres)
- Filtro em todos os campos (título e descrição)
- Estados de loading e empty state

### Navegação
- Header fixo com blur backdrop
- Menu de categorias com indicador visual
- Menu mobile responsivo
- Toggle de tema (light/dark mode) - **Dark mode como padrão em produção** ✨

## Arquitetura Técnica

### Frontend
- **Framework**: React + TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Typography**: Playfair Display (serif) + Inter (sans-serif)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL com Drizzle ORM
- **Cache**: In-memory cache (2 minutos)
- **RSS Parser**: rss-parser nativo (sem dependência de APIs externas) ✨
- **APIs Integradas**:
  - NewsData.io (notícias gerais do Brasil/Rio)
  - TheSportsDB (dados esportivos)
  - **RSS Feeds (15 portais configurados) - Notícias locais categorizadas** ✨
    - **Geral**: G1 Rio, O Globo Rio, O Dia, Extra (404), Diário do Rio, Veja Rio, Gazeta do Povo
    - **Cultura**: Gazeta do Povo Cultura, O Globo Cultura
    - **Esportes**: GloboEsporte
    - **Shows**: Rolling Stone Brasil, Omelete (404)
    - **Gastronomia**: Veja Rio Comer & Beber ✅, G1 - Pop & Arte ✅, G1 - Turismo e Viagem (erro parsing)
  - Sympla API (eventos brasileiros) - OPCIONAL
  - Eventbrite API (eventos internacionais) - OPCIONAL
  - Mock data para eventos (fallback)

### Database Schema
- **users**: Usuários da equipe editorial
- **news_articles**: Notícias (API + manuais)
- **events**: Eventos (APIs externas + manuais)
- **comments**: Comentários dos leitores
- **newsletter_subscribers**: Inscritos na newsletter

### Design System
- **Cores Principais**:
  - Primary (Rio Blue): 195 85% 45%
  - Secondary (Sunset Orange): 15 90% 55%
  - Cultura (Purple): 280 65% 55%
  - Esportes (Green): 140 60% 45%
  - Shows (Pink): 330 75% 55%
  - Gastronomia (Orange): 25 90% 55%

### APIs e Variáveis de Ambiente
- `DATABASE_URL`: URL do PostgreSQL (auto-configurado)
- `SESSION_SECRET`: Secret para sessions (auto-gerado)
- `NEWSDATA_API_KEY`: Chave da API NewsData.io ✅ **ATIVA - Notícias em tempo real**
- `THESPORTSDB_API_KEY`: Chave da API TheSportsDB (default: "3") ✅ **ATIVA**
- `SYMPLA_API_KEY`: Token s_token do Sympla (OPCIONAL)
- `EVENTBRITE_API_KEY`: OAuth token do Eventbrite (OPCIONAL)
- **RSS Feeds**: 15 portais configurados, 13 funcionando ✅ **ATIVOS - 124+ notícias**
  - Parser nativo: rss-parser (sem rate limits do RSS2JSON) ✨

## Estrutura de Rotas

### API Endpoints

**Autenticação** 🔐
- `POST /api/auth/register` - Registrar novo editor
- `POST /api/auth/login` - Login de editor
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário autenticado

**Notícias**
- `GET /api/news` - Todas as notícias do database (RSS persistidas)
- `GET /api/news/category/:category` - Notícias por categoria do database
- `GET /api/news/search?q=termo` - Busca de notícias
- `GET /api/news/:id` - Artigo específico
- `GET /api/news/rss` - Buscar feeds RSS em tempo real (sem persistir)
- `POST /api/news/sync-rss` - Sincronizar feeds RSS no database ✨
  - Retorna: `{total, saved, message}`
  - Auto-executa ao iniciar servidor
  - UPSERT: atualiza se existe, insere se novo

**Eventos**
- `GET /api/events` - Todos os eventos
- `GET /api/events/category/:category` - Eventos por categoria
- `POST /api/events/sync` - Sincronizar eventos Sympla+Eventbrite

**Esportes**
- `GET /api/sports/matches` - Últimos jogos dos times cariocas
- `GET /api/sports/team/:teamName` - Informações de um time

**Sistema**
- `POST /api/cache/clear` - Limpar cache manualmente
- `GET /api/health` - Diagnóstico e status de todas as APIs

### Frontend Routes
- `/` - Homepage
- `/login` - Login de editores 🔐
- `/register` - Registro de editores 🔐
- `/admin` - Painel administrativo (protegido) 🔐
- `/categoria/:category` - Página de categoria
- `/noticia/:id` - Página de artigo individual
- `*` - 404 Not Found

## Cache Strategy
- Cache em memória para notícias e eventos
- Duração: 2 minutos (otimizado para produção)
- Reduz chamadas às APIs externas
- Melhora performance e respeita rate limits
- Endpoint manual: `POST /api/cache/clear`

## Integrações de Eventos

### Sympla (Brasil) ✅ PRODUCTION-READY
- **Status**: Implementado e funcionando com persistência
- **Token**: Disponível em Minha Conta → Integrações no Sympla
- **Limitação**: Retorna apenas eventos do organizador autenticado
- **Uso**: Ideal se você é organizador ou tem parceria com organizadores
- **Persistência**: Eventos são salvos no PostgreSQL via UPSERT

### Eventbrite (Internacional) ✅ PRODUCTION-READY
- **Status**: Implementado e funcionando com persistência
- **Token**: OAuth token do painel de desenvolvedor
- **Limitação**: Retorna apenas eventos do usuário autenticado
- **Uso**: Ideal se você organiza eventos ou tem parceiros
- **Persistência**: Eventos são salvos no PostgreSQL via UPSERT

### Sincronização e Persistência
- **Endpoint**: `POST /api/events/sync`
- **Retorna**: `{sympla: number, eventbrite: number, total: number, saved: number}`
- **Frequência**: Sob demanda (recomenda-se agendar com cron job)
- **Comportamento**:
  - Busca eventos das APIs Sympla e Eventbrite
  - Persiste no database usando UPSERT (atualiza se existe, insere se novo)
  - Limpa cache de eventos automaticamente
  - Próximas chamadas GET retornam dados frescos do database
- **Fallback**: Usa eventos mock apenas quando database está vazio
- **Database-first**: GET /api/events retorna APENAS dados do database quando existem (zero mocks misturados)

## Características do Design
- **Mobile First**: Design totalmente responsivo
- **Dark Mode**: Suporte completo a tema escuro
- **Acessibilidade**: Uso de data-testid em elementos interativos
- **Performance**: Lazy loading de imagens, cache de API
- **UX**: Loading states, empty states, error handling
- **Visual**: Uso de gradientes, imagens hero, badges coloridos por categoria

## Integrações RSS (15 Feeds de 13 Portais)

### 📡 Parser Nativo (rss-parser)
- **Biblioteca**: rss-parser nativa do Node.js ✨ **NOVO**
- **Vantagens**: Sem rate limits, sem dependência de APIs externas
- **Timeout**: 20 segundos por feed
- **Volume**: 124+ artigos de 13 portais funcionando
- **Fallback de Categoria**: Feeds podem ter categoria manual que é usada quando keywords não detectam categoria específica

### ✅ Feeds Ativos (13 funcionando)
**Geral (7 feeds):**
- **G1 Rio de Janeiro**: Feed RSS completo da região (parcialmente funcionando)
- **O Globo Rio**: Notícias locais do Rio
- **Jornal O Dia**: Cobertura de serviços, segurança pública e dia a dia
- **Diário do Rio**: Foco em cultura, urbanismo e política local
- **Veja Rio**: Cultura, gastronomia, lazer e eventos
- **Gazeta do Povo - Últimas Notícias**: Notícias gerais do Brasil

**Cultura (2 feeds):**
- **Gazeta do Povo - Cultura**: Séries, filmes, documentários, livros
- **O Globo - Cultura**: Artes, cinema, teatro

**Esportes (1 feed):**
- **GloboEsporte**: Futebol brasileiro e carioca

**Shows (1 feed):**
- **Rolling Stone Brasil**: Música, shows, festivais

**Gastronomia (2 feeds):**
- **Veja Rio - Comer & Beber**: Restaurantes, bares, chefs ✅ **ATIVO**
- **G1 - Pop & Arte**: Cultura pop, entretenimento ✅ **NOVO**

### ❌ Feeds Temporariamente Inativos (2)
- **Extra**: Status 404 (feed instável)
- **Omelete**: Status 404 (feed instável)
- **G1 - Turismo e Viagem**: Erro de parsing XML ✨ **NOVO**

### 🤖 Categorização Automática
O sistema detecta automaticamente a categoria de cada notícia baseado em palavras-chave:
- **Cultura**: arte, museu, teatro, cinema, exposição, filmes, séries
- **Esportes**: brasileirão, futebol, campeonato, flamengo x, vasco x, botafogo x
- **Shows**: show de, festival de música, concerto, banda, álbum
- **Gastronomia**: restaurante, comer e beber, culinária, chef, cardápio, vinhos
- **Geral**: demais notícias

### 🔄 Sincronização
- **Automática**: Notícias atualizadas ao iniciar servidor
- **Manual**: Use `POST /api/news/sync-rss` para forçar atualização
- **Consulta**: Use `GET /api/news/rss` para ver apenas notícias RSS em tempo real
- **Volume**: 124+ artigos sincronizados de 13 portais (15 feeds configurados)
- **Timeout**: 20 segundos para feeds mais lentos
- **Parser**: rss-parser nativo (zero rate limits!) ✨
- **Categorização**: Híbrida (keywords prioritárias + fallback para categoria do feed quando sem match)

## Funcionalidades em Desenvolvimento

### ✅ Concluído
- Database PostgreSQL setup com Drizzle ORM
- Integrações Sympla + Eventbrite com persistência completa
  - API clients para ambos os serviços
  - Endpoint de sincronização POST /api/events/sync
  - UPSERT no database (insert/update automático)
  - Cache invalidation após sync
  - Database-first fetch (mocks apenas como fallback)
- **RSS Feeds (15 feeds de 13 portais) com categorização automática e persistência** ✨
  - 13 fontes ativas: G1 Rio, O Globo, O Dia, Diário do Rio, Veja Rio, Gazeta do Povo (2 feeds), GloboEsporte, Rolling Stone, Veja Rio C&B, G1 Pop & Arte, G1 Turismo e Viagem
  - **Parser nativo rss-parser**: Sem rate limits do RSS2JSON ✨ **NOVO**
  - Detecção inteligente de categorias com fallback
  - Integração server-side completa
  - **Persistência PostgreSQL com UPSERT**
  - **Auto-sync ao iniciar servidor** (124+ artigos)
  - **Database-first**: Todas as rotas buscam do database
  - Endpoint manual: POST /api/news/sync-rss
  - Páginas de categoria funcionando corretamente
- **Sistema de Autenticação Completo** 🔐
  - Passport.js + express-session
  - Login com bcryptjs (hash seguro de senhas)
  - Proteção de rotas com middleware requireAuth
  - Páginas de login/registro no frontend
  - Sessões persistentes (7 dias) com HTTP-only cookies
  - Registro público desabilitado (apenas admins criam contas)
  - Script de criação de admin inicial
  - SameSite cookie protection contra CSRF
- **CMS de Notícias (CRUD Completo)** ✨
  - Backend: 4 rotas protegidas (GET/POST/PUT/DELETE /api/admin/news)
  - Validação Zod completa para create/update
  - Storage methods com partial merge updates
  - Draft/publish separation seguro (404 público, visível admin)
  - Frontend: Página /admin com lista de notícias e formulário
  - UI completa: Table, Dialog, Form, Badges coloridos por categoria
  - TanStack Query para mutations e cache invalidation
  - Botões: criar, editar, deletar, toggle draft/publish
  - Proteção de rota com autenticação
  - Apenas artigos manuais (isManual=true) podem ser editados/deletados

### 🚧 Em Progresso
- Sistema de comentários
- Newsletter
- Notificações push
- CMS de Eventos (painel administrativo)

### 📋 Planejado
- Integração com Mapa da Cultura API (Ministério da Cultura)
- PWA (Progressive Web App)
- Paginação de notícias
- Filtros avançados
- Personalização de feed

## Tecnologias
- React 18
- TypeScript
- Express
- Tailwind CSS
- Shadcn UI
- TanStack Query
- Wouter
- Date-fns
- Axios
- Lucide Icons
- rss-parser ✨ **NOVO**
