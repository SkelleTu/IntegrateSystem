-- Initial Neon PostgreSQL schema generated from shared/pg-schema.ts.
-- Apply only to an empty database; additive objects use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public."aura_sessions" (
  "sid" TEXT PRIMARY KEY,
  "sess" TEXT NOT NULL,
  "expire" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "aura_sessions_expire_idx" ON public."aura_sessions" ("expire");

CREATE TABLE IF NOT EXISTS public."runtime_events" (
  "id" SERIAL PRIMARY KEY,
  "sequence" INTEGER NOT NULL,
  "session_id" TEXT NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "process" TEXT NOT NULL DEFAULT 'server',
  "pid" INTEGER,
  "event" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "trace_id" TEXT,
  "request_id" TEXT,
  "source" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "data" TEXT
);

CREATE TABLE IF NOT EXISTS public."user_sessions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'barber',
  "fingerprint_id" TEXT UNIQUE,
  "enterprise_id" INTEGER
);

CREATE TABLE IF NOT EXISTS public."services" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "image_url" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public."tickets" (
  "id" SERIAL PRIMARY KEY,
  "ticket_number" INTEGER NOT NULL,
  "service_id" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "items" TEXT,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."queue_state" (
  "id" SERIAL PRIMARY KEY,
  "current_number" INTEGER NOT NULL DEFAULT 0,
  "serving_number" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."menu_items" (
  "id" SERIAL PRIMARY KEY,
  "category_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "image_url" TEXT NOT NULL,
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "barcode" TEXT,
  "codigo_produto" TEXT,
  "tags" TEXT,
  "ncm" TEXT,
  "cfop" TEXT,
  "icms_origem" INTEGER DEFAULT 0,
  "icms_st" TEXT,
  "unit_type" TEXT NOT NULL DEFAULT 'unit',
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "image_scale" INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public."cash_register" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "opened_at" TIMESTAMP,
  "closed_at" TIMESTAMP,
  "opening_amount" INTEGER,
  "closing_amount" INTEGER,
  "difference" INTEGER,
  "status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public."sales" (
  "id" SERIAL PRIMARY KEY,
  "cash_register_id" INTEGER,
  "user_id" INTEGER,
  "total_amount" INTEGER NOT NULL,
  "customer_tax_id" TEXT,
  "customer_name" TEXT,
  "customer_email" TEXT,
  "customer_address" TEXT,
  "customer_city" TEXT,
  "customer_state" TEXT,
  "customer_zip" TEXT,
  "fiscal_status" TEXT NOT NULL DEFAULT 'pending',
  "fiscal_key" TEXT,
  "fiscal_xml" TEXT,
  "fiscal_error" TEXT,
  "fiscal_type" TEXT DEFAULT 'NFCe',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."sale_items" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL,
  "item_type" TEXT NOT NULL,
  "item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" INTEGER NOT NULL,
  "total_price" INTEGER NOT NULL,
  "unit_type" TEXT NOT NULL DEFAULT 'unit'
);

CREATE TABLE IF NOT EXISTS public."payments" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."transactions" (
  "id" SERIAL PRIMARY KEY,
  "business_type" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."time_clock" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "fingerprint_id" TEXT,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."enterprises" (
  "id" SERIAL PRIMARY KEY,
  "owner_id" INTEGER,
  "name" TEXT NOT NULL,
  "business_type" TEXT DEFAULT 'barbearia',
  "tax_id" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "address_proof_url" TEXT,
  "rg_front_url" TEXT,
  "rg_back_url" TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."settings" (
  "id" SERIAL PRIMARY KEY,
  "enterprise_id" INTEGER,
  "site_name" TEXT NOT NULL DEFAULT 'Padaria',
  "logo_url" TEXT DEFAULT '',
  "primary_color" TEXT NOT NULL DEFAULT '#00FF66',
  "secondary_color" TEXT NOT NULL DEFAULT '#10b981',
  "accent_color" TEXT NOT NULL DEFAULT '#00FF66',
  "background_color" TEXT NOT NULL DEFAULT '#0a0a0b',
  "bg_image_url" TEXT DEFAULT '',
  "border_radius" TEXT NOT NULL DEFAULT '1rem',
  "glass_opacity" TEXT NOT NULL DEFAULT '0.1'
);

CREATE TABLE IF NOT EXISTS public."inventory" (
  "id" SERIAL PRIMARY KEY,
  "item_id" INTEGER,
  "item_type" TEXT NOT NULL,
  "custom_name" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "items_per_unit" INTEGER NOT NULL DEFAULT 1,
  "cost_price" INTEGER NOT NULL DEFAULT 0,
  "sale_price" INTEGER,
  "barcode" TEXT,
  "codigo_balanca" TEXT,
  "expiry_date" TIMESTAMP,
  "min_stock" INTEGER NOT NULL DEFAULT 5,
  "image_url" TEXT,
  "rotation" INTEGER NOT NULL DEFAULT 0,
  "image_scale" INTEGER NOT NULL DEFAULT 100,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."inventory_logs" (
  "id" SERIAL PRIMARY KEY,
  "inventory_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."inventory_restocks" (
  "id" SERIAL PRIMARY KEY,
  "inventory_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "items_per_unit" INTEGER NOT NULL DEFAULT 1,
  "cost_price" INTEGER NOT NULL DEFAULT 0,
  "expiry_date" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."products" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "category" TEXT,
  "flavor" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'Unidade',
  "weight" TEXT,
  "description" TEXT,
  "image_url" TEXT,
  "min_stock" INTEGER NOT NULL DEFAULT 5,
  "sale_price" INTEGER,
  "em_liquidacao" BOOLEAN DEFAULT false,
  "ncm" TEXT,
  "cfop" TEXT,
  "codigo_balanca" TEXT,
  "codigo_produto" TEXT,
  "created_at" TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."batches" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL,
  "sku" TEXT,
  "variant_name" TEXT,
  "barcode" TEXT,
  "batch_number" TEXT,
  "supplier_code" TEXT,
  "supplier" TEXT,
  "manufacture_date" TIMESTAMP,
  "expiry_date" TIMESTAMP,
  "entry_date" TIMESTAMP NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "cost_price" INTEGER NOT NULL DEFAULT 0,
  "sale_price" INTEGER,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."batch_logs" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL,
  "batch_id" INTEGER,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."stock_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "created_at" TIMESTAMP NOT NULL,
  "created_by" TEXT NOT NULL,
  "products_json" TEXT NOT NULL,
  "batches_json" TEXT NOT NULL,
  "product_count" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public."fiscal_settings" (
  "id" SERIAL PRIMARY KEY,
  "enterprise_id" INTEGER NOT NULL,
  "razao_social" TEXT NOT NULL,
  "nome_fantasia" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "inscricao_estadual" TEXT NOT NULL,
  "logradouro" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "bairro" TEXT NOT NULL,
  "municipio" TEXT NOT NULL,
  "codigo_ibge" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "cep" TEXT NOT NULL,
  "regime_tributario" TEXT NOT NULL,
  "csc_token" TEXT,
  "csc_id" TEXT,
  "serie_nfce" INTEGER NOT NULL DEFAULT 1,
  "ultimo_numero_nfce" INTEGER NOT NULL DEFAULT 0,
  "ambiente" TEXT NOT NULL DEFAULT 'homologacao',
  "simulacao_real" BOOLEAN NOT NULL DEFAULT false,
  "certificado_a1" TEXT,
  "certificado_senha" TEXT,
  "printer_width" TEXT NOT NULL DEFAULT '58mm'
);

CREATE TABLE IF NOT EXISTS public."nfce" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL,
  "numero" INTEGER NOT NULL,
  "serie" INTEGER NOT NULL,
  "chave_acesso" TEXT NOT NULL,
  "xml_enviado" TEXT,
  "xml_autorizado" TEXT,
  "protocolo" TEXT,
  "status" TEXT NOT NULL,
  "motivo" TEXT,
  "data_emissao" TIMESTAMP NOT NULL,
  "valor_total" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stock_snapshots (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  created_by TEXT NOT NULL,
  products_json TEXT NOT NULL,
  batches_json TEXT NOT NULL,
  product_count INTEGER NOT NULL
);
