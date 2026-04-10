# GliErica v2 — fases posteriores (backlog)

Critérios de aceitação sugeridos para funcionalidades referidas em [version2.md](version2.md) mas fora das prioridades 1–4 imediatas.

## Scanner de alimentos (Vision / IA)

- **Objetivo:** estimativa de HC a partir de foto, editável pelo utilizador.
- **Aceitação:** fluxo opt-in; política de retenção de imagens (mínima / sem persistência); aviso RGPD; custo e fornecedor definidos em deploy.

## Mapa de sítios de injeção / sensor

- **Objetivo:** registo visual (corpo) para rotação de injeções ou sensor.
- **Aceitação:** modelo de dados (zona + data); UI acessível; claro se cobre só injeção, só sensor Libre, ou ambos.

## Notas por voz

- **Objetivo:** ditado em campos de nota via Web Speech API.
- **Aceitação:** permissão de microfone; fallback para teclado; `pt-PT` quando disponível.

## Cache Redis (LibreLinkUp)

- **Objetivo:** cache partilhado entre instâncias serverless.
- **Aceitação:** necessário apenas com réplicas múltiplas ou tráfego agregado; TTL alinhado ao limite Abbott; métricas de hit/miss.

## Offline optimista

- **Objetivo:** UI otimista + fila de sync robusta.
- **Aceitação:** reconciliação de conflitos definida; testes com fila offline simulada.

## Web Push (servidor)

- **Objetivo:** alertas com app em segundo plano.
- **Aceitação:** VAPID, armazenamento de subscrições por utilizador; mensagens esperadas por SO/browser documentadas na UX.
