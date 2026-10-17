import { lazy, Suspense } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Brain, Database, FileText, Github, Swords, Zap, type LucideIcon } from 'lucide-react'
import { Navbar, Logo } from '@/components/navbar'

const BoardPreview = lazy(() => import('@/components/board-preview'))

export const Route = createFileRoute('/')({
  component: HomePage,
})

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BookOpen,
    title: 'Guided study',
    text: 'Walk through every line with arrows and your own notes explaining why each move is played.',
  },
  {
    icon: Swords,
    title: 'Practice from memory',
    text: 'Play your moves while the opponent answers. Mistakes get instant feedback and progressive hints.',
  },
  {
    icon: Brain,
    title: 'Spaced repetition',
    text: 'Positions you miss come back at growing intervals, so you review what you actually forget.',
  },
  {
    icon: Zap,
    title: 'Speed drill',
    text: 'Every line back to back against the clock. Track accuracy and beat your personal best.',
  },
  {
    icon: Database,
    title: 'Lichess explorer',
    text: 'See what real players choose in each position while you build your repertoire.',
  },
  {
    icon: FileText,
    title: 'PGN in and out',
    text: 'Import studies with variations and comments, or export your repertoire to use anywhere.',
  },
]

const steps = [
  { title: 'Build', text: 'Pick a starter repertoire, paste a PGN or play the moves yourself.' },
  { title: 'Practice', text: 'Play each line from memory until it sticks.' },
  { title: 'Review', text: 'Fix the positions you got wrong when they are due.' },
]

const primaryLink =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90'

function HomePage() {
  return (
    <div className="min-h-full bg-surface-0 text-text-primary">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-28 md:px-6 md:pt-36 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="mb-4 text-sm font-medium text-text-secondary">Chess opening trainer · free &amp; open source</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.5rem]">
            Learn your openings.
            <br />
            <span className="text-text-muted">Remember them at the board.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary md:text-lg">
            Build a repertoire, practice it from memory and review the positions you miss with spaced repetition.
            No account — everything stays in your browser.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/openings" className={primaryLink}>
              Start training <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border-strong px-5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
            >
              See how it works
            </a>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-1 shadow-sm">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5 text-xs">
              <span className="font-medium">Caro-Kann Defense</span>
              <span className="text-text-muted">Line 1 of 5 · Study</span>
            </div>
            <div className="aspect-square w-full">
              <Suspense fallback={<div className="h-full w-full bg-surface-2" />}>
                <BoardPreview />
              </Suspense>
            </div>
            <figcaption className="border-t border-border-subtle px-4 py-3 text-sm text-text-secondary">
              <span className="font-mono font-medium text-text-primary">5…Bg6</span> — keep the bishop on the
              h7–b1 diagonal, out of reach of the knight.
            </figcaption>
          </div>
        </figure>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border-subtle bg-surface-1/50">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Built for retention</h2>
            <p className="mt-3 text-text-secondary">
              Knowing a line once isn't the goal. Every mode is designed to make it stick.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-surface-1 p-6">
                <Icon className="h-5 w-5 text-text-secondary" />
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-border-strong pt-5">
                <span className="font-mono text-xs text-text-muted">0{index + 1}</span>
                <h3 className="mt-2 font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.text}</p>
              </li>
            ))}
          </ol>
          <Link to="/openings" className={`${primaryLink} mt-12`}>
            Build your repertoire <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-text-muted md:flex-row md:px-6">
          <Logo />
          <div className="flex items-center gap-6">
            <Link to="/openings" className="transition-colors hover:text-text-primary">Repertoire</Link>
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
