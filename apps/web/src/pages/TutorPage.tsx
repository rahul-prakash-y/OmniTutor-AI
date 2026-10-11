import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toast } from '../stores/useToastStore';
import { useAppStore } from '../stores/useAppStore';
import { PINNED_CONCEPT_NOTES, type ConceptNoteItem } from '../fixtures/tutorHistory';
import {
  Bot,
  User,
  Send,
  BookOpen,
  Pin,
  Lightbulb,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import type { TutoringMode } from '@omnitutor/shared';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  code?: string;
  tags?: string[];
}

export const TutorPage: React.FC = () => {
  const { activeMode, setActiveMode, activeSubject } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! Welcome to your Socratic workspace. Today we are exploring Recursive Memoization & Dynamic Programming. Before looking at code, consider this question: when computing the nth Fibonacci number naively, what causes the exponential runtime blowup?",
      timestamp: '10:42 AM',
      tags: ['Pedagogy: Discovery', 'Overlapping Subproblems'],
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'Because we recompute the exact same subproblems repeatedly across multiple branches of the recursion tree.',
      timestamp: '10:44 AM',
    },
    {
      id: 'm3',
      sender: 'ai',
      text: "Spot on! In fib(5), fib(3) is computed twice, fib(2) three times, and so on. Now, if we decide to cache or record each solved answer into a lookup table the first time we find it, what does our time complexity collapse to?",
      timestamp: '10:45 AM',
      tags: ['Verification: Correct', 'Next: Complexity Analysis'],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [conceptNotes, setConceptNotes] = useState<ConceptNoteItem[]>(PINNED_CONCEPT_NOTES);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsGenerating(true);

    // Simulate Socratic AI cognitive response
    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Thoughtful deduction! By storing states in a hash map or array, each state lookup requires O(1) time, reducing the total running time to O(N). Let's take the next step: consider how you would write the base cases and recurrence relation for the Coin Change problem. What represents the state?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        code: `// Recurrence structure:\nfunction coinChange(coins, amount) {\n  const memo = new Map();\n  // What are the base conditions here?\n}`,
        tags: ['Pacing: Socratic Question', 'Topic: Coin Change State'],
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsGenerating(false);
    }, 900);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success('Code copied to clipboard', 'Copied');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle || !newNoteContent) return;
    const note: ConceptNoteItem = {
      id: `cn-${Date.now()}`,
      title: newNoteTitle,
      subject: activeSubject,
      content: newNoteContent,
      date: 'Just now',
    };
    setConceptNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setShowAddNote(false);
    toast.success(`Pinned concept "${note.title}"`, 'Note Saved');
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'init',
        sender: 'ai',
        text: 'Session reset. What concept would you like to reason through today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tags: ['Fresh Session'],
      },
    ]);
    toast.info('Tutoring conversation history cleared.', 'Session Reset');
  };

  return (
    <div className="space-y-6 pb-8 h-[calc(100vh-7.5rem)] flex flex-col">
      {/* Tutor Header & Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Socratic AI Tutor
            </h1>
            <Badge variant="brand">{activeSubject}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Cognitive inquiry engine · Step-by-step reasoning assistance
          </p>
        </div>

        {/* Mode Selector and Reset Button */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1 text-xs">
            {(['socratic', 'direct', 'quiz', 'code_review'] as TutoringMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer capitalize text-[11px] ${
                  activeMode === mode
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Split: Chat Stream + Notes Side Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Chat Stream (2 cols) */}
        <Card className="lg:col-span-2 flex flex-col p-4 overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Code snippet block */}
                  {m.code && (
                    <div className="relative rounded-lg bg-slate-950 text-slate-200 p-3 font-mono text-xs overflow-x-auto border border-slate-800">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                        <span>JavaScript</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(m.id, m.code!)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedCodeId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="whitespace-pre">{m.code}</pre>
                    </div>
                  )}

                  {/* Pedagogical tag pills */}
                  {m.tags && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap gap-1.5">
                      {m.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className={`block text-[10px] text-right ${m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Generating skeleton */}
            {isGenerating && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Socratic tutor is formulating inquiry...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              Inquiry:
            </span>
            <button
              type="button"
              onClick={() => setInputVal('What is the difference between top-down and bottom-up DP?')}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] whitespace-nowrap cursor-pointer transition-colors"
            >
              Top-Down vs Bottom-Up
            </button>
            <button
              type="button"
              onClick={() => setInputVal('Could you give an intuitive counter-example?')}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] whitespace-nowrap cursor-pointer transition-colors"
            >
              Give Counter-Example
            </button>
            <button
              type="button"
              onClick={() => setInputVal('Test my understanding with a practice prompt.')}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] whitespace-nowrap cursor-pointer transition-colors"
            >
              Test My Understanding
            </button>
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2">
            <input
              id="input-tutor-query"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type your reasoning, question, or hypothesis..."
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              id="btn-send-tutor-message"
              type="submit"
              variant="primary"
              disabled={isGenerating || !inputVal.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        {/* Concept Notes Side Panel (1 col) */}
        <Card className="flex flex-col p-4 overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Pinned Concept Notes
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddNote(!showAddNote)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showAddNote ? 'Cancel' : '+ Add Note'}
            </button>
          </div>

          {/* New note form */}
          {showAddNote && (
            <form onSubmit={handleAddNote} className="p-3 my-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <input
                type="text"
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <textarea
                placeholder="Key takeaway or formula..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <Button type="submit" variant="primary" size="sm" className="w-full text-xs">
                Save Note
              </Button>
            </form>
          )}

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {conceptNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-indigo-500" />
                    {note.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">{note.date}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
