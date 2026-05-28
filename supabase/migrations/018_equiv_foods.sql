-- Tabela de equivalentes de hidratos de carbono (apoio à contagem por porção típica).
-- Duas variantes de porção:
--   portion_kind = 'equivalent'  ➝ porção é "X gramas que valem 10 g de HC"
--   portion_kind = 'unit'        ➝ porção é "1 unidade com peso médio X g e Y g de HC"
-- O carbs_per_100g é derivado: round((portion_carbs_g / portion_g) * 100, 1).
-- Leitura pública para utilizadores autenticados; sem escrita pelo cliente.

create table if not exists public.equiv_foods (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  portion_g numeric not null check (portion_g > 0),
  portion_carbs_g numeric not null check (portion_carbs_g >= 0),
  household_measure text,
  portion_kind text not null check (portion_kind in ('equivalent', 'unit')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists equiv_foods_category_sort_idx
  on public.equiv_foods (category, sort_order, name);

create index if not exists equiv_foods_name_idx
  on public.equiv_foods (lower(name));

alter table public.equiv_foods enable row level security;

drop policy if exists "equiv_foods_read_all" on public.equiv_foods;

create policy "equiv_foods_read_all"
  on public.equiv_foods for select
  using (auth.role() = 'authenticated');

comment on table public.equiv_foods is
  'Equivalentes de HC: tabela de referência clínica para contagem por porção. Read-only para utilizadores autenticados.';

-- ——— Seed ———
-- Limpa antes para idempotência.
delete from public.equiv_foods;

-- Leite
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Leite', 'Leite', 200, 10, 'Copo pequeno (200 ml)', 'equivalent', 0);

-- Leguminosas (cozidas, demolhadas quando aplicável)
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Leguminosas', 'Ervilha cozida', 133, 10, '8 colheres de sopa', 'equivalent', 10),
  ('Leguminosas', 'Favas cozidas', 135, 10, '6 colheres de sopa', 'equivalent', 11),
  ('Leguminosas', 'Feijão branco cozido (demolhado)', 68.5, 10, '2,5 colheres de sopa', 'equivalent', 12),
  ('Leguminosas', 'Feijão preto cozido (demolhado)', 55, 10, '3 colheres de sopa', 'equivalent', 13),
  ('Leguminosas', 'Feijão frade cozido (demolhado)', 71, 10, '3 colheres de sopa', 'equivalent', 14),
  ('Leguminosas', 'Feijão manteiga cozido (demolhado)', 60, 10, '4 colheres de sopa', 'equivalent', 15),
  ('Leguminosas', 'Grão-de-bico cozido (demolhado)', 60, 10, '3,5 colheres de sopa', 'equivalent', 16),
  ('Leguminosas', 'Lentilhas, secas cozidas', 35, 10, '1,5 colheres de sopa', 'equivalent', 17),
  ('Leguminosas', 'Soja em macos ou granulado', 42, 10, NULL, 'equivalent', 18),
  ('Leguminosas', 'Feijão soja', 55, 10, NULL, 'equivalent', 19),
  ('Leguminosas', 'Tremoço, cozido e salgado', 139, 10, '2 mãos cheias / 1 prato sobremesa', 'equivalent', 20);

-- Cereais, Pães, Farinhas
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Cereais, Pães, Farinhas', 'Arroz cozido simples', 36, 10, '1,5 colheres de sopa', 'equivalent', 30),
  ('Cereais, Pães, Farinhas', 'Arroz de cenoura', 52, 10, '2,5 colheres de sopa', 'equivalent', 31),
  ('Cereais, Pães, Farinhas', 'Arroz de tomate', 90, 10, '2 colheres de sopa', 'equivalent', 32),
  ('Cereais, Pães, Farinhas', 'Esparguete cozido', 90, 10, '1/4 prato', 'equivalent', 33),
  ('Cereais, Pães, Farinhas', 'Cotovelinho cozido', 90, 10, '1/4 prato', 'equivalent', 34),
  ('Cereais, Pães, Farinhas', 'Fettuccine cozido', 90, 10, '1/4 prato', 'equivalent', 35),
  ('Cereais, Pães, Farinhas', 'Macaronete riscado cozido', 90, 10, '1/4 prato', 'equivalent', 36),
  ('Cereais, Pães, Farinhas', 'Pão de centeio', 18, 10, '1 tira', 'equivalent', 40),
  ('Cereais, Pães, Farinhas', 'Pão de milho', 19, 10, NULL, 'equivalent', 41),
  ('Cereais, Pães, Farinhas', 'Pão de mistura', 17, 10, 'Meio pão (bola)', 'equivalent', 42),
  ('Cereais, Pães, Farinhas', 'Pão de trigo', 17, 10, 'Meio pão', 'equivalent', 43),
  ('Cereais, Pães, Farinhas', 'Pão de leite (bico de pato)', 19, 10, NULL, 'equivalent', 44),
  ('Cereais, Pães, Farinhas', 'Pão de forma de trigo', 18, 10, NULL, 'equivalent', 45),
  ('Cereais, Pães, Farinhas', 'Tostas de trigo simples', 14, 10, '1 tosta', 'equivalent', 46),
  ('Cereais, Pães, Farinhas', 'Gressino', 15, 10, '2 unidades', 'equivalent', 50),
  ('Cereais, Pães, Farinhas', 'Pão ralado', 14, 10, '1 colher de sopa cheia', 'equivalent', 51),
  ('Cereais, Pães, Farinhas', 'Pizza de queijo e tomate', 38.5, 10, NULL, 'equivalent', 60),
  ('Cereais, Pães, Farinhas', 'Pizza de queijo, tomate e fiambre', 43, 10, NULL, 'equivalent', 61),
  ('Cereais, Pães, Farinhas', 'Quiche Lorraine', 43, 10, NULL, 'equivalent', 62);

-- Cereais de pequeno-almoço
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Cereais de pequeno-almoço', 'Flocos de milho tipo "Corn Flakes"', 12, 10, '2 colheres de sopa cheia', 'equivalent', 70),
  ('Cereais de pequeno-almoço', 'Flocos de aveia', 16, 10, '2 colheres de sopa', 'equivalent', 71),
  ('Cereais de pequeno-almoço', 'Flocos de trigo com mel tipo "Nestum"', 12, 10, '2 colheres de sobremesa', 'equivalent', 72),
  ('Cereais de pequeno-almoço', 'Flocos de trigo integral tipo "All Bran Flakes"', 16, 10, NULL, 'equivalent', 73),
  ('Cereais de pequeno-almoço', 'Flocos de cereais e frutos secos "Muesli"', 12, 10, NULL, 'equivalent', 74),
  ('Cereais de pequeno-almoço', 'Flocos de arroz', 14, 10, '2 colheres de sobremesa', 'equivalent', 75);

-- Bolachas e biscoitos
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Bolachas e biscoitos', 'Línguas-de-gato', 12, 10, '6 unidades', 'equivalent', 80),
  ('Bolachas e biscoitos', 'Línguas-de-veado', 15, 10, '1 bolacha', 'equivalent', 81),
  ('Bolachas e biscoitos', 'Palitos-de-la-reine', 15, 10, '2 unidades', 'equivalent', 82),
  ('Bolachas e biscoitos', 'Bolacha água e sal', 16, 10, '5 bolachas redondas', 'equivalent', 83),
  ('Bolachas e biscoitos', 'Bolacha Cream Cracker', 16, 10, '2,5 bolachas quadradas', 'equivalent', 84),
  ('Bolachas e biscoitos', 'Bolacha trigo integral (redondas)', 15, 10, '2,5 bolachas', 'equivalent', 85),
  ('Bolachas e biscoitos', 'Bolacha maria', 14, 10, '2 bolachas', 'equivalent', 86),
  ('Bolachas e biscoitos', 'Bolacha torrada', 15, 10, '3 bolachas', 'equivalent', 87);

-- Tubérculos
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Tubérculos', 'Batata assada no forno', 42, 10, '2 unidades pequenas', 'equivalent', 90),
  ('Tubérculos', 'Batata cozida', 54, 10, NULL, 'equivalent', 91),
  ('Tubérculos', 'Batata estufada', 74, 10, NULL, 'equivalent', 92),
  ('Tubérculos', 'Batata frita caseira (palitos)', 36, 10, '4 palitos', 'equivalent', 93),
  ('Tubérculos', 'Batata frita de pacote (em rodelas)', 26, 10, NULL, 'equivalent', 94),
  ('Tubérculos', 'Puré', 60, 10, '1 colher de sopa cheia', 'equivalent', 95),
  ('Tubérculos', 'Batata-doce crua/assada', 35, 10, NULL, 'equivalent', 96);

-- Produtos hortícolas e saladas (alface/agrião/chicória/cogumelos excluídos por terem HC desprezável)
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Hortícolas e saladas', 'Legumes e hortaliças em cru', 200, 10, '2 chávenas almoçadeiras', 'equivalent', 100),
  ('Hortícolas e saladas', 'Legumes e hortaliças cozidos', 470, 10, NULL, 'equivalent', 101);

-- Fruta fresca
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Fruta fresca', 'Abacate', 435, 10, NULL, 'equivalent', 110),
  ('Fruta fresca', 'Ameixa branca', 128, 10, '2 unidades', 'equivalent', 111),
  ('Fruta fresca', 'Ameixa vermelha', 135, 10, '5 unidades pequenas', 'equivalent', 112),
  ('Fruta fresca', 'Ananás em calda de açúcar', 43, 10, NULL, 'equivalent', 113),
  ('Fruta fresca', 'Banana', 46, 10, NULL, 'equivalent', 114),
  ('Fruta fresca', 'Cereja', 75, 10, '13 unidades', 'equivalent', 115),
  ('Fruta fresca', 'Clementina', 90, 10, NULL, 'equivalent', 116),
  ('Fruta fresca', 'Diospiro', 68, 10, NULL, 'equivalent', 117),
  ('Fruta fresca', 'Framboesa', 196, 10, '49 unidades / 4 mãos cheias', 'equivalent', 118),
  ('Fruta fresca', 'Kiwi', 92, 10, NULL, 'equivalent', 119),
  ('Fruta fresca', 'Laranja', 112, 10, NULL, 'equivalent', 120),
  ('Fruta fresca', 'Maçã com casca', 75, 10, NULL, 'equivalent', 121),
  ('Fruta fresca', 'Maçã sem casca', 79, 10, NULL, 'equivalent', 122),
  ('Fruta fresca', 'Maçã cozida com açúcar', 59, 10, NULL, 'equivalent', 123),
  ('Fruta fresca', 'Maçã assada com açúcar', 42, 10, '1/3 maçã', 'equivalent', 124),
  ('Fruta fresca', 'Manga', 85, 10, '1/4 manga', 'equivalent', 125),
  ('Fruta fresca', 'Melancia', 182, 10, NULL, 'equivalent', 126),
  ('Fruta fresca', 'Melão', 175, 10, NULL, 'equivalent', 127),
  ('Fruta fresca', 'Morangos', 190, 10, '13 unidades pequenas', 'equivalent', 128),
  ('Fruta fresca', 'Nectarina', 115, 10, NULL, 'equivalent', 129),
  ('Fruta fresca', 'Néspera', 98, 10, NULL, 'equivalent', 130),
  ('Fruta fresca', 'Papaia', 110, 10, NULL, 'equivalent', 131),
  ('Fruta fresca', 'Pera', 106, 10, NULL, 'equivalent', 132),
  ('Fruta fresca', 'Pêssego', 123, 10, NULL, 'equivalent', 133),
  ('Fruta fresca', 'Romã', 83, 10, NULL, 'equivalent', 134),
  ('Fruta fresca', 'Tangerina', 115, 10, NULL, 'equivalent', 135),
  ('Fruta fresca', 'Toranja', 167, 10, NULL, 'equivalent', 136),
  ('Fruta fresca', 'Uvas brancas / tintas', 55, 10, NULL, 'equivalent', 137);

-- Frutos secos (desidratados)
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Frutos secos', 'Ameixa seca', 26, 10, '2,5 unidades', 'equivalent', 140),
  ('Frutos secos', 'Damasco seco', 24, 10, NULL, 'equivalent', 141),
  ('Frutos secos', 'Figo seco', 17, 10, '2 unidades', 'equivalent', 142),
  ('Frutos secos', 'Tâmara seca', 15, 10, '2 unidades', 'equivalent', 143),
  ('Frutos secos', 'Uvas passas', 15, 10, '1 colher de sopa cheia', 'equivalent', 144);

-- Frutos gordos / oleaginosas
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Frutos gordos', 'Amêndoa', 140, 10, '6 colheres de sopa', 'equivalent', 150),
  ('Frutos gordos', 'Amendoim (miolo)', 100, 10, NULL, 'equivalent', 151),
  ('Frutos gordos', 'Avelã', 167, 10, NULL, 'equivalent', 152),
  ('Frutos gordos', 'Castanha (miolo)', 25, 10, NULL, 'equivalent', 153),
  ('Frutos gordos', 'Castanha assada com sal', 22, 10, NULL, 'equivalent', 154),
  ('Frutos gordos', 'Coco seco ralado', 156, 10, '22 colheres de sopa', 'equivalent', 155),
  ('Frutos gordos', 'Noz (miolo)', 278, 10, NULL, 'equivalent', 156),
  ('Frutos gordos', 'Pinhão (miolo)', 200, 10, NULL, 'equivalent', 157),
  ('Frutos gordos', 'Pistacho torrado e salgado', 79, 10, NULL, 'equivalent', 158);

-- Açúcar, mel e derivados
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Açúcar, mel e derivados', 'Açúcar branco ou amarelo', 10, 10, '1,5 pacotes', 'equivalent', 160),
  ('Açúcar, mel e derivados', 'Compota', 18, 10, '2 colheres de chá / pacote individual', 'equivalent', 161),
  ('Açúcar, mel e derivados', 'Doce', 17, 10, '1 colher de sobremesa', 'equivalent', 162),
  ('Açúcar, mel e derivados', 'Geleia de casca de laranja', 15, 10, NULL, 'equivalent', 163),
  ('Açúcar, mel e derivados', 'Marmelada', 14, 10, NULL, 'equivalent', 164),
  ('Açúcar, mel e derivados', 'Mel', 13, 10, '1 colher de sobremesa', 'equivalent', 165);

-- Cacau e derivados
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Cacau e derivados', 'Cacau em pó', 90, 10, '2 colheres de sobremesa rasas', 'equivalent', 170),
  ('Cacau e derivados', 'Chocolate em pó', 16, 10, '1 colher de sobremesa', 'equivalent', 171),
  ('Cacau e derivados', 'Creme para barrar de cacau e avelãs (Nutella, Tulicreme)', 18, 10, NULL, 'equivalent', 172);

-- Sobremesas
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Sobremesas', 'Arroz doce', 22, 10, NULL, 'equivalent', 180),
  ('Sobremesas', 'Leite creme', 9, 10, NULL, 'equivalent', 181),
  ('Sobremesas', 'Mousse de chocolate', 32, 10, '2 colheres de sopa', 'equivalent', 182),
  ('Sobremesas', 'Pudim de leite e ovos', 22, 10, NULL, 'equivalent', 183),
  ('Sobremesas', 'Pudim flan caseiro', 27, 10, NULL, 'equivalent', 184),
  ('Sobremesas', 'Rabanadas', 32, 10, '2,5 unidades', 'equivalent', 185),
  ('Sobremesas', 'Sonhos', 34, 10, NULL, 'equivalent', 186);

-- Bolos de pastelaria (por unidade — peso e HC por unidade)
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Bolos de pastelaria', 'Bolo de arroz', 71, 45, '1 unidade (~71 g)', 'unit', 200),
  ('Bolos de pastelaria', 'Bola de Berlim sem creme', 132, 61, '1 unidade (~132 g)', 'unit', 201),
  ('Bolos de pastelaria', 'Bolo de bolacha Maria', 94, 44, '1 fatia (~94 g)', 'unit', 202),
  ('Bolos de pastelaria', 'Bolo de chocolate', 129, 94, '1 fatia (~129 g)', 'unit', 203),
  ('Bolos de pastelaria', 'Bolo de ferradura', 45, 26, '1 unidade (~45 g)', 'unit', 204),
  ('Bolos de pastelaria', 'Bolo rei (fatia fina)', 101, 43, '1 fatia (~101 g)', 'unit', 205),
  ('Bolos de pastelaria', 'Croissant simples', 54, 23, '1 unidade (~54 g)', 'unit', 206),
  ('Bolos de pastelaria', 'Donut de chocolate', 96, 35, '1 unidade (~96 g)', 'unit', 207),
  ('Bolos de pastelaria', 'Jesuíta', 94, 51, '1 unidade (~94 g)', 'unit', 208),
  ('Bolos de pastelaria', 'Pastel de feijão', 66, 34, '1 unidade (~66 g)', 'unit', 209),
  ('Bolos de pastelaria', 'Pastel de nata', 74, 36, '1 unidade (~74 g)', 'unit', 210),
  ('Bolos de pastelaria', 'Queque simples', 76, 41, '1 unidade (~76 g)', 'unit', 211),
  ('Bolos de pastelaria', 'Tarte de maçã (redonda)', 89, 26, '1 fatia (~89 g)', 'unit', 212),
  ('Bolos de pastelaria', 'Tarte de maçã (rectangular)', 113, 33, '1 fatia (~113 g)', 'unit', 213),
  ('Bolos de pastelaria', 'Gelado de água (sorvete)', 60, 20, '1 bola (~60 g)', 'unit', 220),
  ('Bolos de pastelaria', 'Gelado de leite', 60, 13, '1 bola (~60 g)', 'unit', 221);

-- Salgados (por unidade)
insert into public.equiv_foods (category, name, portion_g, portion_carbs_g, household_measure, portion_kind, sort_order) values
  ('Salgados', 'Chamuça', 39, 15, '1 unidade (~39 g)', 'unit', 230),
  ('Salgados', 'Croquete', 47, 11, '1 unidade (~47 g)', 'unit', 231),
  ('Salgados', 'Empada de carne', 71, 24, '1 unidade (~71 g)', 'unit', 232),
  ('Salgados', 'Rissol de carne', 59, 19, '1 unidade (~59 g)', 'unit', 233),
  ('Salgados', 'Alheira', 193, 55, '1 unidade (~193 g)', 'unit', 234),
  ('Salgados', 'Farinheira cozida', 192, 51, '1 unidade (~192 g)', 'unit', 235),
  ('Salgados', 'Bolinho de bacalhau', 27, 3, '1 unidade (~27 g)', 'unit', 236),
  ('Salgados', 'Rissol de camarão', 71, 19, '1 unidade (~71 g)', 'unit', 237);
