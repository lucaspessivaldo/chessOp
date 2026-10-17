import { lazy, Suspense } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Github } from 'lucide-react'
import { Navbar, Logo } from '@/components/navbar'
import { cn } from '@/lib/utils'

const BoardPreview = lazy(() => import('@/components/board-preview'))

export const Route = createFileRoute('/')({
  component: HomePage,
})

const modes = [
  { piece: '♟', title: 'Study', level: 1, text: 'Walk through every line with arrows and your own notes on why each move is played.' },
  { piece: '♞', title: 'Practice', level: 2, text: 'Play from memory while the opponent answers. Mistakes get instant feedback and hints.' },
  { piece: '♛', title: 'Review', level: 3, text: 'Positions you miss come back at growing intervals until they stick for good.' },
]

const features = [
  { title: 'Custom trainings', text: 'Mix openings — White and Black, whole or hand-picked lines — into one session.' },
  { title: 'Speed drill', text: 'Every line back to back against the clock. Beat your personal best.' },
  { title: 'Stockfish 19', text: 'Evaluation bar and top engine lines while you build your repertoire.' },
  { title: 'Lichess explorer', text: 'See what real players choose in each position.' },
  { title: 'PGN in & out', text: 'Import studies with variations and comments, export them anywhere.' },
  { title: 'Your board', text: 'Pick the board colors you train best with. Light and dark themes.' },
]

/** Black call-to-action with a separate arrow cell, like a button bar */
function CtaLink({ to, children, tone = 'action' }: { to: '/openings'; children: string; tone?: 'action' | 'light' }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex h-14 w-full items-stretch text-sm font-semibold uppercase tracking-wider sm:w-auto',
        tone === 'action' ? 'bg-action text-action-foreground' : 'bg-white text-black'
      )}
    >
      <span className="flex flex-1 items-center px-6">{children}</span>
      <span className="flex w-14 items-center justify-center border-l border-black/15">
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  )
}

function LevelBars({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map(i => (
        <span key={i} className={cn('w-1.5 border border-current', i <= level ? 'bg-current' : '')} style={{ height: 4 + i * 3 }} />
      ))}
    </span>
  )
}

function HomePage() {
  return (
    <div className="min-h-full bg-surface-0 text-text-primary">
      <Navbar />

      {/* Hero — always black */}
      <section className="relative overflow-hidden bg-[#0b0b0b] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-32">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            <span className="text-base text-white">♚</span> Opening trainer · free & open source
          </p>
          <h1 className="mt-4 font-display text-[22vw] leading-[0.82] sm:text-[18vw] lg:text-[13rem]">Openings</h1>

          <div className="mt-10 grid items-end gap-12 lg:grid-cols-[1fr_440px]">
            <div className="border-l border-white/40 pl-6">
              <p className="font-display text-4xl leading-[1.05] text-white md:text-5xl">
                Learn.
                <br />
                Practice.
                <br />
                Remember.
              </p>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
                Build your repertoire, play it from memory and review the positions you miss with spaced repetition.
                No account — everything stays in your browser.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CtaLink to="/openings">Start training</CtaLink>
                <a
                  href="#how"
                  className="inline-flex h-14 items-center justify-center border border-white/40 px-6 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-white"
                >
                  How it works
                </a>
              </div>
            </div>

            <figure className="mx-auto w-full max-w-[440px]">
              <div className="border border-white/15 p-2">
                <div className="aspect-square w-full">
                  <Suspense fallback={<div className="h-full w-full bg-white/5" />}>
                    <BoardPreview />
                  </Suspense>
                </div>
              </div>
              <figcaption className="mt-3 flex items-baseline justify-between gap-4 text-xs text-white/60">
                <span className="font-semibold uppercase tracking-wider text-white">Caro-Kann · 5…Bg6</span>
                <span>Keep the bishop on the h7–b1 diagonal.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-5xl md:text-7xl">
            Three steps
            <br />
            to every line
          </h2>
          <p className="max-w-sm text-text-secondary">
            Knowing a line once isn't the goal. Each mode removes a bit more help until you play it on your own.
          </p>
        </div>

        <ol className="mt-12 space-y-4">
          {modes.map((mode, i) => (
            <li
              key={mode.title}
              className={cn(
                'flex items-center gap-5 border p-5 md:gap-8 md:p-7',
                i === 1 ? 'border-ink bg-ink text-ink-foreground' : 'border-border-strong'
              )}
            >
              <span className="w-12 text-center text-5xl leading-none md:w-16 md:text-6xl" aria-hidden>{mode.piece}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-3xl md:text-4xl">{mode.title}</h3>
                  <LevelBars level={mode.level} />
                </div>
                <p className={cn('mt-1.5 max-w-xl text-sm md:text-base', i === 1 ? 'opacity-75' : 'text-text-secondary')}>{mode.text}</p>
              </div>
              <span className="hidden font-mono text-sm opacity-50 sm:block">0{i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="border-t border-border-strong">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="font-display text-4xl md:text-5xl">And everything around it</h2>
          <div className="mt-10 grid border-l border-t border-border-strong sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div key={feature.title} className="border-b border-r border-border-strong p-6">
                <span className="font-mono text-xs text-text-muted">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wider">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA — black */}
      <section className="bg-[#0b0b0b] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 md:flex-row md:items-end md:justify-between md:px-6 md:py-24">
          <h2 className="font-display text-5xl md:text-7xl">
            Your next game
            <br />
            starts in the opening.
          </h2>
          <CtaLink to="/openings">Build your repertoire</CtaLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-strong">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs font-medium uppercase tracking-wider text-text-muted md:flex-row md:px-6">
          <Logo />
          <div className="flex items-center gap-6">
            <Link to="/openings" className="transition-colors hover:text-text-primary">Openings</Link>
            <a
              href="https://github.com/lucaspessivaldo/chessOp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-text-primary"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <span>GPL-3.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
