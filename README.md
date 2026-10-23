# Mesa pra Dois

Diário e planejador gastronômico para um casal: lista "Para Conhecer", lista "Já Fomos", sincronizada em tempo real entre as duas contas.

**Stack:** React 19 + TypeScript + Vite · CSS Modules com design tokens · Supabase (Postgres, Auth, Realtime, RLS) · Leaflet + OpenStreetMap · Vitest.

**Recursos:** duas listas, busca e filtros (VR, preço, média 4+), uma nota por pessoa (com média do casal), registro de visita (nota, gasto, data, observações) e mapa com link "Como chegar".

| Para Conhecer | Já Fomos | Registrar visita | Tema escuro |
|---|---|---|---|
| ![Lista Para Conhecer](docs/para-conhecer.png) | ![Lista Já Fomos com a nota de cada um](docs/ja-fomos.png) | ![Gaveta para registrar visita](docs/registrar-visita.png) | ![Tema escuro](docs/tema-escuro.png) |

## Rodar

```bash
npm install
npm run dev        # abre em modo demonstração (dados em memória)
npm test           # testes das regras de filtro e de tempo real
npm run build      # typecheck + build de produção
```

## Conectar ao Supabase

1. Crie um projeto em supabase.com.
2. SQL Editor → rode, nesta ordem, `supabase/migrations/001_init.sql` e `002_ratings_and_location.sql`.
3. Copie `.env.example` para `.env` e preencha URL e chave pública (Project Settings → API).
4. Implemente o login (próximo passo: `<AuthGate>` em `src/app/App.tsx`). Sem login, o RLS bloqueia a leitura — e é exatamente isso que queremos.

## Arquitetura

```
src/
├── app/                      # composição raiz (App)
├── pages/HomePage/           # página = conecta hooks a componentes
├── features/restaurants/     # tudo da feature junto (feature-first)
│   ├── types.ts              # modelo de domínio
│   ├── domain/               # regras puras + testes (sem React, sem banco)
│   ├── data/                 # Repository: contrato + Supabase + memória
│   ├── hooks/                # estado e efeitos (useRestaurants, filtros, ações)
│   └── components/           # apresentação
├── shared/ui/                # componentes genéricos (Chip, StarRating, SearchField)
├── shared/lib/               # utilitários (formatação, cliente Supabase)
└── styles/                   # tokens.css (design system) + global.css
```

Regra de dependência: `components → hooks → data/domain`. O domínio não importa nada de fora; só `data/` conhece o Supabase.
