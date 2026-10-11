/**
 * Client-side mock fixture for Course Catalog and Learning Paths.
 * NOTE: Isolated for UI presentation; not persisted backend records.
 */

export interface LessonFixture {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'video' | 'reading' | 'interactive';
}

export interface CourseModuleFixture {
  id: string;
  title: string;
  lessons: LessonFixture[];
}

export interface CourseFixture {
  id: string;
  title: string;
  category: 'Computer Science' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Data Science';
  description: string;
  instructor: {
    name: string;
    role: string;
    avatar: string;
  };
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationHours: number;
  rating: number;
  enrolledStudents: number;
  progressPercentage: number;
  thumbnailColor: string;
  modules: CourseModuleFixture[];
}

export const COURSES_FIXTURE: CourseFixture[] = [
  {
    id: 'cs-algo-101',
    title: 'Advanced Dynamic Programming & Graph Theory',
    category: 'Computer Science',
    description: 'Master topological sorting, minimum spanning trees, and complex multi-dimensional memoization with Socratic problem breakdown.',
    instructor: {
      name: 'Dr. Evelyn Chen',
      role: 'Principal Research Scientist',
      avatar: 'EC',
    },
    difficulty: 'Advanced',
    durationHours: 18,
    rating: 4.9,
    enrolledStudents: 3420,
    progressPercentage: 68,
    thumbnailColor: 'bg-indigo-600',
    modules: [
      {
        id: 'm1',
        title: 'Foundations of Memoization & Subproblem Graphs',
        lessons: [
          { id: 'l1', title: 'Overlapping Subproblems in Recurrence Relations', duration: '22 min', completed: true, type: 'interactive' },
          { id: 'l2', title: 'Top-Down Memoization vs Bottom-Up Tabulation', duration: '35 min', completed: true, type: 'reading' },
          { id: 'l3', title: 'Space Optimization via Sliding State Arrays', duration: '28 min', completed: true, type: 'interactive' },
        ],
      },
      {
        id: 'm2',
        title: 'Shortest Path Algorithms & DAG Traversal',
        lessons: [
          { id: 'l4', title: 'Dijkstra with Priority Queues & Dense Edge Cases', duration: '40 min', completed: true, type: 'interactive' },
          { id: 'l5', title: 'Bellman-Ford & Negative Weight Cycle Detection', duration: '30 min', completed: false, type: 'reading' },
          { id: 'l6', title: 'Floyd-Warshall All-Pairs Formulation', duration: '45 min', completed: false, type: 'interactive' },
        ],
      },
      {
        id: 'm3',
        title: 'Hard DP on Trees and Bitmasks',
        lessons: [
          { id: 'l7', title: 'Traveling Salesperson Problem with Bitmask DP', duration: '50 min', completed: false, type: 'interactive' },
          { id: 'l8', title: 'Tree Rerooting Techniques', duration: '38 min', completed: false, type: 'reading' },
        ],
      },
    ],
  },
  {
    id: 'math-linear-201',
    title: 'Linear Algebra & Geometric Intuition',
    category: 'Mathematics',
    description: 'Develop intuitive geometric mastery over eigenvectors, singular value decomposition (SVD), and multi-dimensional transformations.',
    instructor: {
      name: 'Prof. Marcus Vance',
      role: 'Chair of Applied Mathematics',
      avatar: 'MV',
    },
    difficulty: 'Intermediate',
    durationHours: 14,
    rating: 4.8,
    enrolledStudents: 2890,
    progressPercentage: 42,
    thumbnailColor: 'bg-cyan-600',
    modules: [
      {
        id: 'm1',
        title: 'Vector Spaces & Linear Maps',
        lessons: [
          { id: 'l1', title: 'Linear Combinations, Span, and Basis Vectors', duration: '25 min', completed: true, type: 'interactive' },
          { id: 'l2', title: 'Matrix Transformations as Space Morphisms', duration: '32 min', completed: true, type: 'interactive' },
          { id: 'l3', title: 'Determinants: The Scaling Factor of Space', duration: '20 min', completed: false, type: 'reading' },
        ],
      },
      {
        id: 'm2',
        title: 'Eigenvalues and Diagonalization',
        lessons: [
          { id: 'l4', title: 'Finding Invariant Axes Under Linear Maps', duration: '35 min', completed: false, type: 'interactive' },
          { id: 'l5', title: 'Spectral Theorem for Symmetric Matrices', duration: '40 min', completed: false, type: 'reading' },
        ],
      },
    ],
  },
  {
    id: 'ds-ml-foundations',
    title: 'Machine Learning Mathematics & Optimization',
    category: 'Data Science',
    description: 'A rigorous deep dive into gradient descent, convex optimization, Lagrange multipliers, and loss landscape geometry.',
    instructor: {
      name: 'Dr. Sarah Lin',
      role: 'AI Alignment Lead',
      avatar: 'SL',
    },
    difficulty: 'Intermediate',
    durationHours: 16,
    rating: 4.9,
    enrolledStudents: 4120,
    progressPercentage: 15,
    thumbnailColor: 'bg-emerald-600',
    modules: [
      {
        id: 'm1',
        title: 'Multivariate Calculus & Loss Functions',
        lessons: [
          { id: 'l1', title: 'Gradients, Jacobians, and Hessians Explained', duration: '28 min', completed: true, type: 'interactive' },
          { id: 'l2', title: 'Backpropagation Through Computational Graphs', duration: '36 min', completed: false, type: 'interactive' },
        ],
      },
      {
        id: 'm2',
        title: 'Stochastic Optimization Algorithms',
        lessons: [
          { id: 'l3', title: 'Momentum, RMSProp, and Adam Derivations', duration: '45 min', completed: false, type: 'reading' },
        ],
      },
    ],
  },
  {
    id: 'phys-quantum-301',
    title: 'Quantum Mechanics & Hilbert Spaces',
    category: 'Physics',
    description: 'Wave functions, probability currents, bra-ket notation, and harmonic oscillators derived from first principles.',
    instructor: {
      name: 'Dr. Julian Thorne',
      role: 'Theoretical Physicist',
      avatar: 'JT',
    },
    difficulty: 'Advanced',
    durationHours: 20,
    rating: 4.7,
    enrolledStudents: 1640,
    progressPercentage: 0,
    thumbnailColor: 'bg-violet-600',
    modules: [
      {
        id: 'm1',
        title: 'Postulates of Quantum Mechanics',
        lessons: [
          { id: 'l1', title: 'State Vectors & The Born Probability Rule', duration: '30 min', completed: false, type: 'reading' },
          { id: 'l2', title: 'Hermitian Operators and Observable Quantities', duration: '40 min', completed: false, type: 'interactive' },
        ],
      },
    ],
  },
];
