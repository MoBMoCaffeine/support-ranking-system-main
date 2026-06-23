import { StudentRanking, TrackStats } from './tracks';
import { fetchTrackBySlug } from './tracks-service';

const PLACEHOLDER_IMAGE = '/black-version-png.png';

type TrackData = { rankings: StudentRanking[]; stats: TrackStats };

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function getSheetId(url: string) {
  return url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || '';
}

function getGid(url: string) {
  return url.match(/[?&#]gid=([0-9]+)/)?.[1] || '';
}

function getCsvUrl(sheetId: string, sheetUrl: string) {
  if (sheetUrl && sheetUrl.endsWith('.csv')) return sheetUrl;

  const id = sheetId || getSheetId(sheetUrl);
  if (!id) return '';

  const gid = getGid(sheetUrl);
  const gidParam = gid ? `&gid=${encodeURIComponent(gid)}` : '';
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gidParam}`;
}

function emptyStats(): TrackStats {
  return {
    totalStudents: 0,
    highestScore: 0,
    lowestScore: 0,
    averageScore: 0,
    lastUpdate: new Date().toLocaleString(),
  };
}

function buildStats(rankings: StudentRanking[]): TrackStats {
  if (rankings.length === 0) return emptyStats();

  const scores = rankings.map(row => row.score);
  return {
    totalStudents: rankings.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    averageScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
    lastUpdate: new Date().toLocaleString(),
  };
}

function parseRankings(csv: string, trackId: string): StudentRanking[] {
  const rows = parseCsv(csv);
  const [headers, ...dataRows] = rows;

  if (!headers) return [];

  const nameIndex = headers.findIndex(header => normalizeHeader(header) === 'student name');
  const imageIndex = headers.findIndex(header => normalizeHeader(header) === 'student image');
  const scoreIndex = headers.findIndex(header => normalizeHeader(header) === 'score');

  if (nameIndex === -1 || scoreIndex === -1) return [];

  return dataRows
    .map(row => {
      const name = row[nameIndex]?.trim() || '';
      const rawScore = row[scoreIndex]?.trim() || '';
      const score = Number(rawScore);

      if (!name || !rawScore || !Number.isFinite(score)) return null;

      return {
        rank: 0,
        name,
        image: row[imageIndex]?.trim() || PLACEHOLDER_IMAGE,
        score,
        trackId,
      };
    })
    .filter((row): row is StudentRanking => row !== null)
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchTrackData(trackId: string): Promise<TrackData> {
  const track = await fetchTrackBySlug(trackId);

  if (!track) {
    return { rankings: [], stats: emptyStats() };
  }

  const csvUrl = getCsvUrl(track.sheet_id, track.sheet_url);

  if (!csvUrl) {
    return { rankings: [], stats: emptyStats() };
  }

  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error('Failed to fetch Google Sheet');
  }

  const text = await response.text();
  const rankings = parseRankings(text, track.slug || track.id);

  return {
    rankings,
    stats: buildStats(rankings),
  };
}
