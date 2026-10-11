/**
 * Client-side mock fixture for Cognitive Learning Progress & Analytics.
 * NOTE: Isolated for UI presentation; not persisted backend records.
 */

export interface DailyStudyTime {
  day: string;
  hours: number;
}

export interface SkillMastery {
  skill: string;
  category: string;
  masteryPercentage: number;
  level: 'Novice' | 'Competent' | 'Proficient' | 'Master';
}

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
  iconName: string;
}

export const WEEKLY_STUDY_TIME: DailyStudyTime[] = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 3.2 },
  { day: 'Wed', hours: 1.8 },
  { day: 'Thu', hours: 4.0 },
  { day: 'Fri', hours: 2.1 },
  { day: 'Sat', hours: 0.8 },
  { day: 'Sun', hours: 1.5 },
];

export const SKILL_MASTERY_LIST: SkillMastery[] = [
  { skill: 'Dynamic Programming & Memoization', category: 'Computer Science', masteryPercentage: 92, level: 'Master' },
  { skill: 'Graph Algorithms & Shortest Path', category: 'Computer Science', masteryPercentage: 78, level: 'Proficient' },
  { skill: 'Vector Spaces & Invariant Subspaces', category: 'Mathematics', masteryPercentage: 84, level: 'Proficient' },
  { skill: 'Convex Optimization & Gradient Flows', category: 'Data Science', masteryPercentage: 65, level: 'Competent' },
  { skill: 'Quantum Superposition & Wave Mechanics', category: 'Physics', masteryPercentage: 54, level: 'Competent' },
];

export const MILESTONE_BADGES: MilestoneBadge[] = [
  {
    id: 'b1',
    title: 'Socratic Thinker',
    description: 'Engaged in 25 multi-turn guided inquiries without requesting direct solutions.',
    earnedDate: 'Oct 08, 2026',
    iconName: 'Brain',
  },
  {
    id: 'b2',
    title: '5-Day Continuous Streak',
    description: 'Maintained continuous daily cognitive practice for five consecutive days.',
    earnedDate: 'Oct 10, 2026',
    iconName: 'Flame',
  },
  {
    id: 'b3',
    title: 'Algorithm Virtuoso',
    description: 'Achieved 100% on Advanced Dynamic Programming Checkpoint.',
    earnedDate: 'Yesterday',
    iconName: 'Award',
  },
];
