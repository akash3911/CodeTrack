import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Star, Search, Grid3X3, Shuffle, Trash2, HelpCircle, Rocket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { problemsAPI, userAPI } from "@/lib/api";
import AuthButton from "@/components/AuthButton";
import { onAuthChange } from "@/lib/auth";

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
  isPro: boolean;
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
    problemsAPI.getCategories().then((res) => setCategories(res.categories));
  }, []);

  useEffect(() => {
    if (!selectedCategory) return setProblems([]);
    problemsAPI.getProblemsByCategory(selectedCategory).then((res) => setProblems(res.problems || []));
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
      case "Easy": return "text-green-400";
      case "Medium": return "text-yellow-400";
      case "Hard": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-orange-50 text-gray-900">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 shadow-md">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
                CodeTrack
              </span>
            </Link>
            
 
          </div>

          <div className="flex items-center space-x-4">
            <AuthButton className="text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium" />
            {/* <div className="w-8 h-8 rounded-full bg-gray-600"></div> */}
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <div className="flex">

        {/* Main Content */}
        <div className="flex-1 bg-transparent">
          {/* Search and Controls */}
          <div className="px-6 py-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64 bg-white border-blue-200 text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-blue-100 hover:text-gray-900">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-blue-100 hover:text-gray-900">
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-blue-100 hover:text-gray-900">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="p-6 space-y-4">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className="p-4 bg-white hover:shadow-md transition-all cursor-pointer rounded-lg border border-blue-100 shadow-sm"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {category.name}
                      </h3>
                      <span className="text-sm text-gray-500">({category.solved} / {category.total})</span>
                      {selectedCategory === category.id && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-2 py-1">Active</Badge>
                      )}
                    </div>
                    <Progress value={(category.total ? (category.solved / category.total) * 100 : 0)} className="h-2 bg-blue-200" />
                  </div>
                </div>

                {selectedCategory === category.id && (
                  <div className="mt-4 border-t border-blue-100 pt-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-4 pb-2">
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Star</div>
                      <div className="col-span-6">Problem</div>
                      <div className="col-span-2">Difficulty</div>
                      <div className="col-span-2">Action</div>
                    </div>

                    <div className="space-y-2">
                      {filteredProblems.map((problem) => {
                        const slug = problem.slug || problem._id;
                        const isSolved = solved.has(slug);
                        const go = () => navigate(`/problem/${slug}`);
                        return (
                          <div
                            key={problem._id}
                          className="grid grid-cols-12 gap-4 py-3 hover:bg-blue-50 rounded transition-all duration-200 cursor-pointer items-center group"
                            onClick={(e) => {
                              e.stopPropagation();
                              go();
                            }}
                          >
                            <div className="col-span-1">
                              {isSolved ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300 group-hover:text-blue-400" />
                              )}
                            </div>
                            <div className="col-span-1">
                              <Star className="h-4 w-4 transition-colors text-gray-300 group-hover:text-yellow-400" />
                            </div>
                            <div className="col-span-6">
                              <div className="flex items-center gap-2">
                                <span className="font-medium transition-colors text-gray-900 group-hover:text-orange-500">
                                  {problem.title}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                {problem.difficulty}
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="text-orange-500 hover:text-orange-700 text-xs px-2 py-1 font-semibold"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  go();
                                }}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {filteredProblems.length === 0 && (
                        <div className="text-sm text-gray-500">No problems in this folder.</div>
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
  );
};

export default Problems;