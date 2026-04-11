import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { isPro } from "@/lib/pro";
import AuthButton from "@/components/AuthButton";
import { ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  const [userIsPro, setUserIsPro] = useState(false);

  useEffect(() => {
    setUserIsPro(isPro());
  }, []);

  const appCards = [
    {
      title: "Practice Problems",
      copy: "Browse coding problems by category and open any problem to start solving.",
    },
    {
      title: "Run Code",
      copy: "Execute your solution in the editor and test it against examples or custom input.",
    },
    {
      title: "Submit Work",
      copy: "Save a submission after you are ready and track your attempts in the app.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#131313] text-white">
      <div className="grid-noise min-h-screen">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131313]/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ffc02e]" />
                <span className="font-heading text-xl font-extrabold tracking-[-0.04em] text-[#ffc02e]">
                  CodeTrack
                </span>
              </div>

              <nav className="hidden items-center gap-8 text-sm md:flex">
                <Link to="/practice" className="font-heading font-bold uppercase tracking-wide text-white/80 transition-colors hover:text-[#ffc02e]">
                  Practice
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {userIsPro ? (
                <Badge className="rounded-md border border-[#ff006e]/40 bg-[#ff006e]/20 px-3 py-1 font-semibold uppercase tracking-wide text-[#ff4e96]">
                  Pro Active
                </Badge>
              ) : null}
              <AuthButton className="rounded-md border border-white/10 bg-[#1b1b1b] font-semibold text-white hover:border-[#ffc02e]/40 hover:bg-[#232323] hover:text-[#ffc02e]" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-14">
          <section className="animate-rise ui-surface p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <Badge className="mb-5 rounded-md border border-[#ffc02e]/30 bg-[#ffc02e]/10 px-3 py-1 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#ffc02e]">
                  Coding Practice App
                </Badge>
                <h1 className="font-heading text-5xl font-black leading-none tracking-[-0.05em] text-white md:text-7xl">
                  Practice,
                  <br />
                  Run, Submit.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                  CodeTrack helps you practice algorithm problems, run your solution in the browser, and submit attempts from one place.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    className="rounded-md bg-[#ffc02e] px-6 py-3 font-heading text-base font-extrabold uppercase tracking-wide text-black transition hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(255,192,46,0.45)]"
                  >
                    <Link to="/practice" className="inline-flex items-center gap-2">
                      {userIsPro ? "Continue Practice" : "Start Practicing"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="rounded-md border border-white/10 bg-[#1b1b1b] px-6 py-3 font-semibold text-white hover:border-white/20 hover:bg-[#222]">
                    <Link to="/practice">View Problems</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#151515] p-5">
                <div className="grid gap-3">
                  <div className="rounded-md border border-white/10 bg-[#1b1b1b] p-4">
                    <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#ffc02e]">Practice</p>
                    <p className="mt-2 text-sm text-white/70">Choose a topic and work through the problem list.</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-[#1b1b1b] p-4">
                    <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#22c55e]">Run</p>
                    <p className="mt-2 text-sm text-white/70">Test your code in the editor without leaving the page.</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-[#1b1b1b] p-4">
                    <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#ff006e]">Submit</p>
                    <p className="mt-2 text-sm text-white/70">Send your solution and review your submissions.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {appCards.map((card, idx) => (
              <article
                key={card.title}
                className="ui-surface animate-rise p-5"
                style={{ animationDelay: `${220 + idx * 100}ms` }}
              >
                <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.12em] text-white/50">
                  App Feature {String(idx + 1).padStart(2, "0")}
                </p>
                <h3 className="font-heading text-2xl font-extrabold tracking-[-0.03em] text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{card.copy}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;