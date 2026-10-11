/**
 * Client-side mock fixture for AI Tutor Sessions and Dialogue History.
 * NOTE: Isolated for UI presentation; not persisted backend records.
 */

export interface TutorSessionItem {
  id: string;
  topic: string;
  subject: string;
  mode: 'socratic' | 'problem_solving' | 'direct';
  lastActivity: string;
  messageCount: number;
}

export interface ConceptNoteItem {
  id: string;
  title: string;
  subject: string;
  content: string;
  date: string;
}

export const RECENT_TUTOR_SESSIONS: TutorSessionItem[] = [
  {
    id: 's-1',
    topic: 'Overlapping Subproblems in DP',
    subject: 'Computer Science',
    mode: 'socratic',
    lastActivity: '25m ago',
    messageCount: 14,
  },
  {
    id: 's-2',
    topic: 'Geometric Interpretation of Eigenvectors',
    subject: 'Mathematics',
    mode: 'problem_solving',
    lastActivity: '3h ago',
    messageCount: 9,
  },
  {
    id: 's-3',
    topic: 'Heisenberg Uncertainty Derivation',
    subject: 'Physics',
    mode: 'direct',
    lastActivity: '1d ago',
    messageCount: 12,
  },
];

export const PINNED_CONCEPT_NOTES: ConceptNoteItem[] = [
  {
    id: 'cn-1',
    title: 'Memoization vs Tabulation Tradeoff',
    subject: 'Computer Science',
    content: 'Memoization (top-down) computes only necessary states on demand but incurs recursive stack overhead. Tabulation (bottom-up) evaluates all subproblems in topological order without call-stack limit.',
    date: 'Oct 09, 2026',
  },
  {
    id: 'cn-2',
    title: 'Spectral Theorem Key Takeaway',
    subject: 'Mathematics',
    content: 'Any real symmetric matrix A can be orthogonally factored into A = Q Λ Q^T, where Q has orthonormal eigenvector columns and Λ contains real eigenvalues.',
    date: 'Oct 10, 2026',
  },
];
