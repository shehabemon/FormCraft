# FormCraft — AI-powered fullstack form builder that exports working React components

Not deployed — runs locally

## What this is

Most form builder tools give you an embeddable widget or a proprietary JSON blob. FormCraft gives you code. The output is a self-contained React component (TypeScript) or a standalone HTML file — the kind of thing you'd actually drop into a codebase, not wrap in an iframe.

**AI generation is the fastest path in.** Describe a form in plain English — "a two-step onboarding form with name, email, company size, and a conditional field that asks for team size only if company size is over 10" — and FormCraft calls Gemini 2.5 Flash, validates and repairs the response, and drops a fully configured, editable form onto the canvas in seconds. You can then refine it field by field, add conditional logic, switch it to multi-step, and export. The AI path and the manual drag-and-drop path produce the same internal schema, so every feature works regardless of how the form was created.

The builder itself is a three-panel layout: a field palette on the left, a drag-and-drop canvas in the center, and a tabbed properties/logic/style panel on the right. Authenticated users have their forms synced to Supabase in real time — every mutation is debounced and upserted to the database. Guests can build freely with forms stored locally in localStorage; signing in triggers a one-time migration prompt that imports any local forms into the database.

**Multi-step forms are a first-class feature.** You can split any form into named steps, reorder them, assign individual fields to steps, and configure the navigation behaviour per step — custom Back/Next labels, optional back button suppression, and four step indicator styles (dots, numbered, labelled, progress bar). The entire multi-step structure is part of the `FormSchema` and persists alongside everything else.

The non-obvious part is what happens at export. The code generator detects whether a form has two or more steps and switches to an entirely different output strategy. Single-step forms export as a react-hook-form component with a Zod or Yup resolver. Multi-step forms export as a standalone React component with `useState`-managed values, per-step Zod validation that runs before advancing, animated step transitions via `framer-motion`, and a configurable `ProgressIndicator` component — all self-contained with no additional dependencies beyond `zod` and `framer-motion`. Both paths share the same `FormSchema` input and produce the same ARIA attributes, conditional visibility logic, and error display patterns.

## What makes this different

**Describing a form in plain English is a first-class workflow.** Most tools treat AI as a demo feature — a novelty that generates something you immediately have to throw away. FormCraft's AI pipeline is built on the same internal schema as the manual builder, so the generated form is immediately editable: select any field, change its type, add a validation rule, wire up a conditional, switch the whole thing to multi-step. The AI doesn't generate a static preview; it populates the live Redux state the same way a manual drag-and-drop does. The pipeline handles everything Gemini gets wrong — markdown-fenced JSON, missing options on choice fields, invalid field type strings like `dropdown` or `slider`, out-of-range values on range fields — before the result ever touches the UI.

**Authentication and cloud sync are first-class, not bolted on.** Auth is handled by Supabase (email/password + session cookies via PKCE). A Next.js middleware layer reads the Supabase session on every request and redirects unauthenticated users away from protected routes. Redux Toolkit listeners debounce all form mutations and upsert the active form to Supabase 1 second after the last change — fast enough for real-time feel, cheap enough to avoid per-keystroke writes. The DB is authoritative for logged-in users: on sign-in, `loadFormsFromDB` replaces all in-memory state. Guest state lives in localStorage and is offered for import on first sign-in.

**Multi-step export produces a genuinely different component, not a wrapped version of the single-step one.** The multi-step code generator is a separate code path that emits `useState<FormValues>` instead of `useForm`, replaces the `register`/`Controller` pattern with direct `setValues` handlers, generates a separate Zod schema per step so only the current step's fields are validated on Next, and inlines a `ProgressIndicator` component that renders dots, numbers, labels, or a progress bar depending on the form's settings. Animated transitions use `AnimatePresence` with a directional `variants` object so the slide direction reverses correctly when going back.

**The AI parser is defensive by design.** Gemini occasionally wraps JSON in markdown fences despite a structured output instruction. The parser strips fences, extracts the first `{...}` block, runs Zod validation, then applies a semantic fixup pass — inserting fallback options for choice fields that arrived empty, deriving labels from content or type name, deduplicating validation rules, and clamping range bounds. Type aliases (`dropdown`, `slider`, `hr`, etc.) are normalised before Zod sees them.

**Conditional logic handles cascading visibility correctly.** `getCascadedVisibility` evaluates fields in declaration order and masks the values of already-hidden fields before evaluating downstream rules. Without this, a chain like A→B→C would show C even when A is hidden, because B's value is still in state. A DFS cycle detector (`detectCircularReferences`) runs when conditional rules are edited in the UI, preventing infinite evaluation loops.

**The Redux store is a factory, not a singleton.** `makeStore()` is called once per React tree via `useRef` in `StoreProvider`. The standard pattern of exporting a module-level store instance breaks under Next.js App Router's concurrent SSR — different requests would share state.

**Undo/redo is debounced at the action level.** `updateField` checks `Date.now() - lastUndoPushAt >= 500ms` before pushing a snapshot. Without the debounce, typing in a label field would push 50 snapshots before you finished a word, exhausting the history budget on noise.

## Features

**Fields (20 types)**
- Text inputs: text, textarea, number, email, phone, url, password
- Choice fields: select, multiselect, radio, checkbox, checkbox group
- Temporal: date, time
- Special: file, range/slider, hidden
- Layout: heading (h1–h4), paragraph, divider

**Builder**
- Drag-and-drop from palette and reorder within canvas (@dnd-kit)
- Click to select, inline editing via properties panel
- Duplicate field (clears conditionals to avoid dangling references)
- Undo/redo with 50-step history, debounced at 500ms
- Keyboard shortcuts: `⌘Z`/`⌘⇧Z` undo/redo, `⌘E` export, `⌘G` AI generate, `⌘P` preview toggle, `?` shortcuts modal, `Delete` remove selected field

**Conditional logic**
- Per-field rules: show, hide, or require based on another field's value
- 12 operators: equals, notEquals, contains, notContains, startsWith, endsWith, greaterThan, lessThan, greaterThanOrEquals, lessThanOrEquals, isEmpty, isNotEmpty
- AND/OR combining logic
- Cycle detection via DFS — circular dependencies are blocked in the UI
- Cascading evaluation: hidden field values are masked before downstream rules run

**Multi-step forms**
- Toggle any form between single and multi-step mode without losing fields
- Add, reorder (drag-and-drop), and remove steps; fields are reassigned or unassigned automatically
- Drag fields between steps or use the step assignment dropdown in the properties panel
- Four step indicator styles: dots, numbered, labelled (up to 4 visible), progress bar
- Three step transition animations: slide (direction-aware), fade, none
- Per-step custom Back and Next button labels; back button can be suppressed per step
- Export: each step gets its own Zod schema; validation fires before advancing
- Export includes a self-contained `ProgressIndicator` component, `AnimatePresence`-driven slide transitions, and a submit success state — all in one file

**AI generation** (`⌘G` to open)
- Describe any form in plain English — the AI generates a fully configured, editable schema
- Powered by Gemini 2.5 Flash with JSON-mode output and temperature 0.3 for deterministic structure
- Multi-layer response pipeline: markdown fence stripping → JSON extraction → type alias normalisation → Zod schema validation → semantic repair pass
- Generated form populates the live builder state identically to manual drag-and-drop
- Graceful error handling: quota exhaustion (429), content filter rejections, and malformed JSON each produce a specific, actionable error message
- Requires `GEMINI_API_KEY` — all other features work without it

**Authentication**
- Email/password sign-up and sign-in via Supabase Auth
- PKCE flow with httpOnly session cookies managed by `@supabase/ssr`
- Next.js edge middleware refreshes sessions on every request and protects builder routes
- Guest users can build freely; signing in triggers a one-time migration prompt for any local forms
- Auth state hydrated via `initAuth` thunk on boot; kept in sync with Supabase `onAuthStateChange` listener

**Cloud sync**
- Forms stored in a Supabase Postgres `forms` table (`id`, `user_id`, `title`, `content` JSONB, timestamps)
- Redux Toolkit listener middleware debounces all mutations — upsert fires 1 s after the last change
- Create and delete operations sync immediately (no debounce)
- On sign-in the DB is treated as authoritative: `loadFormsFromDB` replaces in-memory state
- Guests fall back to localStorage via redux-persist; same `FormSchema` shape, seamless migration

**Export**
- React component (TSX): react-hook-form + Zod, react-hook-form + Yup, or (for multi-step) useState + Zod with framer-motion
- HTML snippet: semantic HTML5 with BEM-style CSS classes, no JS
- HTML page: full document with inline CSS and vanilla JS validation
- Copy to clipboard or download as file

**Brand/style**
- Primary color, background, surface, text, error, success, border color
- Font family (Inter, Roboto, Poppins, Open Sans, Lato, Montserrat, system)
- Border radius, input size, label position, spacing scale, form max-width

**Persistence**
- Authenticated users: Supabase Postgres (authoritative)
- Guests: localStorage via redux-persist (key: `formcraft`, version 2)
- Schema migrations: v1→v2 added `stepId`, `mode`, `steps`, `settings`
- UI state (modal visibility, selection, view mode) intentionally excluded from persistence

## Tech stack

| Layer | What | Why |
|---|---|---|
| Framework | Next.js 16.2.4, App Router | API routes for AI generation and auth callback; server-side session handling |
| UI | React 19 | Required by Next 16 |
| Language | TypeScript 5 | Type safety across schema → code generator → exported output |
| Auth | Supabase Auth + `@supabase/ssr` | Email/password with PKCE; SSR-safe session cookies; edge middleware refresh |
| Database | Supabase Postgres | `forms` table with JSONB `content` column; RLS policies per user |
| State | Redux Toolkit + react-redux | Predictable undo/redo snapshots; listener middleware for DB sync |
| Persistence | redux-persist (guests) / Supabase (auth'd) | localStorage fallback for guests; DB authoritative for signed-in users |
| DnD | @dnd-kit/core + @dnd-kit/sortable | Accessible drag-and-drop with pointer and keyboard sensor support |
| Validation | Zod v4 | Used internally to validate AI responses; also emitted in React exports |
| Animation | Framer Motion | Multi-step slide transitions and modal enter/exit animations |
| AI | @google/generative-ai (Gemini 2.5 Flash) | JSON-mode output; Flash is fast enough for interactive use |
| UI components | shadcn/ui + Base UI React | Accessible Radix primitives without opinionated styling overhead |
| Styling | Tailwind CSS v4 | CSS variable tokens defined in globals.css for brand customisation |
| Middleware | Next.js edge middleware | Session refresh + route protection on every request |
| Code preview | react-syntax-highlighter | Syntax-highlighted code display in export modal |
| IDs | nanoid | Short, URL-safe unique IDs for fields, options, validation rules |
| Toasts | sonner | Lightweight toast notifications |

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Dashboard: form grid, create/delete
│   ├── builder/[formId]/page.tsx   # Builder route — hydrates active form from URL param
│   ├── api/
│   │   └── generate/route.ts       # POST /api/generate — Gemini call, Zod validation, transform
│   ├── (auth)/
│   │   ├── layout.tsx              # Two-column auth shell (decorative panel + form card)
│   │   └── auth/
│   │       ├── login/page.tsx      # Email/password sign-in + demo account
│   │       └── register/page.tsx   # Sign-up with email confirmation handling
│   ├── layout.tsx                  # StoreProvider, PersistGate, AuthProvider, fonts
│   └── globals.css                 # Design tokens as CSS variables; Tailwind v4 base
│
├── middleware.ts                   # Edge middleware: session refresh + route protection
│
├── components/
│   ├── layout/
│   │   ├── FormBuilder.tsx         # Three-panel orchestrator; mounts keyboard shortcuts hook
│   │   └── Header.tsx              # Builder header with form title, undo/redo, view mode toggle
│   ├── panels/
│   │   ├── left/
│   │   │   ├── LeftPanel.tsx       # Field palette with category tabs
│   │   │   └── FieldPaletteItem.tsx# Draggable field type item
│   │   ├── center/
│   │   │   ├── CenterCanvas.tsx    # DndContext root; drop zone; step rail
│   │   │   ├── CanvasField.tsx     # Sortable wrapper around FieldCard
│   │   │   ├── FieldCard.tsx       # Field chip with select/delete actions
│   │   │   ├── PreviewField.tsx    # Live rendered preview of a field
│   │   │   ├── StepRail.tsx        # Horizontal step tabs in multi-step mode
│   │   │   └── DragOverlayContent.tsx # Ghost element rendered during drag
│   │   └── right/
│   │       ├── RightPanel.tsx      # Tab router: properties | logic | style
│   │       ├── PropertiesPanel.tsx # Field label, placeholder, helper text, options, validation
│   │       ├── LogicPanel.tsx      # Conditional rules builder; cycle detection UI
│   │       ├── StylePanel.tsx      # Per-field width and label position overrides
│   │       └── StepSettingsPanel.tsx # Step title, nav labels, allow-back toggle
│   ├── modals/
│   │   ├── AIGenerateModal.tsx     # Prompt input, loading state, error display
│   │   ├── ExportModal.tsx         # Format/library picker, syntax-highlighted preview, copy/download
│   │   └── ShortcutsModal.tsx      # Keyboard reference overlay
│   ├── preview/
│   │   └── FormPreview.tsx         # Full live preview with conditional visibility
│   ├── auth/
│   │   └── UserMenu.tsx            # Avatar dropdown (sign out) or Sign in link for guests
│   ├── migration/
│   │   └── LocalStorageMigrationModal.tsx # One-time import prompt on first sign-in
│   └── providers/
│       ├── StoreProvider.tsx       # makeStore() factory via useRef; PersistGate wrapper
│       └── AuthProvider.tsx        # Hydrates auth state; wires Supabase onAuthStateChange
│
├── store/
│   ├── index.ts                    # configureStore factory (makeStore); persistReducer config v2
│   ├── listenerMiddleware.ts       # DB sync listeners: immediate for create/delete, debounced for mutations
│   ├── storage.ts                  # SSR-safe localStorage engine (noop on server)
│   ├── hooks.ts                    # Typed useAppSelector / useAppDispatch
│   └── slices/
│       ├── formSlice.ts            # Form CRUD, field ops, undo/redo, step management, loadFormsFromDB thunk
│       ├── uiSlice.ts              # View mode, selected field, modal visibility flags
│       ├── authSlice.ts            # Auth user shape, initAuth thunk, setUser, signOut
│       └── brandSlice.ts           # BrandConfig (colors, font, spacing, radius)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts               # Server Supabase client (createServerClient, cookies)
│   │   ├── middleware.ts           # updateSession — refreshes token in middleware
│   │   ├── formSync.ts             # fetchUserForms, upsertForm, deleteForm
│   │   └── database.types.ts       # Generated Supabase type definitions
│   ├── codeGenerator.ts            # String-builder code gen: React (single+multi-step) and HTML
│   ├── conditionalEngine.ts        # evaluateVisibility, getCascadedVisibility, detectCircularReferences
│   ├── aiParseResponse.ts          # Multi-layer AI response parser: fence strip → JSON → Zod → semantic fixup
│   ├── aiPrompt.ts                 # Gemini system prompt
│   ├── fieldRegistry.ts            # Field type metadata: icon, category, default config
│   ├── schemaUtils.ts              # importFromJSONSchema, exportToJSONSchema, generateDefaultField
│   ├── localStorage.ts             # getStorageUsage, downloadAllForms, clearAllForms
│   ├── motion.ts                   # Shared Framer Motion spring presets
│   ├── migrations/
│   │   ├── index.ts                # Migration map passed to createMigrate()
│   │   └── v1toV2.ts               # Adds stepId to fields; adds mode/steps/settings to FormSchema
│   ├── dndSensors.ts               # Configured pointer + keyboard sensors for dnd-kit
│   ├── fonts.ts                    # Next.js font instances (Outfit, JetBrains Mono)
│   └── utils.ts                    # cn(), makeNewForm()
│
├── types/
│   ├── form.ts                     # FieldSchema, FormSchema, conditional types, migration types
│   ├── brand.ts                    # BrandConfig, FieldStyleConfig, StyleConfig
│   ├── ui.ts                       # UIState shape
│   └── index.ts                    # Re-exports
│
├── hooks/
│   ├── useKeyboardShortcuts.ts     # Global keydown handler; mounted once in FormBuilder
│   ├── useDebounce.ts              # Generic debounce hook
│   └── useSaveIndicator.ts         # Watches updatedAt to show "Saved" indicator
│
└── constants/
    └── defaults.ts                 # DEFAULT_FORM_SCHEMA, DEFAULT_FORM_SETTINGS, DEFAULT_BRAND_CONFIG
```

**Data flow — field drag from palette to canvas:**

```
User drags FieldPaletteItem
  → dnd-kit DragOverlay renders ghost
  → onDragEnd fires in CenterCanvas
    → dispatch(addField({ field: defaultConfig, index: overIndex }))
      → formSlice.addField pushes undo snapshot, splices field into schema.fields
        → redux-persist serialises new state to localStorage (guests)
        → listenerMiddleware debounce fires after 1 s → upsertForm (authenticated)
          → CenterCanvas re-renders with new CanvasField
```

**Data flow — authentication:**

```
User submits login form
  → supabase.auth.signInWithPassword
    → Supabase sets httpOnly session cookie
      → Next.js middleware reads cookie on next request via updateSession
        → initAuth.fulfilled / setUser dispatched in AuthProvider
          → listenerMiddleware: isAnyOf(initAuth.fulfilled, setUser) fires
            → dispatch(loadFormsFromDB())
              → fetchUserForms(client) reads forms table
                → Redux state replaced with DB forms
                  → LocalStorageMigrationModal shown if local forms exist
```

**Data flow — cloud sync:**

```
User edits a field label (or any other mutation)
  → dispatch(updateField(...))
    → listenerMiddleware debounced listener triggered
      → cancelActiveListeners() — resets 1 s timer
      → delay(1000ms)
        → re-check auth (user may have signed out during burst)
        → getSupabaseClient() — returns null if env vars absent
          → upsertForm(client, schema) — UPSERT ON CONFLICT id
```

**Data flow — export:**

```
User opens ExportModal (⌘E)
  → selectFormSchema reads current FormSchema from Redux
  → useMemo calls generateReactCode(schema, validation)
    → isMultiStepForm? → generateMultiStepReactCode (useState + per-step Zod)
                       → generateReactCode (react-hook-form + Zod/Yup resolver)
      → buildZodChain per field → generateUseVisibilityHook if any conditionals
      → renderField per field → per-type JSX string builder
  → CodePane renders syntax-highlighted output
  → Copy / Download reads the same code string
```

**AI generation flow:**

```
User submits prompt in AIGenerateModal
  → POST /api/generate { prompt }
    → Zod validates request body (3–1000 chars)
    → GoogleGenerativeAI: gemini-2.5-flash, JSON mode, temp 0.3
    → parseAndValidateAIResponse(responseText)
        1. extractJSON: strip fences, find first { ... }
        2. JSON.parse
        3. normaliseFieldType per field (aliases: dropdown→select, etc.)
        4. aiFormSchema.safeParse (Zod)
        5. validateSemantics: fix missing options, clamp ranges, dedupe validations
        6. transformToFormSchema: assign nanoid IDs, camelCase field names
    → { success: true, schema: FormSchema }
  → dispatch(loadSchema(schema)) replaces active form fields
```

## Running locally

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd FormCraft
   npm install
   ```

2. Copy the environment file:
   ```bash
   cp .env.local.example .env.local
   ```

3. Add your credentials to `.env.local`:
   ```
   # Supabase (required for auth + cloud sync)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key

   # Gemini (optional — only needed for AI generation)
   GEMINI_API_KEY=your_key_from_aistudio.google.com
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

The app is fully functional without Supabase credentials — auth and sync are simply disabled and the app falls back to localStorage. AI generation requires `GEMINI_API_KEY`.

## Database schema

```sql
create table forms (
  id          uuid primary key,
  user_id     uuid references auth.users not null,
  title       text not null default '',
  content     jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Row-level security: users can only access their own forms
alter table forms enable row level security;

create policy "Users manage their own forms"
  on forms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint across the codebase |
| `npm run test` | Jest unit tests |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No* | Supabase project URL. Required for auth and cloud sync. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No* | Supabase anon key. Required for auth and cloud sync. |
| `GEMINI_API_KEY` | No | Google AI Studio API key. Used by `POST /api/generate`. Without it the endpoint returns 503; all other features work normally. |

*The app runs without Supabase — it falls back to localStorage-only mode for guests.

## Technical decisions worth mentioning

**Authentication state is owned by Redux, not React context.**

`AuthProvider` mounts once, calls `initAuth` on boot (reads the existing Supabase session), then subscribes to `onAuthStateChange` for live updates. Both paths dispatch `setUser` or `initAuth.fulfilled` to Redux — the rest of the app reads `state.auth.user` via selectors. This means auth state participates in the same Redux DevTools timeline as form state, and listener middleware can react to auth changes (loading forms on sign-in) without any prop-drilling or context nesting.

**DB sync uses listener middleware, not sagas or thunks inside reducers.**

RTK Listener middleware sits outside the reducer pipeline and has access to `getState()`, `dispatch()`, and async operations. This makes it the right place for side effects like DB writes — the reducer stays pure, and the listener can cancel in-flight calls when new mutations arrive (the debounce pattern). Using a thunk inside each action creator would require every caller to `await dispatch(addField(...))` and handle the async case, which bleeds sync concerns into the UI layer.

**The localStorage→Supabase migration is one-time and opt-in.**

On first sign-in, `AuthProvider` checks `localStorage` for forms that predate the current user session. If any exist, `LocalStorageMigrationModal` appears with a preview and two choices: import all local forms into the DB, or discard them. A per-user flag in `localStorage` ensures this prompt only appears once. This avoids silently overwriting user data and gives the user control over what happens to their local work.

**The code generator emits two completely different component shapes for single vs. multi-step forms.**

Single-step exports use react-hook-form with a `zodResolver` or `yupResolver`, `register()`/`Controller` for each field, and `handleSubmit`. Multi-step exports have no react-hook-form dependency at all — they use `useState<FormValues>` and validate per-step with `stepSchemas[idx].safeParse(values)` before advancing. This made sense because react-hook-form's step-form story requires either a context wrapper or a `trigger()` hack; the plain-state approach is simpler to read and has no dependency beyond `framer-motion` and `zod`.

**Conditional visibility is evaluated against masked values, not raw values.**

The naive approach reads live form values to decide whether each field is visible. This breaks when fields form a chain — if A hides B, and B's value was the trigger for showing C, then hiding A should also hide C. `getCascadedVisibility` evaluates fields in declaration order and passes `undefined` for any field already computed as hidden:

```ts
for (const field of fields) {
  const maskedValues: Record<string, unknown> = {};
  for (const [id, val] of Object.entries(formValues)) {
    maskedValues[id] = visibility[id] === false ? undefined : val;
  }
  visibility[field.id] = evaluateVisibility(field.id, fields, maskedValues);
}
```

**The undo snapshot only covers fields, steps, and mode — not brand config or UI state.**

`FormSnapshot` holds `{ fields, steps, mode }`. Brand changes are in a separate Redux slice that is persisted but has no undo. Modal state, selection, and view mode are in `uiSlice` which is explicitly excluded from redux-persist. Including brand in undo would require users to undo accidentally changing the primary color when they meant to undo a field deletion.

**The AI pipeline treats the model as an untrusted data source.**

The fundamental design decision is that the AI response is validated and repaired before anything is dispatched to Redux. The parser runs five stages: strip markdown fences, extract the first `{...}` block, normalise field type strings against a known alias map, validate with Zod, then run a semantic repair pass. Only after all five stages succeed does the schema reach the canvas.

**Field deletion cleans up conditional references eagerly.**

When a field is deleted, `removeField` iterates every remaining field's conditional rules and removes any rule that references the deleted field's ID. If removing rules empties the rules array, `conditional.enabled` is set to `false`. Without this, stale `sourceFieldId`s would leave conditionals enabled with no rules — which evaluates as always-visible, masking the original intent.

## Things I'd do differently at scale

**The code generator has no test coverage.** `codeGenerator.ts` is the most complex file in the project, and its correctness is verified entirely by manual inspection. The right approach would be snapshot tests: for each field type, assert that `generateReactCode` produces the exact expected string against a fixture schema.

**Conditional cycle detection runs on every rule update.** `detectCircularReferences` does a full DFS over all fields when any conditional rule changes. With 200+ fields this would become noticeable. The fix would be incremental: only re-run DFS from the field whose rules changed.

**There's no import path for an existing form's JSON.** The `importFromJSONSchema` utility in `schemaUtils.ts` exists but isn't wired to any UI.

**Per-step validation in the multi-step export is not aware of conditionally hidden fields.** If a required field is conditionally hidden on step 2, the step schema still includes it and `safeParse` fails when the user tries to advance. The fix would be to strip hidden field names from the step schema before calling `safeParse`.

## Licence

MIT
