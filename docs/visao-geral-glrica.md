# GliErica — Visão geral da aplicação

Este documento descreve o que a app **GliErica** faz hoje, como está organizada tecnicamente e que aspetos podem ser úteis para **revisão por outras pessoas** (clínicos, cuidadores, testers ou developers). Foi escrito para acompanhar o código no repositório (abril de 2026).

Um **backlog de evolução** (v2.0: UX, funcionalidades e notas técnicas) está em [version2.md](version2.md); não substitui este documento nem implica compromisso de lançamento.

---

## 1. O que é e para quem se destina

**GliErica** é uma aplicação web progressiva (PWA), pensada sobretudo para **telemóvel** (layout estreito, navegação inferior, texto em **português de Portugal**). O foco é apoiar o dia a dia de quem gere **glicemia** e **nutrição** (hidrato de carbono, insulina, hidratação), com ligação opcional a dados do **FreeStyle Libre** via **LibreLinkUp**.

**Importante:** a app regista dados e mostra tendências; **não substitui** orientação médica nem decisões de dose. Parâmetros como “gramas de HC por unidade de insulina”, ISF (fator de sensibilidade) e alvos são **referência opcional** definida com a equipa de saúde — a interface deixa isso explícito em vários sítios.

---

## 2. Stack técnico (resumo)

| Área | Tecnologia |
|------|------------|
| Frontend / rotas | Next.js 14 (App Router), React 18 |
| Estilo | Tailwind CSS, Framer Motion (navegação), Recharts (gráficos) |
| Backend de dados | Supabase (PostgreSQL + Auth) |
| Auth | Supabase Auth; middleware Next.js protege rotas (exceto login, registo, offline) |
| PWA | `@ducanh2912/next-pwa` — instalação no ecrã inicial, service worker |
| Integração Libre | API route servidor (`/api/libre/glucose`) com `@diakem/libre-link-up-api-client`; credenciais só no servidor (`LIBRELINKUP_*`) |
| Alimentos externos | Open Food Facts (API routes de pesquisa/produto); referência TCA (INSA) na base de dados |

---

## 3. Fluxo de utilização

1. **Registo / login** — Conta Supabase; redirecionamento para `/dashboard` após autenticação.
2. **Ecrã principal** — A raiz `/` redireciona para o dashboard.
3. **Navegação inferior** (quatro separadores): **Dashboard**, **Refeições**, **Gráficos**, **Definições**.
4. **Contexto clínico** — Não está na barra inferior; acede-se a partir do **dashboard** (secção de contexto) ou diretamente pelas rotas `/contexto/...`.

---

## 4. Funcionalidades por área

### 4.1 Dashboard (`/dashboard`)

- **LibreLinkUp** — Glicemia atual, tendência, histórico recente (curvas ~3 h / 24 h conforme implementação). Os pedidos à Abbott passam pelo **servidor** para proteger credenciais e aplicar **cache** (evitar limites de taxa 429/430).
- **Monitorização pós-refeição** — Componente que avalia subidas rápidas na curva CGM e pode pedir **notificações** do browser ou mostrar aviso in-app (comportamento depende de permissões).
- **Resumo do dia** — Hidrato de carbono, insulina, água e atalhos para **contexto clínico** (glicemia manual, episódios, atividade).

### 4.2 Refeições (`/refeicoes` e subpáginas)

- **Registar refeição** — Compositor com alimentos da biblioteca e **refeições compostas**; registo de **HC** e **insulina rápida** por momento do dia (slots: pequeno-almoço, almoço, lanche, jantar, ceia, outro — conforme migrações).
- **Os meus alimentos** — Biblioteca pessoal (nome, HC por 100 g, favoritos), com possibilidade de **registo rápido** de HC no dia.
- **Explorar alimentos** — Pesquisa em bases de referência (**TCA/INSA**, **Open Food Facts**) e criação de alimentos novos.
- **Refeições compostas** — Combinações guardadas de vários alimentos com quantidades.
- **Análise de impacto** — Cruza refeições “favoritas” ou histórico com a **curva Libre** para scores de impacto (lógica em `meal-analysis` / ações do servidor).

Os dados ficam em tabelas como `meal_logs`, `meal_log_items`, `carb_entries`, `insulin_entries` (com funções SQL que mantêm consistência entre totais e linhas).

### 4.3 Gráficos (`/graficos`)

- **Insulina rápida vs hidratos** (`/graficos/insulina-hc`) — Visualização por dia, mediana de gramas por UI, comparação com a **regra** definida nas definições.
- **Glicemia Libre** — A app remete para o dashboard para a curva principal; há ligação à **análise de refeições** para cruzamento com Libre.

### 4.4 Contexto clínico (`/contexto`)

- **Glicemia manual** — Leituras fora do Libre (tira, laboratório, outro), com unidade (mg/dL ou mmol/L).
- **Hipos e hipers** — Episódios com notas e, em hipos, opcionalmente **HC de recuperação**.
- **Atividade física** — Tipo, duração, intensidade (contexto para variabilidade e conversas com a equipa).

### 4.5 Definições (`/definicoes`)

- **Conta** — Painéis de perfil e opções de conta (incl. **passkeys** onde aplicável).
- **Metas** — Meta diária de **HC**, **água** (ml).
- **Insulina** — Regra orientativa **gramas de HC por UI** de insulina rápida.
- **Correção** — Parâmetros opcionais **ISF** e **alvo** (em mg/dL na base de dados), para contexto — não prescreve doses na app.
- **UI placeholder** — Linhas “Perfil / Notificações / Privacidade” aparecem como lista; podem ser **não implementadas** ou só visuais — vale a pena validar com o código atual.

### 4.6 Autenticação e segurança

- **Middleware** — Utilizador não autenticado é enviado para `/login` (com `next` na query para voltar ao destino).
- **Supabase RLS** — Migração `012_auth_rls.sql` alinha **foreign keys** a `auth.users` e políticas por utilizador; substitui um modo antigo “sem login” com UUID fixo.
- **MFA** — Existe rota `/login/mfa` para fluxos de segundo fator, conforme configuração Supabase.

### 4.7 Offline e sincronização

- **Página offline** — `/offline` pública.
- **Fila em `localStorage`** — Operações (ex.: novos alimentos, favoritos, entradas de HC) podem ser **enfileiradas** quando não há rede e **sincronizadas** ao voltar online (`flushPendingSyncQueue`, evento `online`).
- **Cache de alimentos** — Lista de alimentos em cache por utilizador para leitura offline limitada.
- **Barra de sincronização** — `PendingSyncBar` no layout indica estado de pendências.

---

## 5. Dados principais na base (conceito)

- `profiles` — Metas (HC, água), regra HC/UI, ISF/alvo opcionais.
- `foods`, `composite_meals` / `composite_meal_items` — Biblioteca e refeições compostas.
- `carb_entries`, `insulin_entries` — Registos agregados; insulina com tipos (rápida, basal, correção).
- `meal_logs`, `meal_log_items` — Refeições estruturadas com linhas detalhadas.
- `water_entries` — Hidratação.
- `glucose_manual_entries`, `glycemic_events`, `activity_entries` — Contexto clínico.

---

## 6. Variáveis de ambiente (relevantes)

- **Supabase** — URL e chave anónima (cliente); sessão via cookies.
- **LibreLinkUp** — Login/password e opcionalmente versão de cliente (`LIBRELINKUP_CLIENT_VERSION`) no **servidor** apenas.

*(Não reproduzir segredos neste documento; usar `.env.local` no deploy.)*

---

## 7. O que pedir a quem for validar

Esta secção ajuda a **delegar feedback** sem precisarem de ler o código.

### Clínico / educador em diabetes

- As **metáforas e textos** (HC/UI, correção, hipos) estão claros e alinhados com o que recomendam?
- Falta algum **tipo de registo** habitual (ex.: cetose, medicamentos não insulina, sono)?
- A distinção entre **insulina de refeição**, **basal** e **correção** é suficiente para relatórios?

### Utilizador ou familiar

- O **fluxo de registo de refeição** é rápido no dia a dia?
- **Gráficos** e **dashboard** respondem às perguntas que fazem às consultas?
- **Notificações** e alertas pós-refeição são úteis ou ruidosos?

### Segurança e privacidade

- **RLS** no Supabase está ativo e testado por utilizador?
- Política de dados e consentimentos: a app hoje tem **placeholders** de privacidade — o que falta para produção?

### Produto / QA

- Rotas **placeholder** (definições avançadas) vs funcionalidades **reais**.
- Comportamento **offline** (fila, conflitos, mensagens de erro).
- **Limites Libre** (rate limit, dados em cache “stale”) — mensagens ao utilizador são compreensíveis?

### Desenvolvimento

- Cobertura de **testes** automáticos (se ainda não existir, é risco em refactors).
- **Acessibilidade** (leitores de ecrã, contraste, tamanhos tocáveis).
- **Internacionalização** — hoje PT-PT; outros locales no futuro?

---

## 8. Limitações conhecidas (para não assumir o que a app não faz)

- Não é um **prescritor** de insulina: os números são apoio a registo e análise.
- **LibreLinkUp** depende da Abbott e de contas/configuração válidas; podem ocorrer atrasos ou bloqueios temporários.
- Parte da **biblioteca de alimentos** depende de bases externas (qualidade variável).
- Alguns ecrãs de **definições** podem ser marcadores para funcionalidade futura.

---

## 9. Como correr o projeto (desenvolvimento)

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. É necessário projeto Supabase configurado e variáveis de ambiente adequadas. Migrações SQL em `supabase/migrations/` devem ser aplicadas na ordem no painel Supabase ou CLI.

---

*Documento gerado para apoio a revisão e onboarding. Ajusta livremente conforme evolução do produto.*
