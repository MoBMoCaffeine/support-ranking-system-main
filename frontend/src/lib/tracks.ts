export interface TrackConfig {
  id: string;
  name: string;
  sheetId: string;
  sheetUrl: string;
  description: string;
  color: string;
}

export const TRACKS: TrackConfig[] = [
  {
    id: 'fundamentals-1',
    name: 'Fundamentals Level 1',
    sheetId: '',
    sheetUrl: '',
    description: 'Core programming fundamentals and basic algorithms',
    color: '#00CC00',
  },
  {
    id: 'fundamentals-2',
    name: 'Fundamentals Level 2',
    sheetId: '',
    sheetUrl: '',
    description: 'Advanced programming fundamentals and data structures',
    color: '#00BFFF',
  },
  {
    id: 'web-development',
    name: 'Web Development',
    sheetId: '',
    sheetUrl: '',
    description: 'Building modern web applications using popular frameworks',
    color: '#FF6B35',
  },
  {
    id: 'problem-solving-2',
    name: 'Problem Solving Level 2',
    sheetId: '',
    sheetUrl: '',
    description: 'Advanced problem solving and optimization techniques',
    color: '#A855F7',
  },
  {
    id: 'ccna',
    name: 'CCNA',
    sheetId: '',
    sheetUrl: '',
    description: 'Cisco Certified Network Associate (CCNA) certification track',
    color: '#F59E0B',
  },
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    sheetId: '',
    sheetUrl: '',
    description: 'Designing and building data pipelines and infrastructure',
    color: '#EF4444',
  },
];

export interface StudentRanking {
  rank: number;
  name: string;
  image: string;
  score: number;
  trackId: string;
}

export interface TrackStats {
  totalStudents: number;
  highestScore: number;
  lowestScore: number;
  averageScore: number;
  lastUpdate: string;
}
