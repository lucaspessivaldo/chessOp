import { createFileRoute, Link } from '@tanstack/react-router'
import { Brain, GitBranch, Swords, Trophy, Zap, Github } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/navbar'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-surface-0 text-text-primary selection:bg-accent-blue/30">
      <Navbar />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent-blue/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-blue/5 blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative flex items-center justify-center w-full pt-24 pb-20 md:pt-32 md:pb-28 min-h-[90vh] overflow-hidden">
          {/* Chess grid background pattern */}
          <div className="absolute inset-0 chess-grid-bg opacity-60" />
          <div className="absolute inset-0 bg-linear-to-b from-surface-0 via-transparent to-surface-0" />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-1 border border-border-subtle text-sm text-text-secondary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-success"></span>
                </span>
                Free &amp; Open Source
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                Master Your <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-blue via-[oklch(0.72_0.15_220)] to-accent-blue">
                  Chess Openings
                </span>
              </h1>

              <p className="text-lg md:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                Build your repertoire, drill variations with spaced repetition,
                and track your progress — all from the browser.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <Link
                  to="/openings"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-13 px-8 min-w-[200px] text-base rounded-lg bg-accent-blue text-white hover:bg-accent-blue-hover transition-all shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/30"
                  )}
                >
                  Start Training
                </Link>
                <a
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-13 px-8 text-base rounded-lg text-text-secondary hover:text-text-primary"
                  )}
                >
                  See Features
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Everything You Need to Master Openings
              </h2>
              <p className="text-text-secondary">
                A focused set of tools for building, studying, and retaining your opening repertoire.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {/* Feature 1 — Spaced Repetition */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-6 md:p-8 hover:border-accent-blue/30 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-accent-blue/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-accent-blue/15 flex items-center justify-center mb-4">
                    <Brain className="w-5 h-5 text-accent-blue" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Spaced Repetition</h3>
                  <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
                    Mistakes are tracked automatically and scheduled for review with increasing intervals.
                    You focus on what you actually forget.
                  </p>
                </div>
                {/* Decorative curve */}
                <div className="absolute right-0 bottom-0 w-1/3 h-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-accent-blue fill-current">
                    <path d="M20,180 C20,180 60,60 100,60 C140,60 180,180 180,180" stroke="currentColor" strokeWidth="3" fill="none" />
                    <circle cx="100" cy="60" r="4" />
                  </svg>
                </div>
              </div>

              {/* Feature 2 — Variation Explorer (tall) */}
              <div className="lg:row-span-2 group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-6 md:p-8 hover:border-[oklch(0.65_0.15_170)]/30 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-[oklch(0.65_0.15_170)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.65_0.15_170)]/15 flex items-center justify-center mb-4">
                    <GitBranch className="w-5 h-5 text-[oklch(0.65_0.15_170)]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Variation Explorer</h3>
                  <p className="text-text-secondary text-sm leading-relaxed mb-6">
                    Visualize your repertoire as an interactive tree.
                    See where lines branch, find transpositions, and spot gaps.
                  </p>
                  {/* Mini tree diagram */}
                  <div className="mt-auto relative h-40 w-full rounded-xl bg-surface-0 border border-border-subtle overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" fill="none">
                      <circle cx="100" cy="16" r="4" fill="oklch(0.65 0.15 170)" />
                      <line x1="100" y1="20" x2="60" y2="48" stroke="oklch(1 0 0 / 0.12)" strokeWidth="1.5" />
                      <line x1="100" y1="20" x2="140" y2="48" stroke="oklch(1 0 0 / 0.12)" strokeWidth="1.5" />
                      <circle cx="60" cy="52" r="3" fill="oklch(1 0 0 / 0.2)" />
                      <circle cx="140" cy="52" r="3" fill="oklch(1 0 0 / 0.2)" />
                      <line x1="60" y1="55" x2="35" y2="82" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1.5" />
                      <line x1="60" y1="55" x2="80" y2="82" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1.5" />
                      <line x1="140" y1="55" x2="120" y2="82" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1.5" />
                      <line x1="140" y1="55" x2="165" y2="82" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1.5" />
                      <circle cx="35" cy="86" r="2.5" fill="oklch(1 0 0 / 0.12)" />
                      <circle cx="80" cy="86" r="2.5" fill="oklch(1 0 0 / 0.12)" />
                      <circle cx="120" cy="86" r="2.5" fill="oklch(1 0 0 / 0.12)" />
                      <circle cx="165" cy="86" r="2.5" fill="oklch(1 0 0 / 0.12)" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Feature 3 — Practice Mode */}
              <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-6 md:p-8 hover:border-accent-success/30 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-accent-success/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-accent-success/15 flex items-center justify-center mb-4">
                    <Swords className="w-5 h-5 text-accent-success" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Practice Mode</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Play through your lines from memory. Wrong moves get instant feedback with progressive hints.
                  </p>
                </div>
              </div>

              {/* Feature 4 — Speed Drill */}
              <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-6 md:p-8 hover:border-accent-warning/30 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-accent-warning/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-accent-warning/15 flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-accent-warning" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Speed Drill</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Race against the clock. Blitz through all your lines and track accuracy and time per move.
                  </p>
                </div>
              </div>

              {/* Feature 5 — Progress Tracking (full width) */}
              <div className="lg:col-span-3 group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-6 md:p-8 hover:border-accent-blue/30 transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-r from-accent-blue/5 via-transparent to-accent-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/15 flex items-center justify-center mb-4 md:mb-3">
                      <Trophy className="w-5 h-5 text-accent-blue" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
                      See completion rates per line, accuracy stats, and review schedules at a glance.
                      Everything is saved locally in your browser.
                    </p>
                  </div>
                  {/* Mini progress bars */}
                  <div className="shrink-0 w-full md:w-64 space-y-3">
                    {[
                      { name: 'Sicilian Defense', pct: 85, color: 'bg-accent-success' },
                      { name: "Queen's Gambit", pct: 60, color: 'bg-accent-blue' },
                      { name: 'Caro-Kann', pct: 35, color: 'bg-accent-warning' },
                    ].map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-secondary">{item.name}</span>
                          <span className="text-text-muted">{item.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent-blue/3" />
          <div className="absolute inset-0 chess-grid-bg opacity-30" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Ready to build your <br />
                <span className="text-accent-blue">repertoire?</span>
              </h2>
              <p className="text-lg text-text-secondary mb-10 max-w-xl mx-auto">
                Start creating your opening studies now. No account needed — everything runs in your browser.
              </p>
              <Link
                to="/openings"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-13 px-10 text-base rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white shadow-lg shadow-accent-blue/20"
                )}
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-surface-1/40 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M19 22H5v-2h14v2M13 2c-1.25 0-2.42.62-3.11 1.66L7 8l2 2 2.06-2.06C11.28 8.72 12 9.81 12 11v5h2V11c0-1.06-.27-2.07-.75-2.94L17 4.5 15.5 3l-2.06 2.06C13.16 4.44 12.87 4 12.5 3.65 12.08 3.25 11.55 3 11 3h2V2z" />
                  </svg>
                </div>
                <span className="font-bold text-text-primary">ChessOp</span>
              </div>

              <div className="flex items-center gap-6 text-sm text-text-muted">
                <Link to="/openings" className="hover:text-text-secondary transition-colors">Openings</Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-text-secondary transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </div>

              <p className="text-xs text-text-muted">
                © {new Date().getFullYear()} ChessOp
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
