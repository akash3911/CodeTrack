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
      case 'Easy': return 'bg-green-900/30 text-green-400 border-green-400/30';
      case 'Medium': return 'bg-yellow-900/30 text-yellow-400 border-yellow-400/30';
      case 'Hard': return 'bg-red-900/30 text-red-400 border-red-400/30';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="p-1 rounded bg-orange-500">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CodeTrack</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8 text-sm">
              <Link to="/practice" className="text-white hover:text-orange-400 transition-colors">Practice</Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-white hover:bg-gray-800" onClick={() => navigate(-1)}>↩</Button>
            <AuthButton className="text-white hover:bg-gray-800" />
            {/* <div className="w-8 h-8 rounded-full bg-gray-600"></div> */}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r border-gray-800 flex flex-col">
          {/* Make Tabs wrap both the header and content to satisfy Radix context */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
            <div className="p-4 border-b border-gray-800">
              <TabsList className="bg-gray-800 border border-gray-700">
                <TabsTrigger value="question" className="text-white data-[state=active]:bg-gray-700">Question</TabsTrigger>
                <TabsTrigger value="solution" className="text-white data-[state=active]:bg-gray-700">Solution</TabsTrigger>
                <TabsTrigger value="submissions" className="text-white data-[state=active]:bg-gray-700">Submissions</TabsTrigger>
                <TabsTrigger value="notes" className="text-white data-[state=active]:bg-gray-700">Notes</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="question" className="p-6 m-0">
                {loading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : error ? (
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white">Error</h1>
                    <p className="text-gray-400">{error}</p>
                    <Button variant="ghost" className="text-white hover:text-orange-400 hover:bg-gray-800" onClick={() => navigate(-1)}>Go Back</Button>
                  </div>
                ) : (
                  problem && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={difficultyBadgeClass(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{problem.description}</p>

                        {Array.isArray(problem.examples) && problem.examples.length > 0 && (
                          <>
                            <h4 className="text-white font-semibold mt-6 mb-3">Examples</h4>
                            {problem.examples.map((ex, idx) => (
                              <div key={idx} className="bg-gray-800 p-4 rounded-lg mb-3">
                                {ex.input && <div className="text-green-400 font-mono text-sm mb-2">Input: {ex.input}</div>}
                                {ex.output && <div className="text-green-400 font-mono text-sm">Output: {ex.output}</div>}
                                {ex.explanation && <div className="text-gray-300 text-sm mt-2">{ex.explanation}</div>}
                              </div>
                            ))}
                          </>
                        )}

                        {Array.isArray(problem.constraints) && problem.constraints.length > 0 && (
                          <>
                            <h4 className="text-white font-semibold mt-6 mb-3">Constraints</h4>
                            <ul className="text-gray-300 space-y-1 list-disc pl-6">
                              {problem.constraints.map((c, idx) => (
                                <li key={idx}>{c}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}
              </TabsContent>

              {/* Placeholder tabs for future content */}
              <TabsContent value="solution" className="p-6 m-0">
                <div className="text-gray-400 text-sm">Coming soon.</div>
              </TabsContent>

              <TabsContent value="submissions" className="p-6 m-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-400 pb-2 border-b border-gray-700">
                    <div>Time</div>
                    <div>Status</div>
                    <div>Language</div>
                    <div>Result</div>
                    <div></div>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="text-gray-400 text-sm">No submissions yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {submissions.map((s) => (
                        <div key={s._id} className="grid grid-cols-5 gap-4 items-center text-sm p-2 rounded border border-gray-800">
                          <div className="text-gray-400">{new Date(s.createdAt).toLocaleString()}</div>
                          <div className={s.status === 'Accepted' ? 'text-green-400' : 'text-red-400'}>{s.status}</div>
                          <div className="text-gray-300">{s.language}</div>
                          <div className="text-gray-300">
                            {s.results && s.results.length > 0 ? `${s.results.filter(r => r.passed).length}/${s.results.length} passed` : '-'}
                          </div>
                          <div className="text-right">
                            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">View</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="p-6 m-0">
                <div className="text-gray-400 text-sm">Add your notes here.</div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col" style={{ minHeight: 0 }}>
          {/* Editor Header with Run/Submit Buttons */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
            <div className="flex items-center gap-4">
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="python" className="text-white">Python</SelectItem>
                  <SelectItem value="java" className="text-white">Java</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => setCode(defaultSnippets[language])}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700" onClick={onRun} disabled={running}>
                {running ? 'Running…' : 'Run'}
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onSubmit}>
                Submit
              </Button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 bg-[#0d1117] overflow-hidden" style={{ minHeight: 0 }}>
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

          {/* Output Panel - Only show if there's output */}
          {(testResults.length > 0 || runOutput) && (
          <div className="border-t border-gray-800 bg-gray-900 max-h-[40vh] overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex gap-2 bg-gray-800 rounded p-1">
                  <button onClick={() => setOutputTab('results')} className={`text-xs px-3 py-1 rounded ${outputTab==='results' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Results</button>
                  <button onClick={() => setOutputTab('console')} className={`text-xs px-3 py-1 rounded ${outputTab==='console' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Console</button>
                </div>
              </div>
              {outputTab === 'results' && (
                <>
                  {testResults.length > 0 && (
                    <div className="mt-2 border border-gray-800 rounded bg-[#0d1117]">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                        <div className="text-sm font-medium text-white">
                          {testResults.every(r => r.passed !== false) ? (
                            <span className="text-green-400">Accepted</span>
                          ) : (
                            <span className="text-red-400">Wrong Answer</span>
                          )}
                          <span className="ml-3 text-gray-400">Passed test cases: {testResults.filter(r => r.passed).length}/{testResults.filter(r => r.expected !== undefined).length || testResults.length}</span>
                        </div>
                        <div className="flex gap-2">
                          {testResults.map(r => (
                            <button
                              key={r.index}
                              onClick={() => setActiveCase(r.index)}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${activeCase === r.index ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-800 border-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                            >
                              {`Case ${r.index + 1}`}
                              {r.passed === true && <span className="ml-1 text-green-400">●</span>}
                              {r.passed === false && <span className="ml-1 text-red-400">●</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      {testResults[activeCase] && (
                        <div className="p-4 space-y-4 text-xs text-gray-300">
                          <div>
                            <span className="text-gray-400 block mb-1">Input:</span>
                            <pre className="whitespace-pre-wrap bg-gray-800 p-2 rounded">{testResults[activeCase].input || '(empty)'}</pre>
                          </div>
                          {testResults[activeCase].expected !== undefined && (
                            <div>
                              <span className="text-gray-400 block mb-1">Expected Output:</span>
                              <pre className="whitespace-pre-wrap bg-gray-800 p-2 rounded">{testResults[activeCase].expected || ''}</pre>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-400 block mb-1">Your Output:</span>
                            <pre className={`whitespace-pre-wrap bg-gray-800 p-2 rounded ${testResults[activeCase].passed === true ? 'text-green-400' : testResults[activeCase].passed === false ? 'text-red-400' : 'text-gray-200'}`}>{testResults[activeCase].actual || ''}</pre>
                          </div>
                          {testResults[activeCase].error && (
                            <div>
                              <span className="text-gray-400 block mb-1">Error:</span>
                              <pre className="whitespace-pre-wrap bg-red-950/40 text-red-400 p-2 rounded">{testResults[activeCase].error}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {runOutput && testResults.length === 0 && (
                    <pre className="mt-1 text-xs text-gray-300 whitespace-pre-wrap">{runOutput}</pre>
                  )}
                </>
              )}
              {outputTab === 'console' && (
                <>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Custom input (stdin)"
                    className="w-full h-24 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 placeholder-gray-400 mb-2"
                  />
                  <div className="mt-2 border border-gray-800 rounded bg-[#0d1117] p-3">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap min-h-[120px]">{runOutput || (testResults.length ? testResults.map(r => r.actual).filter(Boolean).join('\n') : 'No output yet.')}</pre>
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Problem;