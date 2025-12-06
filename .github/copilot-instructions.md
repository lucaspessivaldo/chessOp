# ChessOp - Copilot Instructions

A web application to practice chess openings. Users can study, repeat, save, and train opening lines.

## Tech Stack

- **Build Tool:** Vite
- **Runtime / Package Manager:** Bun
- **Language:** TypeScript (strict)
- **Routing:** TanStack Router (file-based routing)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** lucide-react
- **Chess Logic:** `@jackstenglein/chess` — legal moves, PGN parsing, variations, position evaluation
- **Chess Board UI:** Lichess Chessground (`chessground`) — rendering, drag-and-drop, animations, highlighting

## Rules

### 1. Always Check Existing Library Features First

Before creating any logic for move validation, legal moves, PGN parsing, variation handling, board state, UI interactions, drag-and-drop, highlighting, arrows, markers, or premoves — **first check if the feature exists in:**

**`@jackstenglein/chess`:** move generation, legal move validation, PGN parsing/serialization/exporting, opening variations, check/checkmate detection, FEN parsing, undo/redo

**Lichess Chessground:** board rendering, animations, dragging pieces, move input, highlighting, premoves, interactions, coordinates, move events

> If the library provides the feature, use the built-in API instead of custom logic.

**Important:** `@lichess-org/chessground` is a vanilla JS library, NOT a React component. You must create a React wrapper component that:
- Uses `useRef` to hold the DOM container element
- Uses `useEffect` to initialize and destroy the Chessground instance
- Exposes the Chessground API via ref or callbacks for parent components to control

### 2. Use the Project Stack Consistently

- **Vite** → dev server and building
- **Bun** → use Bun APIs, not Node-specific ones
- **TypeScript** → strict typing
- **TanStack Router** → file-based routing in `/src/routes/`
- **Tailwind CSS** → no raw CSS unless necessary
- **Chessground** → all board UI (rendering, interactions, highlights, animations)
- **shadcn/ui** → UI components
- **lucide-react** → icons
- **React** → functional components with hooks

> Avoid Next.js or Node unless explicitly required.

### 3. File Structure and Conventions

```
/src
  /components    → UI components
  /hooks         → State logic and custom hooks
  /lib           → Utility functions
  /data/openings → Opening data
  /chess         → Board logic
```

**Naming:**
- Files: `kebab-case` (e.g., `opening-trainer.tsx`)
- Variables/Functions: `camelCase` (e.g., `getNextMove()`)
- Components: `PascalCase` (e.g., `OpeningTrainer`)
- ❌ No `snake_case`

### 4. Error Handling

- Use safeguards when parsing PGN or user-defined openings
- Always validate moves using `@jackstenglein/chess`
- Catch PGN errors and show friendly messages
- Never trust user input without validation

### 5. Output Style

- Be direct, clear, and non-poetic
- Provide ready-to-paste code
- Include short explanations when needed
- Prefer minimal examples
- Avoid overengineering
- Use project libraries instead of reinventing functions
