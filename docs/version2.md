# Plano de Evolução: GliErica v2.0

Este documento reúne melhorias de UX/UI, novas funcionalidades e otimizações técnicas para transformar a GliErica numa ferramenta de referência na gestão da diabetes.

## 1. Experiência do Utilizador (UI/UX)

### A. Design "Mobile-First" Extremo

- **Bottom Sheets (Drawers):** Substituir modais centrais por menus que deslizam do fundo (usando vaul). É muito mais fácil de usar com uma só mão no iPhone.
- **Zona do Polegar:** Colocar os botões de "Registo Rápido" e "Emergência Hipo" no terço inferior do ecrã.
- **Skeleton Screens:** Implementar placeholders animados enquanto a API do LibreLinkUp carrega, eliminando ecrãs brancos de espera.

### B. Feedback Visual e Cognitivo

- **Cores Dinâmicas:** O fundo do dashboard (ou do card de glicemia) deve mudar de cor suavemente (Glow/Gradient) baseado no valor:
  - Azul Suave: < 70 mg/dL (Hipo)
  - Verde Esmeralda: 70 - 160 mg/dL (Alvo)
  - Amarelo/Laranja: > 160 mg/dL (Hiper)
- **Micro-interações:** Usar framer-motion para que os números da glicemia "contem" (animação de subida) quando os dados atualizam.

## 2. Funcionalidades de Inteligência (Core)

### A. Análise de Impacto de Refeições

- **O "Score" de Refeição:** Criar um algoritmo que analisa a curva de glicemia 2 horas após um registo de "Refeição Composta".
- **Sugestão de Rácio:** Se uma refeição favoritada resulta sempre em hiperglicemia, a app sugere: "Notámos que o seu rácio de almoço pode precisar de ajuste (atualmente 1:10)" — sempre como **informação de referência**, não prescrição (alinhado com o princípio da app de não substituir a equipa de saúde).

### B. Gestão de Hipoglicemias (Modo SOS)

**Botão Hipo:** Um atalho que, ao ser clicado:

- Calcula os gramas de HC de absorção rápida necessários.
- Inicia um cronómetro de 15 minutos (Regra dos 15g/15min).
- **Alerta a contacto de confiança (sem SMS):** não há envio automático de SMS nem integração com operadoras. Opções previstas: **notificação in-app**; **Web Push** (ver secção 4); **partilha iniciada pelo utilizador** (texto pré-preenchido com contexto e, se o utilizador aceitar, localização via APIs do browser — ex. Web Share API ou canal que a pessoa já use); **atalho para telefonar** ao contacto guardado.

### C. Scanner de Alimentos com IA

- **Vision API:** Integrar um serviço de análise de imagem (API de visão no servidor ou serviço cloud acordado) que, a partir de uma foto do prato, estima os hidratos como **valor de referência**, sempre passível de edição. Tratar **privacidade e RGPD** (retenção mínima de imagens, informação ao utilizador).
- Não confundir com a ferramenta de desenvolvimento: o requisito é **produto em runtime**, não o IDE.

## 3. Contexto Clínico Avançado

- **Mapa de Sítios de Injeção:** Um gráfico do corpo humano para registar onde foi aplicada a última insulina ou colocado o sensor, evitando a lipodistrofia por repetição (especificar no desenho se o foco é injeções, sensor Libre, ou ambos).
- **Registo de Notas por Voz:** Usar a API de reconhecimento de voz do browser para ditar notas rápidas: "Comi isto mas estava com muito stress". O stress influencia a glicemia e esta nota é ouro para o médico.
- **Exportação para PDF/CSV:** Um gerador de relatórios limpos, prontos para enviar por WhatsApp ou Email para a equipa médica antes da consulta.

## 4. Melhorias Técnicas e Performance

### A. Robustez do LibreLinkUp

- **Proxy Cache:** Implementar uma camada de cache no servidor (Redis ou memória) para que, se vários utilizadores pedirem dados ao mesmo tempo, a app não seja bloqueada pela Abbott. *Nota de deploy:* cache em memória não partilha estado entre instâncias serverless; Redis ou equivalente pode ser necessário conforme o hosting.
- **Stale-While-Revalidate:** Se a API da Abbott falhar, mostrar o último valor conhecido com um ícone de "Relógio/Offline" e a hora da última leitura.

### B. Sincronização e Offline

- **Optimistic UI:** Quando o utilizador regista um alimento offline, a app deve mostrá-lo imediatamente como "concluído", tratando da sincronização em background sem bloquear o interface.
- **Notificações Push (Web Push):** Enviar alertas de subida rápida mesmo com a app em segundo plano (requer configuração de Service Workers). O comportamento com a app totalmente fechada varia por navegador e SO — definir expectativas na UX.

## 5. Check-list de Implementação (Sugestão de Ordem)

- [ ] **Prioridade 1:** Implementar Skeleton Loaders e Bottom Sheets (Melhoria imediata de perceção de qualidade).
- [ ] **Prioridade 2:** Criar o Modo de Emergência Hipo (Segurança do utilizador).
- [ ] **Prioridade 3:** Refinar a Análise de Impacto (Valor clínico e diferenciação).
- [ ] **Prioridade 4:** Adicionar Exportação de Relatórios (Utilidade em consulta).

*Esta lista cobre um subconjunto das secções acima; outras linhas (vision, voz, mapa, push avançado, Redis) podem ser desdobradas em fases posteriores com critérios de aceitação próprios.*

## 6. Notas de produto e conformidade

- **Sem SMS** para alertas a terceiros ou notificações transacionais: reduz dependências de telecomunicações, custos e superfície de compliance; ver secção 2.B.
- **Sugestões automáticas** (rácios, HC estimado por IA): manter o papel de **apoio à decisão informada pelo utilizador e pela equipa clínica**, coerente com a visão geral da aplicação.
- **Dados sensíveis** (saúde, localização em partilhas): fluxos **opt-in** e iniciados pelo utilizador sempre que envolvam terceiros ou serviços externos.
