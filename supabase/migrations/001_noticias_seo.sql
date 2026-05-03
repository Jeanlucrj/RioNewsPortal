-- =============================================================================
-- Migration 001: Tabela noticias com campos SEO + Webhook de indexação
-- Projeto: O Diário Carioca (odiariocarioca.com.br)
-- Supabase Project: kctirxnuvxklkkmzxciz
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela noticias
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.noticias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conteúdo principal
  titulo          TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,            -- URL-friendly, ex: "flamengo-vence-fluminense-2025"
  conteudo        TEXT,                            -- Corpo completo em HTML
  meta_description TEXT,                           -- Máx 160 chars para Google

  -- Mídia
  imagem_url      TEXT,

  -- Autoria e relações
  autor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Classificação
  categoria       TEXT NOT NULL DEFAULT 'geral'
                  CHECK (categoria IN (
                    'cultura','esportes','shows','gastronomia',
                    'internacional','geral','vida-noturna'
                  )),
  tags            TEXT[] NOT NULL DEFAULT '{}',

  -- Estado de publicação
  publicado       BOOLEAN NOT NULL DEFAULT false,
  indexado_google BOOLEAN NOT NULL DEFAULT false,  -- Atualizado pela Edge Function

  -- Timestamps
  publicado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_noticias_slug        ON public.noticias (slug);
CREATE INDEX IF NOT EXISTS idx_noticias_publicado   ON public.noticias (publicado, publicado_em DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_categoria   ON public.noticias (categoria, publicado_em DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_autor       ON public.noticias (autor_id);

-- Atualiza atualizado_em automaticamente em UPDATE
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_noticias_atualizado_em ON public.noticias;
CREATE TRIGGER trg_noticias_atualizado_em
  BEFORE UPDATE ON public.noticias
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas de noticias publicadas
CREATE POLICY "noticias_select_public"
  ON public.noticias FOR SELECT
  USING (publicado = true);

-- Autenticados (editores/admins) podem ver tudo
CREATE POLICY "noticias_select_auth"
  ON public.noticias FOR SELECT
  TO authenticated
  USING (true);

-- Somente autenticados podem inserir/atualizar/deletar
CREATE POLICY "noticias_insert_auth"
  ON public.noticias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "noticias_update_auth"
  ON public.noticias FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "noticias_delete_auth"
  ON public.noticias FOR DELETE
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 3. Extensão pg_net (necessária para chamadas HTTP do Postgres)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- 4. Função de trigger: chama a Edge Function index-news via pg_net
--
--    Pré-requisito: configure a chave no banco com:
--
--      ALTER DATABASE postgres
--        SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIs...';
--
--    Você encontra essa chave em:
--    Supabase Dashboard → Project Settings → API → service_role key
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_index_news()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _edge_url  TEXT := 'https://kctirxnuvxklkkmzxciz.supabase.co/functions/v1/index-news';
  _svc_key   TEXT;
  _body      JSONB;
BEGIN
  -- Só indexa se a notícia for publicada
  IF NEW.publicado IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _svc_key := current_setting('app.settings.service_role_key', true);

  IF _svc_key IS NULL OR _svc_key = '' THEN
    RAISE WARNING '[index-news] app.settings.service_role_key não configurado — indexação ignorada para slug: %', NEW.slug;
    RETURN NEW;
  END IF;

  _body := jsonb_build_object(
    'slug',       NEW.slug,
    'titulo',     NEW.titulo,
    'categoria',  NEW.categoria,
    'type',       'URL_UPDATED'
  );

  PERFORM net.http_post(
    url     := _edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _svc_key
    ),
    body    := _body::text
  );

  RETURN NEW;
END;
$$;

-- Trigger para INSERT de notícias publicadas
DROP TRIGGER IF EXISTS trg_index_news_insert ON public.noticias;
CREATE TRIGGER trg_index_news_insert
  AFTER INSERT ON public.noticias
  FOR EACH ROW
  WHEN (NEW.publicado = true)
  EXECUTE FUNCTION public.trigger_index_news();

-- Trigger para UPDATE: quando publicado muda de false → true
DROP TRIGGER IF EXISTS trg_index_news_publish ON public.noticias;
CREATE TRIGGER trg_index_news_publish
  AFTER UPDATE ON public.noticias
  FOR EACH ROW
  WHEN (OLD.publicado = false AND NEW.publicado = true)
  EXECUTE FUNCTION public.trigger_index_news();

-- ---------------------------------------------------------------------------
-- 5. Como aplicar esta migration
--
--    Via Supabase CLI:
--      supabase db push
--
--    Via SQL Editor no Dashboard:
--      Cole e execute este arquivo inteiro.
--
--    Após aplicar, configure a service_role_key no banco:
--      ALTER DATABASE postgres
--        SET app.settings.service_role_key = '<sua-service-role-key>';
--
--    E configure os secrets da Edge Function:
--      supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
-- ---------------------------------------------------------------------------
