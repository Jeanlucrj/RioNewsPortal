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
- **Storage**: In-memory cache (10 minutos)
- **APIs Integradas**:
  - NewsData.io (notícias gerais do Brasil/Rio)
  - TheSportsDB (dados esportivos)
  - Mock data para eventos

### Design System
- **Cores Principais**:
  - Primary (Rio Blue): 195 85% 45%
  - Secondary (Sunset Orange): 15 90% 55%
  - Cultura (Purple): 280 65% 55%
  - Esportes (Green): 140 60% 45%
  - Shows (Pink): 330 75% 55%
  - Vida Noturna (Blue): 250 70% 50%

### APIs e Variáveis de Ambiente
- `NEWSDATA_API_KEY`: Chave da API NewsData.io
- `THESPORTSDB_API_KEY`: Chave da API TheSportsDB (default: "3")

## Estrutura de Rotas

### API Endpoints
- `GET /api/news` - Todas as notícias (com cache)
- `GET /api/news/category/:category` - Notícias por categoria
- `GET /api/news/search?q=termo` - Busca de notícias
- `GET /api/news/:id` - Artigo específico
- `GET /api/events` - Todos os eventos
- `GET /api/events/category/:category` - Eventos por categoria
- `GET /api/sports/matches` - Últimos jogos dos times cariocas
- `GET /api/sports/team/:teamName` - Informações de um time

### Frontend Routes
- `/` - Homepage
- `/categoria/:category` - Página de categoria
- `/noticia/:id` - Página de artigo individual
- `*` - 404 Not Found

## Cache Strategy
- Cache em memória para notícias e eventos
- Duração: 10 minutos
- Reduz chamadas às APIs externas
- Melhora performance e respeita rate limits

## Características do Design
- **Mobile First**: Design totalmente responsivo
- **Dark Mode**: Suporte completo a tema escuro
- **Acessibilidade**: Uso de data-testid em elementos interativos
- **Performance**: Lazy loading de imagens, cache de API
- **UX**: Loading states, empty states, error handling
- **Visual**: Uso de gradientes, imagens hero, badges coloridos por categoria

## Próximas Melhorias (Futuras)
- Integração com Sympla/Eventbrite para eventos reais
- Sistema de comentários
- Newsletter
- PWA (Progressive Web App)
- Paginação de notícias
- Filtros avançados
- Personalização de feed
- Notificações push

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
