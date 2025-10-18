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
- Cultura: Museus, exposições, teatro, cinema (12 artigos)
- Esportes: Flamengo, Fluminense, Vasco, Botafogo, campeonatos (3 artigos)
- Shows: Festivais, concertos, música ao vivo (2 artigos)
- Vida Noturna: Bares, baladas, eventos noturnos (0 artigos - categorização automática)
- Geral: Notícias variadas do Rio (44 artigos)

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
- **APIs Integradas**:
  - NewsData.io (notícias gerais do Brasil/Rio)
  - TheSportsDB (dados esportivos)
  - **RSS Feeds (6 portais) - Notícias locais categorizadas** ✨
    - G1 Rio, O Globo, O Dia, Extra, Diário do Rio, Veja Rio
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
  - Vida Noturna (Blue): 250 70% 50%

### APIs e Variáveis de Ambiente
- `DATABASE_URL`: URL do PostgreSQL (auto-configurado)
- `SESSION_SECRET`: Secret para sessions (auto-gerado)
- `NEWSDATA_API_KEY`: Chave da API NewsData.io ✅ **ATIVA - Notícias em tempo real**
- `THESPORTSDB_API_KEY`: Chave da API TheSportsDB (default: "3") ✅ **ATIVA**
- `SYMPLA_API_KEY`: Token s_token do Sympla (OPCIONAL)
- `EVENTBRITE_API_KEY`: OAuth token do Eventbrite (OPCIONAL)
- **RSS Feeds**: 6 portais (G1, O Globo, O Dia, Extra, Diário do Rio, Veja Rio) ✅ **ATIVOS - 40+ notícias**

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

## Integrações RSS (8 Feeds de 7 Portais)

### ✅ Feeds Ativos
- **G1 Rio de Janeiro**: Feed RSS completo da região
- **O Globo Rio**: Notícias locais do Rio
- **Jornal O Dia**: Cobertura de serviços, segurança pública e dia a dia
- **Extra**: Notícias populares, serviços e comunidade (feed instável)
- **Diário do Rio**: Foco em cultura, urbanismo e política local
- **Veja Rio**: Cultura, gastronomia, lazer e eventos
- **Gazeta do Povo - Últimas Notícias**: Notícias gerais do Brasil ✨ **NOVO**
- **Gazeta do Povo - Cultura**: Séries, filmes, documentários, livros ✨ **NOVO**

### 🤖 Categorização Automática
O sistema detecta automaticamente a categoria de cada notícia baseado em palavras-chave:
- **Cultura**: arte, museu, teatro, cinema, exposição
- **Esportes**: futebol, flamengo, vasco, botafogo, fluminense
- **Shows**: música, festival, concerto, banda
- **Vida Noturna**: bar, balada, festa, gastronomia
- **Geral**: demais notícias

### 🔄 Sincronização
- **Automática**: Notícias atualizadas ao iniciar servidor
- **Manual**: Use `POST /api/news/sync-rss` para forçar atualização
- **Consulta**: Use `GET /api/news/rss` para ver apenas notícias RSS em tempo real
- **Volume**: 90+ artigos sincronizados de 7 portais (8 feeds) simultaneamente
- **Timeout**: 20 segundos para feeds mais lentos

## Funcionalidades em Desenvolvimento

### ✅ Concluído
- Database PostgreSQL setup com Drizzle ORM
- Integrações Sympla + Eventbrite com persistência completa
  - API clients para ambos os serviços
  - Endpoint de sincronização POST /api/events/sync
  - UPSERT no database (insert/update automático)
  - Cache invalidation após sync
  - Database-first fetch (mocks apenas como fallback)
- **RSS Feeds (8 feeds de 7 portais) com categorização automática e persistência** ✨
  - 7 fontes: G1 Rio, O Globo, O Dia, Extra, Diário do Rio, Veja Rio, Gazeta do Povo (2 feeds)
  - Detecção inteligente de categorias
  - Integração server-side completa
  - **Persistência PostgreSQL com UPSERT**
  - **Auto-sync ao iniciar servidor** (41+ artigos)
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
