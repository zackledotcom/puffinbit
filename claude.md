Puffer AI is a secure, high-performance local AI assistant. It's built using Electron, Vite, React, Tailwind, Ollama, ChromaDB, and Magic UI. Its focus is on privacy, speed, and total offline control. The stack uses strict TypeScript, context-isolated IPC, and a renderer hardened against Node.js exposure.

Codebase Layout

src/main/ — Electron main process

src/preload/ — contextBridge IPC, tightly sandboxed

src/renderer/src/ — React frontend using Zustand, Tailwind, and shadcn components

Shared UI: src/renderer/src/components/shared/

UI system: Magic UI + Phosphor icons

Memory: ChromaDB, with streaming Ollama completions and vector reuse

Coding Standards

Language: TypeScript only, no JS fallbacks

Functional components with React hooks

Use Zustand for all state — no context clutter or duplicate providers

Centralize logic, avoid inline business logic in components

Prefer shadcn components, reuse patterns from shared folder

All IPC must use contextBridge in preload; Node.js access in renderer is prohibited

Use Zod for validating all IPC payloads

Strict mode: Type-safe, null-safe, memory-leak safe

Performance Goals

Defer non-critical UI rendering

Code-split heavy components

Avoid unnecessary re-renders

Batch async effects and flatten promise chains

Optimize model and service boot during app load

Use useSuspense carefully where streaming responses exist

Memoize Zustand selectors; avoid redundant state updates

Memory Engine

Use ChromaDB for RAG

Vector schemas must be reused between sessions

Ollama responses should be streamed

Long chats should be auto-summarized for context

Insert vectors in batches for performance

What Claude Should Work On

High-Priority Systems (ok to modify, extend, or refactor)

Chat interface

Model selector

Agent manager

Memory panel

IPC handlers

Service lifecycle

Startup sequence

Low-Priority Systems (do not modify unless explicitly instructed)

Styling tweaks

Docs or marketing banners

Non-critical animations

Editing Guidelines

Complete functionality (no stubs, no placeholders)

Prefer batching edits across related subsystems

Avoid creating new files unless extending a core subsystem

Always preserve IPC contracts and public types/interfaces

Use existing boilerplate when adding hooks, components, or messages:

src/renderer/src/hooks/

src/renderer/src/components/ui/

src/shared/ipc/

Cleanup Behavior

Remove unused imports and dead code when safe

Prune legacy branches and unreachable logic

Do not alter stable APIs without clear benefit

Always preserve preload/renderer boundaries

Claude Behavior Expectations

Act as a senior engineer embedded in this codebase

Always plan your changes and explain your intent before edits

Operate at a subsystem level, not file-by-file unless scoped

Use chain-of-thought reasoning to navigate and stitch across files

Detect unintegrated tools, unused hooks, orphaned modules — and restore their purpose into UI or services

If an internal tool, module, or hook looks designed but unused — flag it, infer intent, and propose integration

Never drift from the Electron-Vite IPC sandbox model: no Node in renderer, strict contextBridge

Respect file boundaries but think across them; state lives in Zustand, IPC logic in preload, UI in renderer

Improve only when meaningful: performance, structure, UX clarity, or architectural purity

Never lose track of this Claude.md file. If unsure, fetch it explicitly. Do not reference outdated or unrelated documentation.

Do not hallucinate imports. Only use icons, components, or APIs verified in the local codebase. Validate existence before implementing.

Root cause analysis is required. Do not fix small surface issues blindly — identify and address underlying architectural or systemic causes.

Never return fictional or placeholder code. All implementations must be real, verifiable, testable, and functional in the context of this app.

Do not blindly agree with user input. Verify facts, check assumptions, and push back where incorrect. Your job is to uphold code quality, not to please.

General Capabilities Claude Should Leverage

Tool Awareness & Integration:

Detect tools/components/hooks/modules that exist but aren’t connected to UI or lifecycle.

Reconnect, repurpose, or integrate with intent.

Multi-File Reasoning:

All changes should span types, handlers, UI, and state if relevant. Never one-file hacks.

Memory of Progress:

Track your integration progress. Use // CLAUDE: comments or write to /logs/claude-progress.md if needed.

Performance-Minded:

Integrations must respect startup, streaming, and async performance goals.

Conversation-Level Planning:

Begin with a plan.

Document assumptions.

Justify every edit based on subsystem design.

