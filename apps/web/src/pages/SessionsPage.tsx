import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../stores/useAppStore';
import {
  Sparkles,
  Send,
  BookOpen,
  Pin,
  CheckCircle,
  HelpCircle,
  User,
  Bot,
  Lightbulb,
} from 'lucide-react';

interface SessionMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  annotations?: string[];
}

export const SessionsPage: React.FC = () => {
  const { activeMode, activeSubject } = useAppStore();
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<SessionMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! Welcome to your Socratic workspace. Today we are exploring Recursive Memoization & Dynamic Programming. Before looking at code, consider this question: when computing the nth Fibonacci number naively, what causes the exponential runtime blowup?",
      timestamp: '10:42 AM',
      annotations: ['Pedagogy: Conceptual Discovery', 'Focus: Overlapping Subproblems'],
    },
    {
      id: '2',
      sender: 'user',
      text: 'Because we recompute the exact same subproblems repeatedly across branches in the recursion tree.',
      timestamp: '10:44 AM',
    },
    {
      id: '3',
      sender: 'ai',
      text: "Precisely spotted! In fib(5), fib(3) is computed twice, fib(2) three times, and so on. Now, if we decide to cache or record each solved answer into a lookup table the first time we find it, what does our time complexity collapse to?",
      timestamp: '10:45 AM',
      annotations: ['Verification: Correct', 'Next Step: Complexity Analysis'],
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg: SessionMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [
      ...prev,
      newMsg,
      {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: `Excellent reasoning! Storing subproblem solutions in a hash map or table brings each unique state lookup down to O(1), leading to an overall O(N) linear time complexity. Would you like to explore the difference between top-down memoization and bottom-up tabulation next?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        annotations: ['Pedagogy: Socratic Bridge', 'Topic: Top-Down vs Bottom-Up'],
      },
    ]);
    setInputVal('');
  };

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-6rem)] flex flex-col">
      {/* Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-4 border border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-display font-bold text-white">
              Dynamic Programming & Memoization
            </h1>
            <Badge variant="brand" size="sm">
              {activeSubject}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Active Mode: <span className="text-brand-300 capitalize font-medium">{activeMode}</span> | Cognitive Socratic Dialogue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent" size="md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Tutor Ready</span>
          </Badge>
        </div>
      </div>

      {/* Workspace Split: Messages + Notes */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Chat / Dialogue Stream */}
        <Card className="lg:col-span-2 flex flex-col p-4 overflow-hidden border border-surface-border/80">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center flex-shrink-0 text-brand-300">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed space-y-2 ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-xs shadow-glow-brand'
                      : 'bg-surface-card border border-surface-border text-slate-200 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.annotations && (
                    <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                      {m.annotations.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-brand-950/80 border border-brand-500/30 text-brand-300 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="block text-[10px] text-slate-400 text-right">{m.timestamp}</span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-accent-violet/30 border border-accent-violet/40 flex items-center justify-center flex-shrink-0 text-accent-violet">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick suggestions */}
          <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto text-xs text-slate-400 border-t border-surface-border/60">
            <span className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              Prompts:
            </span>
            <button
              onClick={() => setInputVal('What is the space complexity tradeoff with memoization?')}
              className="px-2.5 py-1 rounded-full bg-surface-dark border border-surface-border text-slate-300 hover:text-white hover:border-brand-500 transition-colors whitespace-nowrap text-[11px]"
            >
              Space complexity tradeoff?
            </button>
            <button
              onClick={() => setInputVal('Show me an example problem with overlapping subproblems.')}
              className="px-2.5 py-1 rounded-full bg-surface-dark border border-surface-border text-slate-300 hover:text-white hover:border-brand-500 transition-colors whitespace-nowrap text-[11px]"
            >
              Give an example problem
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex gap-2 pt-2">
            <input
              id="input-tutor-message"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Reply to the Socratic question or ask for clarification..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <Button id="btn-send-message" type="submit" variant="primary">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        {/* Concept Notes & Takeaways */}
        <Card className="flex flex-col space-y-4 overflow-y-auto border border-surface-border/80">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              Pinned Concept Takeaways
            </h2>
            <Pin className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border space-y-1.5">
              <div className="font-semibold text-brand-300 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Overlapping Subproblems
              </div>
              <p className="text-slate-400 leading-relaxed">
                Problems where smaller components are re-evaluated multiple times throughout recursive execution.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border space-y-1.5">
              <div className="font-semibold text-accent-cyan flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Optimal Substructure
              </div>
              <p className="text-slate-400 leading-relaxed">
                An optimal solution to the overall problem can be systematically constructed from optimal solutions to its subproblems.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border space-y-1.5">
              <div className="font-semibold text-accent-amber flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Memoization (Top-Down)
              </div>
              <p className="text-slate-400 leading-relaxed">
                Caching results of expensive function calls and returning the cached result when identical inputs occur again.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
