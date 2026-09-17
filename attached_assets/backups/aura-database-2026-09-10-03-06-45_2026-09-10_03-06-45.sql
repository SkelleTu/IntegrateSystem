-- Aura System SQL Backup
-- ExportedAt: 2026-09-10T03:06:47.706Z
-- Tables: 25
-- Rows: 91
-- Format: Aura-SQL-1
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE batch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    batch_id INTEGER,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (1, 1, 1, 'in', 2, 'Entrada de lote', 1, 1785548237);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (2, 1, 2, 'in', 2, 'Entrada de lote', 1, 1785548377);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (3, 1, 3, 'in', 1, 'Entrada de lote', 1, 1785548618);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (4, 1, 4, 'in', 2, 'Entrada de lote', 1, 1785548682);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (5, 2, 5, 'in', 1, 'Entrada de lote', 1, 1785549137);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (6, 2, 6, 'in', 1, 'Entrada de lote', 1, 1785549281);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (7, 3, 7, 'in', 1, 'Entrada de lote', 1, 1785549724);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (8, 3, 8, 'in', 2, 'Entrada de lote', 1, 1785550332);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (9, 3, 9, 'in', 1, 'Entrada de lote', 1, 1785550542);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (10, 3, 10, 'in', 1, 'Entrada de lote', 1, 1785550750);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (11, 4, 11, 'in', 2, 'Entrada de lote', 1, 1785551277);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (12, 4, 12, 'in', 1, 'Entrada de lote', 1, 1785551435);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (13, 4, 13, 'in', 1, 'Entrada de lote', 1, 1785551500);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (14, 5, 14, 'in', 1, 'Entrada de lote', 1, 1785551791);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (15, 5, 15, 'in', 2, 'Entrada de lote', 1, 1785552008);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (16, 6, 16, 'in', 2, 'Entrada de lote', 1, 1785552230);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (17, 7, 17, 'in', 1, 'Entrada de lote', 1, 1785552550);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (18, 7, 18, 'in', 1, 'Entrada de lote', 1, 1785554246);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (19, 8, 19, 'in', 1, 'Entrada de lote', 1, 1785554471);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (20, 8, 20, 'in', 1, 'Entrada de lote', 1, 1785554599);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (21, 8, 21, 'in', 1, 'Entrada de lote', 1, 1785554719);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (22, 8, 22, 'in', 1, 'Entrada de lote', 1, 1785554827);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (23, 9, 23, 'in', 2, 'Entrada de lote', 1, 1785555143);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (24, 11, 24, 'in', 3, 'Entrada de lote', 1, 1785555383);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (25, 11, 25, 'in', 1, 'Entrada de lote', 1, 1785555672);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (26, 15, 26, 'in', 2, 'Entrada de lote', 1, 1785555900);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (27, 15, 27, 'in', 3, 'Entrada de lote', 1, 1785556027);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (28, 2, 28, 'in', 1, 'Entrada de lote', 1, 1785556272);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (29, 1, 1, 'out', 5, 'Venda #1', 1, 1786308868);
INSERT INTO "batch_logs" ("id", "product_id", "batch_id", "type", "quantity", "reason", "user_id", "created_at") VALUES (30, 1, 1, 'cancel', 5, 'Estorno Venda Cancelada #1', 1, 1786309411);
CREATE TABLE batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    barcode TEXT,
    supplier_code TEXT,
    batch_number TEXT,
    manufacture_date INTEGER,
    expiry_date INTEGER,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price INTEGER NOT NULL DEFAULT 0,
    supplier TEXT,
    entry_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  , sku TEXT, variant_name TEXT, sale_price INTEGER);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (1, 1, '7896075301202', '', '', NULL, NULL, 35, 899, '', 1785456000, 1785548237, '30', 'Primavera 12 Rolos', 1399);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (2, 1, '7899853806647', '', '', NULL, NULL, 0, 1190, '', 1785456000, 1785548377, '31', 'Flor de Lavanda 12 Rolos', 1650);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (3, 1, '7899853806128', '', '', NULL, NULL, 0, 1295, '', 1785456000, 1785548618, '32', 'Top One 12 Rolos', 1550);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (4, 1, '7899853806630', '', '', NULL, NULL, 0, 699, '', 1785456000, 1785548682, '33', 'Flor de Lavanda 4 Rolos', 850);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (5, 2, '7896056406551', '', '', NULL, NULL, 0, 1090, '', 1785456000, 1785549137, '35', 'Amaciante Urca 3L', 1290);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (6, 2, '7896527700638', '', '', NULL, NULL, 0, 664, '', 1785456000, 1785549281, '36', 'Amaciante Triex 2L', 870);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (7, 3, '7896013105695', '', '', NULL, 1797465600, 0, 1059, '', 1785456000, 1785549724, '37', 'Olimpo 5L', 1380);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (8, 3, '7896219700038', '', '', NULL, NULL, 0, 350, '', 1785456000, 1785550332, '38', 'Daclor 2L', 499);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (9, 3, '7896524726457', '', '', NULL, NULL, 0, 290, '', 1785456000, 1785550542, '39', 'Suprema 1L', 330);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (10, 3, '7896098904671', '', '', NULL, NULL, 0, 339, '', 1785456000, 1785550750, '40', 'Ypê 1L', 440);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (11, 4, '7896098900222', '', '', NULL, NULL, 0, 239, '', 1785456000, 1785551277, '41', 'Ypê Limão 500ml', 300);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (12, 4, '7896105510789', '', '', NULL, NULL, 0, 179, '', 1785456000, 1785551435, '42', 'Bulnez Neutro 500ml', 289);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (13, 4, '7896105510802', '', '', NULL, NULL, 0, 179, '', 1785456000, 1785551500, '43', 'Bulnez Clear 500ml', 289);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (14, 5, '7896527700379', '', '', NULL, NULL, 0, 649, '', 1785456000, 1785551791, '44', 'Triex Flores da Primavera 2L', 850);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (15, 5, '7891242457041', '', '', NULL, NULL, 0, 399, '', 1785456000, 1785552008, '45', 'Uau Lavanda e Conforto 500ml', 499);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (16, 6, '7891242451551', '', '', NULL, NULL, 0, 399, '', 1785456000, 1785552230, '46', 'Multiuso Uau Flores e Folhas 500ml', 520);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (17, 7, '7896527700607', '', '', NULL, NULL, 0, 399, '', 1785456000, 1785552550, '47', 'Triex índigo 500ml', 550);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (18, 7, '7896527700614', '', '', NULL, NULL, 0, 399, '', 1785542400, 1785554246, '48', 'Triex Fresh 500ml', 550);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (19, 8, '7898662113687', '', '', NULL, NULL, 0, 2500, '', 1785542400, 1785554471, '49', 'Louê Essências Pome e Vanilla 500ml', 2900);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (20, 8, '7898662113526', '', '', NULL, NULL, 0, 1200, '', 1785542400, 1785554599, '50', 'Louê Essências Ameixa Dourada 120ml', 1400);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (21, 8, '7898662110167', '', '', NULL, NULL, 0, 2000, '', 1785542400, 1785554719, '51', 'Louê Essências Dif. Citronela 300ml', 2300);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (22, 8, '7898662110235', '', '', NULL, NULL, 0, 2000, '', 1785542400, 1785554827, '52', 'Louê Essências Dif. Frutas Vermelhas 300ml', 2300);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (23, 9, '7898917671153', '', '', NULL, NULL, 0, 799, '', 1785542400, 1785555143, '53', 'Álcool Tupi 46,2 1L', 989);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (24, 11, '7891150108622', '', '', NULL, NULL, 0, 899, '', 1785542400, 1785555383, '54', 'Sabão em Pó Omo Tradic. 700g', 1550);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (25, 11, '7896098909744', '', '', NULL, NULL, 0, 949, '', 1785542400, 1785555672, '55', 'Sabão em Pó Tixan Ypê Primavera', 1280);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (26, 15, '7908324403978', '', '', NULL, NULL, 0, 749, '', 1785542400, 1785555900, '56', 'Sabão em Pedra Assim Neutro 800g', 850);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (27, 15, '', '', '', NULL, NULL, 0, 0, '', 1785542400, 1785556027, '57', 'Sabão de Soda Caseiro', 175);
INSERT INTO "batches" ("id", "product_id", "barcode", "supplier_code", "batch_number", "manufacture_date", "expiry_date", "quantity", "cost_price", "supplier", "entry_date", "created_at", "sku", "variant_name", "sale_price") VALUES (28, 2, '7500435251259', '', '', NULL, NULL, 0, 1290, '', 1785542400, 1785556272, '58', 'Amaciante Downy brisa intenso 750ml', 1890);
CREATE TABLE `cash_register` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`opened_at` integer,
	`closed_at` integer,
	`opening_amount` integer,
	`closing_amount` integer,
	`difference` integer,
	`status` text NOT NULL
);
INSERT INTO "cash_register" ("id", "user_id", "opened_at", "closed_at", "opening_amount", "closing_amount", "difference", "status") VALUES (1, 1, 1786308560, NULL, 52790, NULL, NULL, 'open');
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL
);
CREATE TABLE data_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    size INTEGER NOT NULL,
    tables_count INTEGER NOT NULL,
    rows_count INTEGER NOT NULL,
    filepath TEXT NOT NULL
  );
CREATE TABLE `enterprises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`email` text,
	`phone` text,
	`address` text,
	`address_proof_url` text,
	`rg_front_url` text,
	`rg_back_url` text,
	`slug` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
, owner_id INTEGER, business_type TEXT DEFAULT 'barbearia', city TEXT, state TEXT);
INSERT INTO "enterprises" ("id", "name", "tax_id", "email", "phone", "address", "address_proof_url", "rg_front_url", "rg_back_url", "slug", "status", "created_at", "owner_id", "business_type", "city", "state") VALUES (1, 'Padaria e Mercearia Orquídeas', '68.146.304/0001-03', NULL, '(19) 99979-5245', 'Rua Emerson Luiz de Carvalho, nº 158 Conjunto Residencial Prefeito Professor Jair Della Colleta', NULL, NULL, NULL, 'padaria-e-mercearia-orquideas', 'active', 1785547277, 1, 'outro', 'Araras', 'SP');
CREATE TABLE `fiscal_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enterprise_id` integer NOT NULL,
	`razao_social` text NOT NULL,
	`nome_fantasia` text NOT NULL,
	`cnpj` text NOT NULL,
	`inscricao_estadual` text NOT NULL,
	`logradouro` text NOT NULL,
	`numero` text NOT NULL,
	`bairro` text NOT NULL,
	`municipio` text NOT NULL,
	`codigo_ibge` text NOT NULL,
	`uf` text NOT NULL,
	`cep` text NOT NULL,
	`regime_tributario` text NOT NULL,
	`csc_token` text,
	`csc_id` text,
	`serie_nfce` integer DEFAULT 1 NOT NULL,
	`ambiente` text DEFAULT 'homologacao' NOT NULL,
	`certificado_a1` text,
	`certificado_senha` text,
	`printer_width` text DEFAULT '58mm' NOT NULL
, ultimo_numero_nfce INTEGER DEFAULT 0, simulacao_real INTEGER DEFAULT 0);
INSERT INTO "fiscal_settings" ("id", "enterprise_id", "razao_social", "nome_fantasia", "cnpj", "inscricao_estadual", "logradouro", "numero", "bairro", "municipio", "codigo_ibge", "uf", "cep", "regime_tributario", "csc_token", "csc_id", "serie_nfce", "ambiente", "certificado_a1", "certificado_senha", "printer_width", "ultimo_numero_nfce", "simulacao_real") VALUES (1, 1, '68.146.304 ELISANGELA ROSSINI ANDRADE TANGERINO', 'Padaria e Mercearia Orquídeas', '68.146.304/0001-03', 'ISENTO', 'Rua Emerson Luiz de Carvalho', '158', 'Conjunto Residencial Prefeito Professor Jair Della Colleta', 'Araras', '3503307', 'SP', '13606-864', '1', NULL, NULL, 1, 'homologacao', NULL, NULL, '58mm', 1, 0);
CREATE TABLE "inventory" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer,
	`item_type` text NOT NULL,
	`custom_name` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`items_per_unit` integer DEFAULT 1 NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`sale_price` integer,
	`expiry_date` integer,
	`min_stock` integer DEFAULT 5 NOT NULL,
	`updated_at` integer NOT NULL
, `barcode` text, `image_url` text, codigo_balanca TEXT, rotation INTEGER DEFAULT 0, image_scale INTEGER DEFAULT 100);
CREATE TABLE `inventory_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL
);
CREATE TABLE `inventory_restocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text NOT NULL,
	`items_per_unit` integer DEFAULT 1 NOT NULL,
	`cost_price` integer DEFAULT 0 NOT NULL,
	`expiry_date` integer,
	`created_at` integer NOT NULL
);
CREATE TABLE `menu_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`image_url` text NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`tags` text
, `barcode` text, ncm TEXT, cfop TEXT, icms_origem INTEGER DEFAULT 0, icms_st TEXT, unit_type TEXT DEFAULT 'unit', rotation INTEGER DEFAULT 0, image_scale INTEGER DEFAULT 100, codigo_produto TEXT);
CREATE TABLE nfce (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    chave_acesso TEXT NOT NULL,
    xml_enviado TEXT,
    xml_autorizado TEXT,
    protocolo TEXT,
    status TEXT NOT NULL,
    motivo TEXT,
    data_emissao INTEGER NOT NULL,
    valor_total INTEGER NOT NULL
  );
INSERT INTO "nfce" ("id", "sale_id", "numero", "serie", "chave_acesso", "xml_enviado", "xml_autorizado", "protocolo", "status", "motivo", "data_emissao", "valor_total") VALUES (1, 1, 1, 1, '35260868146304000103650010000000011274752588', '<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe35260868146304000103650010000000011274752588" versao="4.00"><ide><cUF>35</cUF><cNF>27475258</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>65</mod><serie>1</serie><nNF>1</nNF><dhEmi>2026-08-09T20:50:32-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3503307</cMunFG><tpImp>4</tpImp><tpEmis>1</tpEmis><cDV>8</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>1.0.0</verProc></ide><emit><CNPJ>68146304000103</CNPJ><xNome>68.146.304 ELISANGELA ROSSINI ANDRADE TANGERINO</xNome><xFant>Padaria e Mercearia Orquídeas</xFant><enderEmit><xLgr>Rua Emerson Luiz de Carvalho</xLgr><nro>158</nro><xBairro>Conjunto Residencial Prefeito Professor Jair Della Colleta</xBairro><cMun>3503307</cMun><xMun>Araras</xMun><UF>SP</UF><CEP>13606864</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE/><CRT>1</CRT></emit><det nItem="1"><prod><cProd>500001</cProd><cEAN>SEM GTIN</cEAN><xProd>Produto 500001</xProd><NCM>00000000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>5.0000</qCom><vUnCom>13.9900000000</vUnCom><vProd>69.95</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>5.0000</qTrib><vUnTrib>13.9900000000</vUnTrib><indTot>1</indTot></prod><imposto><vTotTrib>0.00</vTotTrib><ICMS><ICMSSN102><orig>0</orig><CSOSN>400</CSOSN></ICMSSN102></ICMS><PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>69.95</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>69.95</vNF><vTotTrib>0.00</vTotTrib></ICMSTot></total><transp><modFrete>9</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>69.95</vPag></detPag></pag><infAdic><infCpl>Voce pagou aprox. R$ 9.41 de trib. federais, R$ 8.39 de trib. estaduais e R$ 0,00 de trib. municipais conforme Lei Federal 12.741/2012.</infCpl></infAdic></infNFe></NFe>', '<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe35260868146304000103650010000000011274752588" versao="4.00"><ide><cUF>35</cUF><cNF>27475258</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>65</mod><serie>1</serie><nNF>1</nNF><dhEmi>2026-08-09T20:50:32-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3503307</cMunFG><tpImp>4</tpImp><tpEmis>1</tpEmis><cDV>8</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>1.0.0</verProc></ide><emit><CNPJ>68146304000103</CNPJ><xNome>68.146.304 ELISANGELA ROSSINI ANDRADE TANGERINO</xNome><xFant>Padaria e Mercearia Orquídeas</xFant><enderEmit><xLgr>Rua Emerson Luiz de Carvalho</xLgr><nro>158</nro><xBairro>Conjunto Residencial Prefeito Professor Jair Della Colleta</xBairro><cMun>3503307</cMun><xMun>Araras</xMun><UF>SP</UF><CEP>13606864</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE/><CRT>1</CRT></emit><det nItem="1"><prod><cProd>500001</cProd><cEAN>SEM GTIN</cEAN><xProd>Produto 500001</xProd><NCM>00000000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>5.0000</qCom><vUnCom>13.9900000000</vUnCom><vProd>69.95</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>5.0000</qTrib><vUnTrib>13.9900000000</vUnTrib><indTot>1</indTot></prod><imposto><vTotTrib>0.00</vTotTrib><ICMS><ICMSSN102><orig>0</orig><CSOSN>400</CSOSN></ICMSSN102></ICMS><PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>69.95</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>69.95</vNF><vTotTrib>0.00</vTotTrib></ICMSTot></total><transp><modFrete>9</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>69.95</vPag></detPag></pag><infAdic><infCpl>Voce pagou aprox. R$ 9.41 de trib. federais, R$ 8.39 de trib. estaduais e R$ 0,00 de trib. municipais conforme Lei Federal 12.741/2012.</infCpl></infAdic></infNFe></NFe>', 'SIM43716562', 'simulated', NULL, 1786308632, 6995);
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL
);
INSERT INTO "payments" ("id", "sale_id", "method", "amount", "created_at") VALUES (1, 1, 'cash', 6995, 1786308630);
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    flavor TEXT,
    unit TEXT NOT NULL DEFAULT 'Unidade',
    weight TEXT,
    description TEXT,
    image_url TEXT,
    min_stock INTEGER NOT NULL DEFAULT 5,
    sale_price INTEGER,
    ncm TEXT,
    cfop TEXT,
    codigo_balanca TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  , codigo_produto TEXT, em_liquidacao INTEGER NOT NULL DEFAULT 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (1, 'Papel Higiênico', '', 'Higiene Pessoal', '', 'Unidade', '', '', NULL, 5, 1399, '48181000', '5102', '', 1785548237, 1785549357, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (2, 'Amaciantes', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 890, '38099110', '5102', '', 1785549137, 1785550952, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (3, 'Água Sanitária', '', 'Limpeza', '', 'Unidade', '', '', NULL, 2, 1380, '28289011', '5102', '', 1785549724, 1785550092, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (4, 'Detergente', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 300, '34022000', '5102', '', 1785551277, 1785551277, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (5, 'Desinfetante', '', 'Limpeza', '', 'Unidade', '', '', NULL, 5, 850, '38089419', '5102', '', 1785551791, 1785551791, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (6, 'Multiuso', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 520, '34029000', '5102', '', 1785552230, 1785552230, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (7, 'Triex', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 550, '34029000', '5102', '', 1785552550, 1785604863, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (8, 'Odorizante de Ambiente', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 2900, '33074100', '5102', '', 1785554471, 1785554471, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (9, 'Álcool', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 989, '22072010', '5102', '', 1785555143, 1785555143, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (11, 'Sabão em Pó', '', 'Limpeza', '', 'Unidade', '', '', NULL, 1, 1550, '34021110', '5102', '', 1785555383, 1785555383, '', 0);
INSERT INTO "products" ("id", "name", "brand", "category", "flavor", "unit", "weight", "description", "image_url", "min_stock", "sale_price", "ncm", "cfop", "codigo_balanca", "created_at", "updated_at", "codigo_produto", "em_liquidacao") VALUES (15, 'Sabão em Pedra', '', 'Limpeza', '', 'Unidade', '', '', NULL, 5, NULL, '34011190', '5102', '', 1785555900, 1785555900, '', 0);
CREATE TABLE `queue_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`current_number` integer DEFAULT 0 NOT NULL,
	`serving_number` integer DEFAULT 0 NOT NULL
);
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL
, unit_type TEXT DEFAULT 'unit');
INSERT INTO "sale_items" ("id", "sale_id", "item_type", "item_id", "quantity", "unit_price", "total_price", "unit_type") VALUES (1, 1, 'product', 500001, 5, 1399, 6995, 'unit');
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cash_register_id` integer,
	`user_id` integer,
	`total_amount` integer NOT NULL,
	`customer_tax_id` text,
	`customer_name` text,
	`customer_email` text,
	`customer_address` text,
	`customer_city` text,
	`customer_state` text,
	`customer_zip` text,
	`fiscal_status` text DEFAULT 'pending' NOT NULL,
	`fiscal_key` text,
	`fiscal_xml` text,
	`fiscal_error` text,
	`fiscal_type` text DEFAULT 'NFCe',
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer NOT NULL
);
INSERT INTO "sales" ("id", "cash_register_id", "user_id", "total_amount", "customer_tax_id", "customer_name", "customer_email", "customer_address", "customer_city", "customer_state", "customer_zip", "fiscal_status", "fiscal_key", "fiscal_xml", "fiscal_error", "fiscal_type", "status", "created_at") VALUES (1, 1, 1, 6995, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'simulated', '35260868146304000103650010000000011274752588', '<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe35260868146304000103650010000000011274752588" versao="4.00"><ide><cUF>35</cUF><cNF>27475258</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>65</mod><serie>1</serie><nNF>1</nNF><dhEmi>2026-08-09T20:50:32-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3503307</cMunFG><tpImp>4</tpImp><tpEmis>1</tpEmis><cDV>8</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>1.0.0</verProc></ide><emit><CNPJ>68146304000103</CNPJ><xNome>68.146.304 ELISANGELA ROSSINI ANDRADE TANGERINO</xNome><xFant>Padaria e Mercearia Orquídeas</xFant><enderEmit><xLgr>Rua Emerson Luiz de Carvalho</xLgr><nro>158</nro><xBairro>Conjunto Residencial Prefeito Professor Jair Della Colleta</xBairro><cMun>3503307</cMun><xMun>Araras</xMun><UF>SP</UF><CEP>13606864</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE/><CRT>1</CRT></emit><det nItem="1"><prod><cProd>500001</cProd><cEAN>SEM GTIN</cEAN><xProd>Produto 500001</xProd><NCM>00000000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>5.0000</qCom><vUnCom>13.9900000000</vUnCom><vProd>69.95</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>5.0000</qTrib><vUnTrib>13.9900000000</vUnTrib><indTot>1</indTot></prod><imposto><vTotTrib>0.00</vTotTrib><ICMS><ICMSSN102><orig>0</orig><CSOSN>400</CSOSN></ICMSSN102></ICMS><PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>69.95</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>69.95</vNF><vTotTrib>0.00</vTotTrib></ICMSTot></total><transp><modFrete>9</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>69.95</vPag></detPag></pag><infAdic><infCpl>Voce pagou aprox. R$ 9.41 de trib. federais, R$ 8.39 de trib. estaduais e R$ 0,00 de trib. municipais conforme Lei Federal 12.741/2012.</infCpl></infAdic></infNFe></NFe>', NULL, 'NFCe', 'cancelled', 1786308630);
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`image_url` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
CREATE TABLE "settings" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enterprise_id` integer,
	`site_name` text DEFAULT 'Padaria' NOT NULL,
	`logo_url` text DEFAULT '',
	`primary_color` text DEFAULT '#00FF66' NOT NULL,
	`secondary_color` text DEFAULT '#10b981' NOT NULL,
	`accent_color` text DEFAULT '#00FF66' NOT NULL,
	`background_color` text DEFAULT '#0a0a0b' NOT NULL,
	`bg_image_url` text DEFAULT '',
	`border_radius` text DEFAULT '1rem' NOT NULL,
	`glass_opacity` text DEFAULT '0.1' NOT NULL
);
INSERT INTO "settings" ("id", "enterprise_id", "site_name", "logo_url", "primary_color", "secondary_color", "accent_color", "background_color", "bg_image_url", "border_radius", "glass_opacity") VALUES (1, NULL, 'Aura System', '', '#00FF66', '#10b981', '#00FF66', '#0a0a0b', '', '1rem', '0.1');
INSERT INTO "settings" ("id", "enterprise_id", "site_name", "logo_url", "primary_color", "secondary_color", "accent_color", "background_color", "bg_image_url", "border_radius", "glass_opacity") VALUES (2, 1, 'Padaria', '', '#00FF66', '#10b981', '#00FF66', '#0a0a0b', '', '1rem', '0.1');
CREATE TABLE stock_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    products_json TEXT NOT NULL,
    batches_json TEXT NOT NULL,
    product_count INTEGER NOT NULL
  );
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_number` integer NOT NULL,
	`service_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`items` text,
	`created_at` integer NOT NULL
);
CREATE TABLE `time_clock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`fingerprint_id` text,
	`created_at` integer NOT NULL
);
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_type` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL
);
INSERT INTO "transactions" ("id", "business_type", "type", "category", "description", "amount", "created_at") VALUES (1, 'padaria', 'income', 'caixa', 'Abertura de Caixa #1', 52790, 1786308560);
INSERT INTO "transactions" ("id", "business_type", "type", "category", "description", "amount", "created_at") VALUES (3, 'padaria', 'expense', 'vendas', 'ESTORNO: Venda PDV #1 CANCELADA', 6995, 1786309411);
CREATE TABLE `user_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL
);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (1, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1785604711);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (2, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1785620525);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (3, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1785620755);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (4, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1785723449);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (5, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1785726331);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (6, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1786302093);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (7, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36', 1786308491);
INSERT INTO "user_sessions" ("id", "user_id", "type", "ip_address", "user_agent", "created_at") VALUES (8, 1, 'login', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.216 Electron/41.7.1 Safari/537.36', 1789009589);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'barber' NOT NULL,
	`fingerprint_id` text,
	`enterprise_id` integer
);
INSERT INTO "users" ("id", "username", "password", "role", "fingerprint_id", "enterprise_id") VALUES (1, 'SkelleTu', '21f0f8fcb37fdceee70252ece9bddb8f8f7703860592c4d8330ea8956a98659ddff4267f4538dd2fcb7a0ea273f0dd911973121c1755bc81cce454dbc8ca1d9f.83991d0f7e547b41f81b9a0c75cd7e96', 'admin', NULL, 1);
INSERT INTO "users" ("id", "username", "password", "role", "fingerprint_id", "enterprise_id") VALUES (2, 'Barbeiro1', 'f1df066e9efe34bbe23d3ff92301ce1f318b1681b2f074ccb12b023005b3bf26ceab3b142b5e841436fb1a7ac048e6782f952c8e54705e0a52e36d2664ed4e5a.f84f6d93be17274012a8fd2dab754446', 'barber', NULL, NULL);
INSERT INTO "users" ("id", "username", "password", "role", "fingerprint_id", "enterprise_id") VALUES (3, 'Marcelo', '94ce9f7905ccef4ce406603a271c2ec4c1f1950a2507f988237e202949e09532e6c8073c53b93d918f531bb0113ca8cdab34745a1356df3207d3214af1a56723.7387fbf6cb819e883e7a5afdcb3421d8', 'barber', NULL, NULL);
CREATE UNIQUE INDEX `enterprises_slug_unique` ON `enterprises` (`slug`);
CREATE UNIQUE INDEX `users_fingerprint_id_unique` ON `users` (`fingerprint_id`);
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
COMMIT;
PRAGMA foreign_keys=ON;
