const API_URL = import.meta.env.VITE_API_URL || '';

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

function getAdminToken(): string | null {
  return sessionStorage.getItem('adminToken');
}

async function apiGet(endpoint: string) {
  const url = `${API_URL}${endpoint}`;
  console.log('API GET:', url);  // للـ debugging
  const res = await fetch(url);
  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function apiPost(endpoint: string, body: any, requireAuth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${API_URL}${endpoint}`;
  console.log('API POST:', url);  // للـ debugging
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));

  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem('adminToken');
    window.location.href = '/admin';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function loadTracksFromProxy(): Promise<Track[]> {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_TIME) return cache;

  const data = await apiGet('/api/tracks');  // ← FIXED: كان /tracks
  if (!Array.isArray(data)) throw new Error('Invalid data format from server');

  cache = data.map((track: any, position: number) => ({
    id: track.id,
    slug: track.id,
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
    cache = await loadTracksFromProxy();
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

export async function createTrack(track: any): Promise<Track> {
  const newTrack = {
    ...track,
    id: track.slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const res = await apiPost('/api/admin/createTrack', newTrack, true);
  cache = null; 
  return res;
}

export async function updateTrack(id: string, updates: any): Promise<Track> {
  const data = await ensureTracksLoaded();
  const updated = data.map(t =>
    t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
  );
  const res = await apiPost('/api/admin/updateTrack', updated, true);
  cache = null;
  return res;
}

export async function deleteTrack(id: string): Promise<void> {
  const data = await ensureTracksLoaded();
  const updated = data.filter(t => t.id !== id);
  await apiPost('/api/admin/deleteTrack', updated, true);
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

const studentCache: Record<string, { data: StudentRecord[]; time: number }> = {};

export async function getTrackStudents(trackId: string): Promise<StudentRecord[]> {
  const cacheKey = trackId;
  const now = Date.now();
  if (studentCache[cacheKey] && now - studentCache[cacheKey].time < CACHE_TIME) {
    return studentCache[cacheKey].data;
  }

  try {
    const data = await apiGet(`/api/tracks/${encodeURIComponent(trackId)}/students`);
    if (!Array.isArray(data)) throw new Error('Invalid student data format from server');

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

  await apiPost('/api/admin/addStudent', {
    action: 'addStudent',
    sheetId: track.sheet_id,
    student: newStudent,
  }, true);

  studentCache[trackId] = { data: [], time: 0 };
  return newStudent;
}

export async function updateStudents(trackId: string, students: StudentRecord[]): Promise<void> {
  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) throw new Error('Track has no connected sheet');

  const studentsWithScore = students.map(s => ({ ...s, score: calculateScore(s) }));

  await apiPost('/api/admin/updateStudents', {
    action: 'updateStudents',
    sheetId: track.sheet_id,
    trackId,
    students: studentsWithScore,
  }, true);

  studentCache[trackId] = { data: [], time: 0 };
}

export async function deleteStudent(trackId: string, studentId: string): Promise<void> {
  const track = await fetchTrackBySlug(trackId);
  if (!track || !track.sheet_id) throw new Error('Track has no connected sheet');

  await apiPost('/api/admin/deleteStudent', {
    action: 'deleteStudent',
    sheetId: track.sheet_id,
    studentId,
  }, true);

  studentCache[trackId] = { data: [], time: 0 };
}