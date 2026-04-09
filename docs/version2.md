🚀 Plano de Evolução: GliErica v2.0
Este documento reúne melhorias de UX/UI, novas funcionalidades e otimizações técnicas para transformar a GliErica numa ferramenta de referência na gestão da diabetes.

🎨 1. Experiência do Utilizador (UI/UX)
A. Design "Mobile-First" Extremo
Bottom Sheets (Drawers): Substituir modais centrais por menus que deslizam do fundo (usando vaul). É muito mais fácil de usar com uma só mão no iPhone.

Zona do Polegar: Colocar os botões de "Registo Rápido" e "Emergência Hipo" no terço inferior do ecrã.

Skeleton Screens: Implementar placeholders animados enquanto a API do LibreLinkUp carrega, eliminando ecrãs brancos de espera.

B. Feedback Visual e Cognitivo
Cores Dinâmicas: O fundo do dashboard (ou do card de glicemia) deve mudar de cor suavemente (Glow/Gradient) baseado no valor:

Azul Suave: < 70 mg/dL (Hipo)

Verde Esmeralda: 70 - 160 mg/dL (Alvo)

Amarelo/Laranja: > 160 mg/dL (Hiper)

Micro-interações: Usar framer-motion para que os números da glicemia "contem" (animação de subida) quando os dados atualizam.

🛠 2. Funcionalidades de Inteligência (Core)
A. Análise de Impacto de Refeições
O "Score" de Refeição: Criar um algoritmo que analisa a curva de glicemia 2 horas após um registo de "Refeição Composta".

Sugestão de Rácio: Se uma refeição favoritada resulta sempre em hiperglicemia, a app sugere: "Notámos que o seu rácio de almoço pode precisar de ajuste (atualmente 1:10)".

B. Gestão de Hipoglicemias (Modo SOS)
Botão Hipo: Um atalho que, ao ser clicado:

Calcula os gramas de HC de absorção rápida necessários.

Inicia um cronómetro de 15 minutos (Regra dos 15g/15min).

Oferece um botão para enviar SMS de alerta a um contacto de confiança com a localização atual.

C. Scanner de Alimentos com IA
Vision API: Usar o Cursor para implementar uma função onde tiras foto ao prato e a IA estima os hidratos (como valor de referência, sempre passível de edição).

🏥 3. Contexto Clínico Avançado
Mapa de Sítios de Injeção: Um gráfico do corpo humano para registar onde foi aplicada a última insulina ou colocado o sensor, evitando a lipodistrofia por repetição.

Registo de Notas por Voz: Usar a API de reconhecimento de voz do browser para ditar notas rápidas: "Comi isto mas estava com muito stress". O stress influencia a glicemia e esta nota é ouro para o médico.

Exportação para PDF/CSV: Um gerador de relatórios limpos, prontos para enviar por WhatsApp ou Email para a equipa médica antes da consulta.

⚙️ 4. Melhorias Técnicas e Performance
A. Robustez do LibreLinkUp
Proxy Cache: Implementar uma camada de cache no servidor (Redis ou memória) para que, se 3 utilizadores pedirem dados ao mesmo tempo, a app não seja bloqueada pela Abbott.

Stale-While-Revalidate: Se a API da Abbott falhar, mostrar o último valor conhecido com um ícone de "Relógio/Offline" e a hora da última leitura.

B. Sincronização e Offline
Optimistic UI: Quando o utilizador regista um alimento offline, a app deve mostrá-lo imediatamente como "concluído", tratando da sincronização em background sem bloquear o interface.

Notificações Push (Web Push): Enviar alertas de subida rápida mesmo com a app fechada (requer configuração de Service Workers avançada).

📑 5. Check-list de Implementação (Sugestão de Ordem)
[ ] Prioridade 1: Implementar Skeleton Loaders e Bottom Sheets (Melhoria imediata de perceção de qualidade).

[ ] Prioridade 2: Criar o Modo de Emergência Hipo (Segurança do utilizador).

[ ] Prioridade 3: Refinar a Análise de Impacto (Valor clínico e diferenciação).

[ ] Prioridade 4: Adicionar Exportação de Relatórios (Utilidade em consulta).