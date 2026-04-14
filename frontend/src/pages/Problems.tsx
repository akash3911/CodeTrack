import { useState, useEffect } from "react";
import { CheckCircle, Circle, Search, Grid3X3, Shuffle, Trash2, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { problemsAPI, userAPI } from "@/lib/api";
import { onAuthChange } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

interface Category {
  id: string;
  name: string;
  solved: number;
  total: number;
  isLocked: boolean;
}

interface ProblemItem {
  _id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  order: number;
  slug?: string;
}

const Problems = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [search, setSearch] = useState("");
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    problemsAPI.getCategories()
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!selectedCategory) return setProblems([]);
    problemsAPI.getProblemsByCategory(selectedCategory)
      .then((res) => setProblems(res.problems || []))
      .catch(() => setProblems([]));
  }, [selectedCategory]);

  useEffect(() => {
    return onAuthChange((user) => {
      setIsAuthed(!!user);
    });
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      setSolved(new Set());
      return;
    }
    userAPI.getSolvedProblems().then((res) => {
      const set = new Set<string>((res.problems || []).map((p: any) => p.slug));
      setSolved(set);
    }).catch(() => {});
  }, [isAuthed]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(prev => (prev === categoryId ? "" : categoryId));
  };

  const filteredProblems = problems.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-[#22c55e]";
      case "Medium": return "text-[#ffc02e]";
      case "Hard": return "text-[#ef4444]";
      default: return "text-white/60";
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white">
      <div className="grid-noise min-h-screen">
        <SiteHeader signInFrom="/practice" />

        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="ui-surface animate-rise">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <p className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-[#ff006e]">Practice Mission Control</p>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-white/60">
                  {categories.length} Topics
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  placeholder="Search problem title"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 rounded-md border border-white/15 bg-[#141414] pl-10 pr-3 text-white placeholder:text-white/35"
                />
              </div>
              
            </div>

            <div className="space-y-4 p-5">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border border-white/10 bg-[#191919] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition hover:border-white/20"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-xl font-extrabold tracking-[-0.03em] text-white">{category.name}</h3>
                      <p className="mt-1 text-sm text-white/55">
                        {category.solved} solved / {category.total} total
                      </p>
                    </div>
                    {selectedCategory === category.id && (
                      <span className="rounded-md border border-[#ffc02e]/35 bg-[#ffc02e]/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#ffc02e]">Active</span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded bg-black/40">
                      <div
                        className="h-full bg-[#ffc02e] transition-all"
                        style={{ width: `${category.total ? (category.solved / category.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {selectedCategory === category.id && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <div className="mb-3 hidden grid-cols-12 gap-3 text-[11px] font-bold uppercase tracking-wide text-white/50 md:grid">
                        <div className="col-span-1">Status</div>
                        <div className="col-span-7">Problem</div>
                        <div className="col-span-2">Difficulty</div>
                      </div>

                      <div className="space-y-2">
                        {filteredProblems.map((problem) => {
                          const slug = problem.slug || problem._id;
                          const isSolved = solved.has(slug);
                          const go = () => navigate(`/problem/${slug}`);
                          return (
                            <div
                              key={problem._id}
                              className="grid cursor-pointer grid-cols-1 items-center gap-3 rounded-md border border-transparent bg-[#151515] px-3 py-3 transition hover:border-white/10 hover:bg-[#1d1d1d] md:grid-cols-12"
                              onClick={(e) => {
                                e.stopPropagation();
                                go();
                              }}
                            >
                              <div className="md:col-span">
                                {isSolved ? (
                                  <CheckCircle className="h-5 w-5 text-[#22c55e]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-white/30" />
                                )}
                              </div>
                              <div className="font-medium text-white md:col-span-7">{problem.title}</div>
                              <div className={`text-sm font-semibold ${getDifficultyColor(problem.difficulty)} md:col-span-2`}>
                                {problem.difficulty}
                              </div>
                            </div>
                          );
                        })}

                        {filteredProblems.length === 0 && (
                          <div className="rounded-md border border-white/10 bg-[#121212] p-4 text-sm text-white/55">No problems in this category.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problems;