import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Globe,
  Layout,
  Swords,
  Trophy,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-violet-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] rounded-full bg-slate-900/50 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-sm text-slate-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                The Future of Opening Preparation
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                Forge Your <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-fuchsia-400 to-indigo-400">
                  Grandmaster Repertoire
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                Stop memorizing blindly. Understand the plans, master the patterns, and punish every mistake with our spaced-repetition engine.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <Link
                  to="/puzzles"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-14 px-8 text-lg rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105"
                  )}
                >
                  Start Training Free
                </Link>
                <Link
                  to="/openings"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-14 px-8 text-lg rounded-full border-slate-800 bg-slate-950/50 text-slate-300 hover:bg-slate-900 hover:text-white transition-all"
                  )}
                >
                  Explore Openings
                </Link>
              </div>
            </div>

            {/* Hero Visual - Abstract Board */}
            <div className="mt-20 relative max-w-5xl mx-auto perspective-1000 animate-in fade-in zoom-in duration-1000 delay-500">
              <div className="relative transform rotate-x-12 scale-95 border border-slate-800 bg-slate-900/80 backdrop-blur-xl rounded-xl shadow-2xl shadow-violet-900/20 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-violet-500/5 to-transparent pointer-events-none" />

                {/* Mock UI Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                  </div>
                  <div className="text-xs font-mono text-slate-500">Sicilian Defense: Najdorf Variation</div>
                </div>

                {/* Mock UI Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[400px] md:min-h-[600px]">
                  {/* Sidebar */}
                  <div className="hidden md:block md:col-span-3 border-r border-slate-800 p-6 space-y-4">
                    <div className="h-8 w-3/4 bg-slate-800/50 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-800/30 rounded animate-pulse" />
                    <div className="space-y-2 mt-8">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 transition-colors cursor-default">
                          <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs text-slate-500">{i}.</div>
                          <div className="h-4 w-16 bg-slate-800/50 rounded" />
                          <div className="h-4 w-16 bg-slate-800/50 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Board Area */}
                  <div className="col-span-1 md:col-span-6 bg-slate-950/50 flex items-center justify-center p-8 relative">
                    {/* Abstract Board Grid */}
                    <div className="w-full max-w-[400px] aspect-square grid grid-cols-8 grid-rows-8 border border-slate-800">
                      {Array.from({ length: 64 }).map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isDark = (row + col) % 2 === 1;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "w-full h-full",
                              isDark ? "bg-slate-800/30" : "bg-transparent"
                            )}
                          />
                        )
                      })}
                      {/* Highlighted Move */}
                      <div className="absolute top-[50%] left-[37.5%] w-[12.5%] h-[12.5%] bg-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse" />
                      <div className="absolute top-[37.5%] left-[37.5%] w-[12.5%] h-[12.5%] border-2 border-violet-500/40" />
                    </div>
                  </div>

                  {/* Analysis Panel */}
                  <div className="hidden md:block md:col-span-3 border-l border-slate-800 p-6">
                    <div className="flex items-center gap-2 mb-6 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Excellent Move</span>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">Evaluation</div>
                        <div className="text-2xl font-mono font-bold text-slate-200">+0.45</div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">Best Line</div>
                        <div className="text-sm font-mono text-slate-300">e4 c5 Nf3 d6 d4 cxd4</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition / Bento Grid */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Complete Opening Mastery
              </h2>
              <p className="text-lg text-slate-400">
                A comprehensive suite of tools designed to take you from beginner to theory expert.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Large Card */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-violet-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 text-violet-400">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Spaced Repetition System</h3>
                  <p className="text-slate-400 max-w-md">
                    Our algorithm tracks every move you make. Mistakes are reviewed immediately, while mastered lines are scheduled for review just before you're likely to forget them.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg viewBox="0 0 200 200" className="w-full h-full text-violet-500 fill-current">
                    <path d="M40,160 C40,160 80,80 100,80 C120,80 160,160 160,160" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>

              {/* Tall Card */}
              <div className="md:row-span-2 group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-emerald-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                    <Layout className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Variation Explorer</h3>
                  <p className="text-slate-400 mb-8">
                    Visualize your repertoire as a tree. See where lines diverge, identify transpositions, and spot gaps in your preparation.
                  </p>
                  <div className="mt-auto relative h-48 w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                    {/* Abstract Tree Visualization */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="absolute top-12 left-1/3 w-2 h-2 rounded-full bg-slate-700" />
                    <div className="absolute top-12 right-1/3 w-2 h-2 rounded-full bg-slate-700" />
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800">
                      <path d="M50% 24 L33% 48" />
                      <path d="M50% 24 L66% 48" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Small Card 1 */}
              <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-blue-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-400">
                    <Swords className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Practice Mode</h3>
                  <p className="text-slate-400 text-sm">
                    Test your memory against the computer without hints.
                  </p>
                </div>
              </div>

              {/* Small Card 2 */}
              <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 text-amber-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
                  <p className="text-slate-400 text-sm">
                    Visualize your mastery level for each opening.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Openings / Quick Start */}
        <section className="py-24 border-t border-slate-900 bg-slate-950/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Start Your Journey</h2>
                <p className="text-slate-400">Browse our curated library of top-tier opening lines.</p>
              </div>
              <Link
                to="/openings"
                className="flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                View all openings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Sicilian Defense", moves: "1. e4 c5", difficulty: "Hard", color: "text-red-400" },
                { name: "Queen's Gambit", moves: "1. d4 d5 2. c4", difficulty: "Medium", color: "text-blue-400" },
                { name: "Ruy Lopez", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5", difficulty: "Hard", color: "text-amber-400" },
                { name: "Caro-Kann", moves: "1. e4 c6", difficulty: "Medium", color: "text-emerald-400" },
              ].map((opening) => (
                <Link
                  key={opening.name}
                  to="/openings"
                  className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900 hover:border-slate-700 transition-all hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                      <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full bg-slate-950 border border-slate-800", opening.color)}>
                      {opening.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-violet-400 transition-colors">{opening.name}</h3>
                  <p className="text-sm font-mono text-slate-500">{opening.moves}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-900/10" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
                Ready to make your <br />
                <span className="text-violet-400">best move?</span>
              </h2>
              <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                Join thousands of players who have elevated their game with ChessOp.
                Start building your repertoire today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/puzzles"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-14 px-10 text-lg rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20"
                  )}
                >
                  Get Started Now
                </Link>
                <Link
                  to="/openings"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-14 px-10 text-lg rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
                  )}
                >
                  Browse Library
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">ChessOp</span>
                </div>
                <p className="text-sm text-slate-500">
                  The modern platform for serious chess improvement.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/puzzles" className="hover:text-violet-400">Puzzles</Link></li>
                  <li><Link to="/openings" className="hover:text-violet-400">Openings</Link></li>
                  <li><Link to="/" className="hover:text-violet-400">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/" className="hover:text-violet-400">Blog</Link></li>
                  <li><Link to="/" className="hover:text-violet-400">Community</Link></li>
                  <li><Link to="/" className="hover:text-violet-400">Help Center</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/" className="hover:text-violet-400">Privacy</Link></li>
                  <li><Link to="/" className="hover:text-violet-400">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-slate-900 text-center text-sm text-slate-600">
              © {new Date().getFullYear()} ChessOp. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
