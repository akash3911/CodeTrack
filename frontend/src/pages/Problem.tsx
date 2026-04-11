import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Maximize2, 
  RotateCcw, 
  Rocket
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { problemsAPI, submissionsAPI } from "@/lib/api";
import { onAuthChange, signInWithGoogle } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import AuthButton from "@/components/AuthButton";
import Editor from "@monaco-editor/react";

interface ProblemData {
  _id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  slug?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
}

type Submission = {
  _id: string;
  status: string;
  language: string;
  code: string;
  createdAt: string;
  results: { inputSummary: string; expected: string; actual: string; passed: boolean; timeMs?: number; error?: string }[];
};

const Problem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("question");
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [language, setLanguage] = useState<'python' | 'java'>('python');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  // New state for structured test run results
  const [testResults, setTestResults] = useState<Array<{ index: number; input: string; expected?: string; actual: string; passed?: boolean; status?: string; error?: string }>>([]);
  const [activeCase, setActiveCase] = useState<number>(0);
  const [outputTab, setOutputTab] = useState<'results' | 'console'>('results');
  const storageKey = id ? `code:${id}:${language}` : undefined;
  const [isAuthed, setIsAuthed] = useState(false);

  const defaultSnippets: Record<'python' | 'java', string> = {
    python: `def solve():
    # Write your solution. Print the output.
    print('hello')

if __name__ == '__main__':
    solve()
`,
    java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // Write your solution. Print the output.
        System.out.println("hello");
    }
}
`
  };
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    // Load code from localStorage when problem or language changes
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      setCode(saved || defaultSnippets[language]);
    }
  }, [storageKey, language]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await problemsAPI.getProblem(id);
        if (!mounted) return;
        setProblem(res.problem);
      } catch (err: any) {
        if (!mounted) return;
        if (err?.status === 403) {
          // Pro locking removed; treat as generic error
          setError(err?.data?.message || 'Unauthorized');
        } else if (err?.status === 404) {
          setError("Problem not found");
        } else {
          setError(err?.message || "Failed to load problem");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    return onAuthChange((user) => {
      setIsAuthed(!!user);
    });
  }, []);

  useEffect(() => {
    // Fetch previous submissions when authenticated
    if (!isAuthed || !id) {
      setSubmissions([]);
      return;
    }
    (async () => {
      try {
        const data = await submissionsAPI.list(id);
        setSubmissions(data.submissions || []);
      } catch {}
    })();
  }, [id, isAuthed]);

  const difficultyBadgeClass = (d?: string) => {
    switch (d) {
      case 'Easy': return 'border-[#22c55e]/35 bg-[#22c55e]/10 text-[#22c55e]';
      case 'Medium': return 'border-[#ffc02e]/35 bg-[#ffc02e]/10 text-[#ffc02e]';
      case 'Hard': return 'border-[#ef4444]/35 bg-[#ef4444]/10 text-[#ef4444]';
      default: return 'border-white/20 bg-white/10 text-white/70';
    }
  };

  const onRun = async () => {
    setRunning(true);
    setRunOutput("");
    setTestResults([]);
    setActiveCase(0);

    // Helpers replicate backend comparison for consistency
    const normalizeOutput = (s: string) => (s || '')
      .replace(/\r/g, '')
      .trim()
      .split(/\s+/)
      .join(' ');
    const outputsMatch = (actual: string, expected: string) => {
      if (actual === expected) return true;
      const a = normalizeOutput(actual);
      const e = normalizeOutput(expected);
      if (a === e) return true;
      if (a.toLowerCase() === e.toLowerCase()) return true;
      const an = Number(a), en = Number(e);
      if (!Number.isNaN(an) && !Number.isNaN(en)) return Math.abs(an - en) <= 1e-9;
      return false;
    };

    try {
      // If user provided custom input, just run single case (no expected)
      if (customInput.trim()) {
        const out = await submissionsAPI.run(code, language, customInput);
        const actual = String(out.stdout || out.stderr || '').trim();
        setTestResults([]); // console mode only
        setRunOutput(actual || '(no output)');
        setOutputTab('console');
        return;
      }

      // If we have problem examples, run them all
      if (problem?.examples && problem.examples.length > 0) {
        try {
          const resp = await submissionsAPI.runExamples(problem.slug || id!, code, language);
          const results = (resp.results || []).map((r: any) => ({
            index: r.index,
            input: r.inputSummary,
            expected: r.expected,
            actual: r.actual,
            passed: r.passed,
            status: r.statusText,
            error: r.error,
          }));
          setTestResults(results);
          // Build console-style output: concatenate actual outputs (non-empty) or fallback to summary
          const concatenated = results.map(r => r.actual).filter(Boolean).join('\n');
          setRunOutput(concatenated || `${resp.passed}/${resp.total} test cases passed`);
          return;
        } catch (e: any) {
          // fallback to client loop if backend runExamples not available
        }
      }

      // Fallback: just run without input
      const out = await submissionsAPI.run(code, language, '');
      const actual = String(out.stdout || out.stderr || '').trim();
      setTestResults([{ index: 0, input: '', actual, status: out.status, error: out.stderr }]);
      setRunOutput(actual);
    } catch (e: any) {
      setRunOutput(e?.data?.message || e?.message || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const onSubmit = async () => {
    if (!auth.currentUser) {
      try {
        await signInWithGoogle();
      } catch {
        return;
      }
    }
    if (!id) return;

    try {
      const res = await submissionsAPI.create(id, code, language);
      setSubmissions((prev) => [res.submission, ...prev]);
      setActiveTab('submissions');
    } catch (e: any) {
      setActiveTab('submissions');
    }
  };

  // Persist code to localStorage on change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, code);
    }
  }, [code, storageKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier) return;

      if (e.key === "Enter") {
        e.preventDefault();
        void onSubmit();
        return;
      }

      if (e.key === "'" || e.code === "Quote") {
        e.preventDefault();
        void onRun();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onRun, onSubmit]);

  return (
    <div className="min-h-screen bg-[#131313] text-white">
      <div className="grid-noise min-h-screen">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131313]/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-6">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-[#ffc02e]" />
                <span className="font-heading text-xl font-extrabold tracking-[-0.04em] text-[#ffc02e]">CodeTrack</span>
              </Link>
              <nav className="hidden items-center gap-8 text-sm md:flex">
                <Link to="/practice" className="font-heading font-bold uppercase tracking-wide text-white/80 transition-colors hover:text-[#ffc02e]">Practice</Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="rounded-md border border-white/10 bg-[#1b1b1b] text-white hover:bg-[#222]" onClick={() => navigate(-1)}>Back</Button>
              <AuthButton className="rounded-md border border-white/10 bg-[#1b1b1b] font-semibold text-white hover:border-[#ffc02e]/40 hover:bg-[#232323] hover:text-[#ffc02e]" />
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-64px)] gap-3 p-3">
          <div className="ui-surface flex w-1/2 flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full w-full flex-col">
              <div className="border-b border-white/10 p-4">
                <TabsList className="h-auto flex-wrap gap-2 rounded-md border border-white/10 bg-[#151515] p-1">
                  <TabsTrigger value="question" className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/60 data-[state=active]:bg-[#ffc02e] data-[state=active]:text-black">Question</TabsTrigger>
                  <TabsTrigger value="solution" className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/60 data-[state=active]:bg-[#ffc02e] data-[state=active]:text-black">Solution</TabsTrigger>
                  <TabsTrigger value="submissions" className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/60 data-[state=active]:bg-[#ffc02e] data-[state=active]:text-black">Submissions</TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/60 data-[state=active]:bg-[#ffc02e] data-[state=active]:text-black">Notes</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="question" className="m-0 p-6">
                  {loading ? (
                    <div className="text-white/60">Loading...</div>
                  ) : error ? (
                    <div className="space-y-4">
                      <h1 className="font-heading text-2xl font-extrabold">Error</h1>
                      <p className="text-white/70">{error}</p>
                      <Button variant="ghost" className="rounded-md border border-white/10 bg-[#1a1a1a] text-white hover:bg-[#232323]" onClick={() => navigate(-1)}>Go Back</Button>
                    </div>
                  ) : (
                    problem && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h1 className="font-heading text-3xl font-black tracking-[-0.04em] text-white">{problem.title}</h1>
                          <Badge className={`rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wide ${difficultyBadgeClass(problem.difficulty)}`}>
                            {problem.difficulty}
                          </Badge>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-[#171717] p-4">
                          <p className="whitespace-pre-wrap leading-relaxed text-white/75">{problem.description}</p>
                        </div>

                        {Array.isArray(problem.examples) && problem.examples.length > 0 && (
                          <div>
                            <h4 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-[0.12em] text-[#ff006e]">Examples</h4>
                            <div className="space-y-3">
                              {problem.examples.map((ex, idx) => (
                                <div key={idx} className="rounded-lg border border-white/10 bg-[#171717] p-4">
                                  {ex.input && <div className="mb-2 text-xs font-mono text-[#ffc02e]">Input: {ex.input}</div>}
                                  {ex.output && <div className="text-xs font-mono text-[#22c55e]">Output: {ex.output}</div>}
                                  {ex.explanation && <div className="mt-2 text-sm text-white/70">{ex.explanation}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(problem.constraints) && problem.constraints.length > 0 && (
                          <div>
                            <h4 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-[0.12em] text-[#ff006e]">Constraints</h4>
                            <ul className="list-disc space-y-1 pl-6 text-white/75">
                              {problem.constraints.map((c, idx) => (
                                <li key={idx}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </TabsContent>

                <TabsContent value="solution" className="m-0 p-6">
                  <div className="rounded-lg border border-white/10 bg-[#171717] p-4 text-sm text-white/60">Coming soon.</div>
                </TabsContent>

                <TabsContent value="submissions" className="m-0 p-6">
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-4 border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wide text-white/60">
                      <div>Time</div>
                      <div>Status</div>
                      <div>Language</div>
                      <div>Result</div>
                      <div></div>
                    </div>

                    {submissions.length === 0 ? (
                      <div className="rounded-lg border border-white/10 bg-[#171717] p-4 text-sm text-white/55">No submissions yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {submissions.map((s) => (
                          <div key={s._id} className="grid grid-cols-5 items-center gap-4 rounded-md border border-white/10 bg-[#171717] p-3 text-sm">
                            <div className="text-white/60">{new Date(s.createdAt).toLocaleString()}</div>
                            <div className={s.status === 'Accepted' ? 'font-semibold text-[#22c55e]' : 'font-semibold text-[#ef4444]'}>{s.status}</div>
                            <div className="text-white/75">{s.language}</div>
                            <div className="text-white/75">
                              {s.results && s.results.length > 0 ? `${s.results.filter(r => r.passed).length}/${s.results.length} passed` : '-'}
                            </div>
                            <div className="text-right">
                              <Button size="sm" variant="ghost" className="text-[#ffc02e] hover:bg-[#ffc02e]/10 hover:text-[#ffc02e]">View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="m-0 p-6">
                  <div className="rounded-lg border border-white/10 bg-[#171717] p-4 text-sm text-white/60">Add your notes here.</div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="ui-surface flex w-1/2 flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-4">
                <Select value={language} onValueChange={(v) => setLanguage(v as 'python' | 'java')}>
                  <SelectTrigger className="w-32 border-white/15 bg-[#151515] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1b1b1b] text-white">
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10 hover:text-white">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setCode(defaultSnippets[language])}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10 hover:text-white">
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="border-white/20 bg-[#1b1b1b] text-white hover:bg-[#232323]" onClick={onRun} disabled={running}>
                  {running ? 'Running...' : "Run"}
                </Button>
                <Button size="sm" className="bg-[#ffc02e] font-bold uppercase tracking-wide text-black hover:bg-[#ffca49]" onClick={onSubmit}>
                  Submit
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#0f0f0f]" style={{ minHeight: 0 }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true
                }}
              />
            </div>

            {(testResults.length > 0 || runOutput) && (
              <div className="max-h-[40vh] overflow-y-auto border-t border-white/10 bg-[#141414]">
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 rounded-md border border-white/10 bg-[#1b1b1b] p-1">
                      <button onClick={() => setOutputTab('results')} className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wide ${outputTab==='results' ? 'bg-[#ffc02e] text-black' : 'text-white/60 hover:bg-white/10'}`}>Results</button>
                      <button onClick={() => setOutputTab('console')} className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wide ${outputTab==='console' ? 'bg-[#ffc02e] text-black' : 'text-white/60 hover:bg-white/10'}`}>Console</button>
                    </div>
                  </div>
                  {outputTab === 'results' && (
                    <>
                      {testResults.length > 0 && (
                        <div className="rounded-md border border-white/10 bg-[#1b1b1b]">
                          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                            <div className="text-sm font-medium text-white">
                              {testResults.every(r => r.passed !== false) ? (
                                <span className="font-bold text-[#22c55e]">Accepted</span>
                              ) : (
                                <span className="font-bold text-[#ef4444]">Wrong Answer</span>
                              )}
                              <span className="ml-3 text-white/60">Passed: {testResults.filter(r => r.passed).length}/{testResults.filter(r => r.expected !== undefined).length || testResults.length}</span>
                            </div>
                            <div className="flex gap-2">
                              {testResults.map(r => (
                                <button
                                  key={r.index}
                                  onClick={() => setActiveCase(r.index)}
                                  className={`rounded border px-2 py-1 text-xs font-semibold ${activeCase === r.index ? 'border-[#ffc02e]/50 bg-[#ffc02e]/15 text-[#ffc02e]' : 'border-white/15 bg-[#141414] text-white/70 hover:bg-[#222]'}`}
                                >
                                  {`#${r.index + 1}`}
                                  {r.passed === true && <span className="ml-1 text-[#22c55e]">Y</span>}
                                  {r.passed === false && <span className="ml-1 text-[#ef4444]">N</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                          {testResults[activeCase] && (
                            <div className="space-y-4 p-4 text-xs text-white">
                              <div>
                                <span className="mb-1 block font-semibold text-white/70">Input:</span>
                                <pre className="whitespace-pre-wrap rounded border border-white/10 bg-[#111] p-2 font-mono">{testResults[activeCase].input || '(empty)'}</pre>
                              </div>
                              {testResults[activeCase].expected !== undefined && (
                                <div>
                                  <span className="mb-1 block font-semibold text-white/70">Expected Output:</span>
                                  <pre className="whitespace-pre-wrap rounded border border-[#22c55e]/30 bg-[#22c55e]/10 p-2 font-mono text-[#9de8b7]">{testResults[activeCase].expected || ''}</pre>
                                </div>
                              )}
                              <div>
                                <span className="mb-1 block font-semibold text-white/70">Your Output:</span>
                                <pre className={`whitespace-pre-wrap rounded border p-2 font-mono ${testResults[activeCase].passed === true ? 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#9de8b7]' : testResults[activeCase].passed === false ? 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f7aaaa]' : 'border-white/10 bg-[#111] text-white/80'}`}>{testResults[activeCase].actual || ''}</pre>
                              </div>
                              {testResults[activeCase].error && (
                                <div>
                                  <span className="mb-1 block font-semibold text-white/70">Error:</span>
                                  <pre className="whitespace-pre-wrap rounded border border-[#ef4444]/30 bg-[#ef4444]/10 p-2 font-mono text-[#f7aaaa]">{testResults[activeCase].error}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {runOutput && testResults.length === 0 && (
                        <pre className="mt-1 whitespace-pre-wrap rounded border border-white/10 bg-[#1b1b1b] p-3 font-mono text-xs text-white/80">{runOutput}</pre>
                      )}
                    </>
                  )}
                  {outputTab === 'console' && (
                    <>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Custom input (stdin)"
                        className="mb-2 h-24 w-full rounded border border-white/15 bg-[#1b1b1b] p-2 text-sm text-white placeholder:text-white/35 focus:border-[#ffc02e]/40"
                      />
                      <div className="mt-2 rounded border border-white/10 bg-[#1b1b1b] p-3">
                        <pre className="min-h-[120px] whitespace-pre-wrap font-mono text-xs text-white/80">{runOutput || (testResults.length ? testResults.map(r => r.actual).filter(Boolean).join('\n') : 'No output yet.')}</pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problem;