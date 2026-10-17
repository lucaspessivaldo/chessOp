# ChessOp — Chess Opening Trainer

Build your opening repertoire and actually remember it. ChessOp runs entirely in the browser:
no account, no backend — your studies are stored in `localStorage`.

## Training flow

1. **Build** a study — start from a starter repertoire, paste a PGN, or play moves in the editor
   (with the Lichess opening explorer to see what real players choose).
2. **Study** — walk through every line with arrows and your own comments explaining each move.
3. **Practice** — play the lines from memory against automatic replies. Wrong moves get instant
   feedback and progressive hints (piece → full move).
4. **Mistakes** — every position you get wrong is scheduled with spaced repetition
   (1h → 4h → 12h → 1d → 2d …). Clean answers push it further out; mistakes bring it back.
5. **Speed drill** — all lines back to back in random order, against the clock, with personal bests.

### Other features

- Stockfish 19 in the editor (WASM, lite single-threaded, ~1.9 MB loaded on demand): evaluation bar,
  top 3 lines and best-move arrow; click a line to add its move
- PGN import (merge or replace) and export, with variations, comments and annotations (`!`, `?!`, …)
- Entry point: start practice from a given position (earlier moves become a single setup line)
- Interactive tree graph of the repertoire, arrows/circles drawn on the board saved per move
- Mastery per study (share of lines whose last practice was perfect)
- Keyboard shortcuts: `H` hint, `R` retry, `Enter`/`→` next line, `L` lines list;
  in the editor `←/→/Home/End`, `Ctrl+Z`/`Ctrl+Y`, `Ctrl+S`, `Del`
- Responsive layout for phones and desktop, sound toggle

### Lichess explorer

The Lichess opening explorer API now requires authentication. In the editor's **Explorer** tab, create a
free personal token on lichess.org (no scopes needed) and paste it — it is stored only in your browser.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev       # start the dev server
bun run build     # type-check and build to dist/
bun run lint
```

### Stack

Vite · React 19 · TypeScript · TanStack Router (file-based) · Tailwind CSS v4 ·
[`@lichess-org/chessground`](https://github.com/lichess-org/chessground) (board) ·
[`@jackstenglein/chess`](https://github.com/jackstenglein/chess) (rules, PGN with variations) ·
[Stockfish.js](https://github.com/nmrugg/stockfish.js) (engine, in a Web Worker) ·
React Flow + dagre (tree graph, lazy-loaded)

### Project structure

```
src/
  routes/               TanStack file routes (/, /openings)
  components/
    pages/              /openings page (lazy-loaded)
    modes/              Study, Practice, Speed drill, Mistakes views + study page shell
    opening/            Editor, selector, move lists, explorer panel, tree graph, PGN panel
    training/           Shared training UI (buttons, progress, banners)
    game-layout.tsx     Responsive board + sidebar layout (renders a single board)
    chessground.tsx     React wrapper around Chessground
  hooks/
    use-line-player.ts  Core engine: plays a line, validates user moves, answers for the opponent
    use-opening-*.ts    Mode hooks built on top of the line player
  lib/                  PGN/tree utilities, storage (studies, progress, mistakes, settings), sounds
  data/openings/        Starter repertoires
```

## License

GPL-3.0
