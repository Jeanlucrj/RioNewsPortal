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
- Cultura: Museus, exposições, teatro, cinema
- Esportes: Flamengo, Fluminense, Vasco, Botafogo, campeonatos
- Shows: Festivais, concertos, música ao vivo
- Vida Noturna: Bares, baladas, eventos noturnos

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
- Toggle de tema (light/dark mode)

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

## Estrutura de Rotas

### API Endpoints
- `GET /api/news` - Todas as notícias (com cache de 2min)
- `GET /api/news/category/:category` - Notícias por categoria
- `GET /api/news/search?q=termo` - Busca de notícias
- `GET /api/news/:id` - Artigo específico
- `GET /api/events` - Todos os eventos
- `GET /api/events/category/:category` - Eventos por categoria
- `POST /api/events/sync` - Sincronizar eventos Sympla+Eventbrite
- `GET /api/sports/matches` - Últimos jogos dos times cariocas
- `GET /api/sports/team/:teamName` - Informações de um time
- `POST /api/cache/clear` - Limpar cache manualmente
- `GET /api/health` - Diagnóstico e status de todas as APIs ✨

### Frontend Routes
- `/` - Homepage
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

## Funcionalidades em Desenvolvimento

### ✅ Concluído
- Database PostgreSQL setup com Drizzle ORM
- Integrações Sympla + Eventbrite com persistência completa
  - API clients para ambos os serviços
  - Endpoint de sincronização POST /api/events/sync
  - UPSERT no database (insert/update automático)
  - Cache invalidation após sync
  - Database-first fetch (mocks apenas como fallback)

### 🚧 Em Progresso
- Sistema de autenticação para equipe editorial
- CMS para gerenciar notícias e eventos
- Sistema de comentários
- Newsletter
- Notificações push

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
