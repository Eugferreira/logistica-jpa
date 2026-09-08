-- ================================================================
-- JPA AGRO - SCHEMA DE BANCO DE DADOS SUPABASE / POSTGRESQL
-- ================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE AO REGISTRAR NO AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TABELA PRINCIPAL DE ITENS DE PEDIDO (itens_pedido)
CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_item BIGINT UNIQUE NOT NULL, -- Chave natural do ERP (oculta na interface)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Colunas automáticas (vindas da importação do Excel ERP)
    cod_pedido BIGINT,
    data_venda DATE,
    frete TEXT CHECK (frete IN ('CIF', 'FOB')),
    vendedor TEXT,
    produto TEXT,
    peso_kg INTEGER,
    cliente TEXT,
    cidade TEXT,
    uf TEXT,
    veiculo TEXT,
    data_est_carreg DATE,
    tipo_operacao TEXT,
    preco NUMERIC(12, 3),

    -- Colunas manuais (preenchidas pelos usuários da JPA Agro)
    sugestao_frete NUMERIC(12, 2),
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Frete combinado', 'Carregado', 'Entregue', 'Cancelado')),
    transportador TEXT,
    motorista TEXT,
    frete_combinado NUMERIC(12, 2),
    obs TEXT,

    -- Auditoria
    atualizado_por UUID REFERENCES public.profiles(id),
    atualizado_em TIMESTAMPTZ
);

-- Índice único no cod_item para buscas e validação de duplicidade ultrarrápidas
CREATE UNIQUE INDEX IF NOT EXISTS idx_itens_pedido_cod_item ON public.itens_pedido(cod_item);

-- Trigger para atualizar updated_at automaticamente em qualquer UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_itens_pedido_updated_at ON public.itens_pedido;
CREATE TRIGGER trigger_itens_pedido_updated_at
    BEFORE UPDATE ON public.itens_pedido
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. TABELA DE AUDITORIA DE ALTERAÇÕES MANUAIS (itens_pedido_log)
CREATE TABLE IF NOT EXISTS public.itens_pedido_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.itens_pedido(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.profiles(id),
    campo_alterado TEXT NOT NULL,
    valor_antigo TEXT,
    valor_novo TEXT,
    data TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para gravar auditoria sempre que uma das 6 colunas manuais for alterada
CREATE OR REPLACE FUNCTION public.log_itens_pedido_manual_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- sugestao_frete
    IF (OLD.sugestao_frete IS DISTINCT FROM NEW.sugestao_frete) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'sugestao_frete', OLD.sugestao_frete::text, NEW.sugestao_frete::text);
    END IF;

    -- status
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'status', OLD.status, NEW.status);
    END IF;

    -- transportador
    IF (OLD.transportador IS DISTINCT FROM NEW.transportador) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'transportador', OLD.transportador, NEW.transportador);
    END IF;

    -- motorista
    IF (OLD.motorista IS DISTINCT FROM NEW.motorista) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'motorista', OLD.motorista, NEW.motorista);
    END IF;

    -- frete_combinado
    IF (OLD.frete_combinado IS DISTINCT FROM NEW.frete_combinado) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'frete_combinado', OLD.frete_combinado::text, NEW.frete_combinado::text);
    END IF;

    -- obs
    IF (OLD.obs IS DISTINCT FROM NEW.obs) THEN
        INSERT INTO public.itens_pedido_log(item_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
        VALUES (NEW.id, NEW.atualizado_por, 'obs', OLD.obs, NEW.obs);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_itens_pedido_manual ON public.itens_pedido;
CREATE TRIGGER trigger_log_itens_pedido_manual
    AFTER UPDATE ON public.itens_pedido
    FOR EACH ROW EXECUTE FUNCTION public.log_itens_pedido_manual_changes();

-- 6. TABELA DE PRODUTOS IGNORADOS (FORA DO ESCOPO)
CREATE TABLE IF NOT EXISTS public.produtos_ignorados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sementes (seed) iniciais para produtos ignorados
INSERT INTO public.produtos_ignorados (produto) VALUES
    ('Pacote Mensal (PC + CA + FS + Leite)'),
    ('UREIA 46%'),
    ('04-14-08 +1,0%S'),
    ('10-10-10 Ureia'),
    ('05 - 25 - 25'),
    ('Ureia 43%'),
    ('Nitrato Amônio')
ON CONFLICT (produto) DO NOTHING;

-- 8. FUNÇÃO AUXILIAR PARA CONSULTAR ROLE DO USUÁRIO LOGADO
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    u_role TEXT;
BEGIN
    SELECT role INTO u_role
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN COALESCE(u_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CONFIGURAÇÃO DE RLS (ROW LEVEL SECURITY)

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_ignorados ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "Qualquer usuario autenticado pode ver perfis"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin pode atualizar perfis de outros"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.get_current_user_role() = 'admin' OR auth.uid() = id);

-- POLICIES: itens_pedido
CREATE POLICY "Todos autenticados podem ver itens_pedido"
    ON public.itens_pedido FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins podem inserir novos itens"
    ON public.itens_pedido FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins podem deletar itens"
    ON public.itens_pedido FOR DELETE
    TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- Policy de UPDATE simples (RLS não consegue comparar valores antigos/novos).
CREATE POLICY "Autenticados podem atualizar itens"
    ON public.itens_pedido FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- A regra "usuário comum não altera coluna automática do ERP" é feita por um
-- TRIGGER, onde NEW/OLD existem de fato (em policies de RLS eles são inválidos).
CREATE OR REPLACE FUNCTION public.protege_colunas_automaticas()
RETURNS TRIGGER AS $$
BEGIN
    IF public.get_current_user_role() <> 'admin' THEN
        IF ( NEW.cod_item        IS DISTINCT FROM OLD.cod_item
          OR NEW.cod_pedido      IS DISTINCT FROM OLD.cod_pedido
          OR NEW.data_venda      IS DISTINCT FROM OLD.data_venda
          OR NEW.frete           IS DISTINCT FROM OLD.frete
          OR NEW.vendedor        IS DISTINCT FROM OLD.vendedor
          OR NEW.produto         IS DISTINCT FROM OLD.produto
          OR NEW.peso_kg         IS DISTINCT FROM OLD.peso_kg
          OR NEW.cliente         IS DISTINCT FROM OLD.cliente
          OR NEW.cidade          IS DISTINCT FROM OLD.cidade
          OR NEW.uf              IS DISTINCT FROM OLD.uf
          OR NEW.veiculo         IS DISTINCT FROM OLD.veiculo
          OR NEW.data_est_carreg IS DISTINCT FROM OLD.data_est_carreg
          OR NEW.tipo_operacao   IS DISTINCT FROM OLD.tipo_operacao
          OR NEW.preco           IS DISTINCT FROM OLD.preco ) THEN
            RAISE EXCEPTION 'Usuário comum não pode alterar colunas automáticas do ERP.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protege_colunas ON public.itens_pedido;
CREATE TRIGGER trg_protege_colunas
    BEFORE UPDATE ON public.itens_pedido
    FOR EACH ROW EXECUTE FUNCTION public.protege_colunas_automaticas();

-- POLICIES: itens_pedido_log
CREATE POLICY "Todos autenticados podem ver historico de logs"
    ON public.itens_pedido_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Logs sao inseridos via trigger do sistema"
    ON public.itens_pedido_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- POLICIES: produtos_ignorados
CREATE POLICY "Todos autenticados podem ver produtos ignorados"
    ON public.produtos_ignorados FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin pode gerenciar produtos ignorados"
    ON public.produtos_ignorados FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'admin');