export interface Track {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  sheet_id: string;
  sheet_url: string;
  position: number;
  status: string;
  enrollment_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  image: string;
  score: number;
  attendency: number;
  tasks: number;
  activity: number;
  contAttendance: number;
  bonus: number;
}

let cache: Track[] | null = null;
let lastFetch = 0;
const CACHE_TIME = 60 * 1000;

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

async function fetchFromScript(action: string, payload?: any, method: 'GET' | 'POST' = 'GET'): Promise<any> {
  if (method === 'POST') {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }

    const data = await res.json().catch(() => {
      throw new Error('Invalid JSON response');
    });

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }

  // GET logic for read operations
  const params = new URLSearchParams();
  params.append('action', action);
  if (payload) {
    params.append('data', JSON.stringify(payload));
  }

  const url = `${APPS_SCRIPT_URL}?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  const data = await res.json().catch(() => {
    throw new Error('Invalid JSON response');
  });

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

async function loadTracksFromScript(): Promise<Track[]> {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_TIME) return cache;

  const data = await fetchFromScript('getTracks');

  if (!Array.isArray(data)) throw new Error('Invalid data format');

  cache = data.map((track: any, position: number) => ({
    id: track.id,
    slug: track.slug || track.id,
    name: track.name,
    description: track.description,
    color: track.color,
    sheet_id: track.sheet_id || "",
    sheet_url: track.sheet_url || "",
    position: track.position ?? position,
    status: track.status || "active",
    enrollment_open: track.enrollment_open ?? true,
    created_at: track.created_at || new Date(0).toISOString(),
    updated_at: track.updated_at || new Date(0).toISOString(),
  }));

  lastFetch = now;
  return cache;
}

async function ensureTracksLoaded(): Promise<Track[]> {
  if (!cache || Date.now() - lastFetch > CACHE_TIME) {
    cache = await loadTracksFromScript();
  }
  return cache;
}

const sortTracks = (items: Track[]) => [...items].sort((a, b) => a.position - b.position);

export async function fetchTracks(): Promise<Track[]> {
  const data = await ensureTracksLoaded();
  return sortTracks(data.filter(t => t.status === 'active'));
}

export async function fetchAllTracks(): Promise<Track[]> {
  const data = await ensureTracksLoaded();
  return sortTracks(data);
}

export async function fetchTrackBySlug(slug: string): Promise<Track | null> {
  const data = await ensureTracksLoaded();
  return data.find(t => t.slug === slug || t.id === slug) || null;
}

export async function adminLogin(password: string, key: string): Promise<string> {
  if (password !== ADMIN_PASSWORD || key !== ADMIN_KEY) {
    throw new Error('Invalid credentials');
  }

  const token = btoa(`admin:${Date.now()}`);
  sessionStorage.setItem('adminToken', token);
  return token;
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem('adminToken');
}

export async function createTrack(track: any): Promise<Track> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const newTrack = {
    ...track,
    id: track.slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const res = await fetchFromScript('createTrack', { token, track: newTrack }, 'POST');
  cache = null;
  return res;
}

export async function updateTrack(id: string, updates: any): Promise<Track> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetchFromScript('updateTrack', { token, id, updates }, 'POST');
  cache = null;
  return res;
}

export async function deleteTrack(id: string): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  await fetchFromScript('deleteTrack', { token, id }, 'POST');
  cache = null;
}

export function calculateScore(student: Omit<StudentRecord, 'id' | 'score'>): number {
  return (
    Number(student.attendency || 0) +
    Number(student.tasks || 0) +
    Number(student.activity || 0) +
    Number(student.contAttendance || 0) +
    Number(student.bonus || 0)
  );
}

export function enrichStudentScore(student: any): StudentRecord {
  const attendency = Number(student.attendency ?? student.Attendency ?? 0);
  const tasks = Number(student.tasks ?? student.Tasks ?? 0);
  const activity = Number(student.activity ?? student.Activity ?? 0);
  const contAttendance = Number(student.contAttendance ?? student['Cont Attendance'] ?? 0);
  const bonus = Number(student.bonus ?? student.Bonus ?? 0);

  return {
    id: String(student.id ?? student.ID ?? ''),
    name: student.name ?? student['Student Name'] ?? '',
    image: student.image ?? student['Student Image'] ?? '',
    score: attendency + tasks + activity + contAttendance + bonus,
    attendency,
    tasks,
    activity,
    contAttendance,
    bonus,
  };
}

// Student cache
const studentCache: Record<string, { data: StudentRecord[]; time: number }> = {};

export async function getTrackStudents(trackId: string): Promise<StudentRecord[]> {
  const token = getAdminToken();
  const cacheKey = trackId;
  const now = Date.now();
  if (studentCache[cacheKey] && now - studentCache[cacheKey].time < CACHE_TIME) {
    return studentCache[cacheKey].data;
  }

  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) {
    console.warn('Track has no connected sheet:', trackId);
    return [];
  }

  try {
    const data = await fetchFromScript('getStudents', { sheetId: track.sheet_id, token });
    if (!Array.isArray(data)) throw new Error('Invalid student data');

    const students = data.map(enrichStudentScore);
    studentCache[cacheKey] = { data: students, time: now };
    return students;
  } catch (e: any) {
    if (e.message?.includes('no connected sheet')) {
      console.warn('Track has no connected sheet:', trackId);
      return [];
    }
    throw e;
  }
}
export async function addStudent(
  trackId: string,
  student: Omit<StudentRecord, 'id' | 'score'> & { id?: string }
): Promise<StudentRecord> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) throw new Error('Track has no connected sheet');

  const score = calculateScore(student);
  const newStudent = {
    id: student.id?.trim() || `${Date.now()}`,
    name: student.name,
    image: student.image,
    score,
    attendency: student.attendency,
    tasks: student.tasks,
    activity: student.activity,
    contAttendance: student.contAttendance,
    bonus: student.bonus,
  };

  await fetchFromScript('addStudent', {
    token,
    sheetId: track.sheet_id,
    student: newStudent,
  }, 'POST');

  studentCache[trackId] = { data: [], time: 0 };
  return newStudent;
}

export async function updateStudents(trackId: string, students: StudentRecord[]): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) throw new Error('Track has no connected sheet');

  const studentsWithScore = students.map(s => ({ ...s, score: calculateScore(s) }));

  await fetchFromScript('updateStudents', {
    token,
    sheetId: track.sheet_id,
    trackId,
    students: studentsWithScore,
  }, 'POST');

  studentCache[trackId] = { data: [], time: 0 };
}

export async function deleteStudent(trackId: string, studentId: string): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error('Not authenticated');

  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) throw new Error('Track has no connected sheet');

  await fetchFromScript('deleteStudent', {
    token,
    sheetId: track.sheet_id,
    studentId,
  }, 'POST');

  studentCache[trackId] = { data: [], time: 0 };
}