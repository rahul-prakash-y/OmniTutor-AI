/**
 * Client-side mock fixture for Interactive Assessments and Quizzes.
 * NOTE: Isolated for UI presentation; not persisted backend records.
 */

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface AssessmentFixture {
  id: string;
  title: string;
  courseTitle: string;
  type: 'diagnostic' | 'quiz' | 'challenge';
  durationMinutes: number;
  questionCount: number;
  passingScorePercentage: number;
  completed: boolean;
  scorePercentage?: number;
  dueDate?: string;
  questions: AssessmentQuestion[];
}

export const ASSESSMENTS_FIXTURE: AssessmentFixture[] = [
  {
    id: 'asmt-dp-quiz-1',
    title: 'Memoization Recurrence Checkpoint',
    courseTitle: 'Advanced Dynamic Programming',
    type: 'quiz',
    durationMinutes: 15,
    questionCount: 4,
    passingScorePercentage: 75,
    completed: true,
    scorePercentage: 100,
    dueDate: 'Yesterday',
    questions: [
      {
        id: 'q1',
        prompt: 'In a top-down dynamic programming algorithm, what primary benefit does memoization provide over simple recursion?',
        options: [
          'It guarantees the call stack depth is strictly O(1)',
          'It eliminates redundant computation of identical recursive subproblems',
          'It transforms any recursive tree into an iterative breadth-first queue',
          'It reduces the overall space complexity to zero bytes',
        ],
        correctOptionIndex: 1,
        explanation: 'Memoization caches results of subproblems upon their first calculation, reducing exponential branch redundancy down to unique state evaluations.',
      },
      {
        id: 'q2',
        prompt: 'Consider computing fib(n) with standard 1D memoization array. What are the time and auxiliary space complexities?',
        options: [
          'Time O(2^n), Space O(1)',
          'Time O(n), Space O(n)',
          'Time O(n^2), Space O(n)',
          'Time O(n log n), Space O(1)',
        ],
        correctOptionIndex: 1,
        explanation: 'Each state from 0 to n is computed once in O(1) time after its children return, requiring an array of size n+1 and call stack depth of n.',
      },
      {
        id: 'q3',
        prompt: 'Which property is mandatory for a problem to be solvable via Dynamic Programming?',
        options: [
          'Greedy choice property and disjoint subproblems',
          'Optimal substructure and overlapping subproblems',
          'Total ordering of edges and topological cycles',
          'Uniform edge weights and bipartite vertices',
        ],
        correctOptionIndex: 1,
        explanation: 'Dynamic Programming requires that optimal global solutions can be constructed from optimal sub-solutions (optimal substructure) and that subproblems recur repeatedly (overlapping subproblems).',
      },
      {
        id: 'q4',
        prompt: 'When can a 2D dynamic programming table DP[i][j] be space-optimized to use only 1D or O(N) space?',
        options: [
          'When DP[i][j] only depends on states in row i and row i-1',
          'When all table entries are positive integers',
          'When the recursive formula has no base cases',
          'Only when the matrix is mathematically symmetric',
        ],
        correctOptionIndex: 0,
        explanation: 'If computing state DP[i][j] only references values from the current or immediately preceding row (i-1), earlier rows can be safely discarded.',
      },
    ],
  },
  {
    id: 'asmt-linear-diag',
    title: 'Eigenvalues & Invariant Spaces Diagnostic',
    courseTitle: 'Linear Algebra & Geometric Intuition',
    type: 'diagnostic',
    durationMinutes: 20,
    questionCount: 3,
    passingScorePercentage: 70,
    completed: false,
    dueDate: 'In 2 days',
    questions: [
      {
        id: 'q1',
        prompt: 'Geometrically, what does an eigenvector v of matrix A represent under the linear transformation defined by A?',
        options: [
          'A vector whose direction is completely inverted into a perpendicular plane',
          'A vector whose direction remains unchanged along its span, only scaled by factor λ',
          'A vector that always maps directly to the zero origin vector',
          'The determinant of the entire transformation matrix',
        ],
        correctOptionIndex: 1,
        explanation: 'By definition, Av = λv. The transformation only stretches, compresses, or reverses the vector along its original line, without rotating it away from its span.',
      },
      {
        id: 'q2',
        prompt: 'If a 2x2 matrix has det(A) = 0, what does this tell you about its null space and invertibility?',
        options: [
          'The matrix is invertible and maps 2D space onto 2D space',
          'The matrix has a non-trivial null space and is singular (non-invertible)',
          'All eigenvalues are strictly non-zero',
          'The columns of A form a basis for R^2',
        ],
        correctOptionIndex: 1,
        explanation: 'A zero determinant means the transformation collapses 2D space into a line or point, compressing at least one dimension to zero.',
      },
      {
        id: 'q3',
        prompt: 'What condition guarantees that a real matrix A has a complete orthonormal basis of eigenvectors?',
        options: [
          'A is upper triangular',
          'A is symmetric (A = A^T)',
          'det(A) is an odd integer',
          'All diagonal elements are prime numbers',
        ],
        correctOptionIndex: 1,
        explanation: 'The Spectral Theorem states that every real symmetric matrix has real eigenvalues and can be orthogonally diagonalized.',
      },
    ],
  },
  {
    id: 'asmt-ml-optim',
    title: 'Stochastic Gradient Descent Challenge',
    courseTitle: 'Machine Learning Mathematics',
    type: 'challenge',
    durationMinutes: 25,
    questionCount: 3,
    passingScorePercentage: 80,
    completed: true,
    scorePercentage: 86,
    dueDate: '3 days ago',
    questions: [
      {
        id: 'q1',
        prompt: 'In training deep neural networks, why is Stochastic Gradient Descent (SGD) preferred over full-batch Gradient Descent for massive datasets?',
        options: [
          'Full-batch computes the exact analytical solution without backpropagation',
          'SGD provides computational efficiency and stochastic noise that helps escape saddle points',
          'SGD guarantees monotonic loss reduction at every single parameter update',
          'Full-batch requires zero GPU RAM allocation',
        ],
        correctOptionIndex: 1,
        explanation: 'Evaluating mini-batches allows frequent updates without waiting for millions of samples, and gradient variance helps navigate non-convex loss surfaces.',
      },
    ],
  },
];
