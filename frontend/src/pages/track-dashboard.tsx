import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StudentRanking, TrackStats } from '@/lib/tracks';
import { fetchTrackData } from '@/lib/sheets-service';
import { fetchTrackBySlug, Track } from '@/lib/tracks-service';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Trophy,
  ArrowLeft,
  Search,
  Users,
  Crown,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Counter } from './CounterAnimation';

function ScoreDistributionChart({ scores }: { scores: number[] }) {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const buckets = 10;
  const bucketSize = range / buckets;
  const counts = new Array(buckets).fill(0);

  scores.forEach(s => {
    const bucket = Math.min(Math.floor((s - min) / bucketSize), buckets - 1);
    counts[bucket]++;
  });

  const maxCount = Math.max(...counts);

  return (
    <div className="flex items-end gap-1 h-32">
      {counts.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/30 rounded-t hover:bg-primary/50 transition-colors"
            style={{ height: `${(count / maxCount) * 100}%` }}
          />
          <span className="text-[10px] text-muted-foreground">{Math.round(min + i * bucketSize)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrackDashboard() {
  const { trackId } = useParams<{ trackId: string }>();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [stats, setStats] = useState<TrackStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [track, setTrack] = useState<Track | null | undefined>(undefined);

  const loadData = useCallback(async (id = trackId, showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    try {
      const { rankings, stats } = await fetchTrackData(id);
      setRankings(rankings);
      setStats(stats);
    } catch (error) {
      console.error('Error loading track data:', error);
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    let cancelled = false;

    const loadTrack = async () => {
      if (!trackId) return;
      setTrack(undefined);
      const t = await fetchTrackBySlug(trackId);
      if (cancelled) return;
      setTrack(t);
      if (t) {
        loadData(t.slug || t.id);
      }

      const interval = window.setInterval(() => {
        if (t) loadData(t.slug || t.id, false);
      }, 60000);

      return () => window.clearInterval(interval);
    };

    let cleanup: (() => void) | undefined;
    loadTrack().then(clear => {
      cleanup = clear;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loadData, trackId]);

  const filteredRankings = rankings.filter(
    r => r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = filteredRankings.slice(0, 3);
  const remaining = filteredRankings.slice(3);
  const scores = rankings.map(r => r.score);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'bg-card border border-border';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6" />;
    if (rank === 2) return <Medal className="w-6 h-6" />;
    if (rank === 3) return <Award className="w-6 h-6" />;
    return <span className="font-mono text-lg font-bold">{rank}</span>;
  };

  const getRankChange = () => {
    const random = Math.random();
    if (random > 0.7) return { icon: <TrendingUp className="w-4 h-4 text-primary" />, value: `+${Math.floor(Math.random() * 5) + 1}` };
    if (random < 0.3) return { icon: <TrendingDown className="w-4 h-4 text-destructive" />, value: `-${Math.floor(Math.random() * 5) + 1}` };
    return { icon: <Minus className="w-4 h-4 text-muted-foreground" />, value: '' };
  };

  if (track === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-12 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Track Not Found</h1>
            <p className="text-muted-foreground mb-4">This track does not exist.</p>
            <Link to="/" className="text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!track) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <Link
            to="/#tracks"
            onClick={() => {
              setTimeout(() => {
                document
                  .getElementById("tracks")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tracks
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${track.color}15` }}
            >
              <Trophy className="w-6 h-6" style={{ color: track.color }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{track.name}</h1>
              <p className="text-muted-foreground">{track.description}</p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="bg-card/50 border-border/50"
              style={{ transform: 'translateZ(0)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? '-' : <Counter value={stats?.totalStudents || 0} />}</p>
                    <p className="text-sm text-muted-foreground">Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-card/50 border-border/50"
              style={{ transform: 'translateZ(0)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? '-' : <Counter
                      value={stats?.highestScore || 0}
                      decimals={1}
                    />}</p>
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-card/50 border-border/50"
              style={{ transform: 'translateZ(0)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? '-' : <Counter
                      value={stats?.lowestScore || 0}
                      decimals={1}
                    />}</p>
                    <p className="text-sm text-muted-foreground">Lowest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-card/50 border-border/50"
              style={{ transform: 'translateZ(0)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? '-' : <Counter
                      value={stats?.averageScore || 0}
                      decimals={1}
                    />}</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Top 3 Section - FIXED */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Top 3</h2>
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 max-w-5xl mx-auto">
            {/* Rank 2 */}
            {top3[1] && (
              <div className="order-2 md:order-none w-full md:w-72 flex flex-col items-center">
                <Card
                  className="w-full bg-card/80 border-2 overflow-hidden"
                  style={{
                    borderColor: '#C0C0C0',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <CardContent className="pt-6 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-[#C0C0C0] text-black flex items-center justify-center mb-3">
                      <Medal className="w-5 h-5" />
                    </div>
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#C0C0C0] mb-3">
                      <img
                        src={top3[1].image}
                        alt={top3[1].name}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{top3[1].name}</h3>
                    <div className="font-mono text-xl font-bold text-[#C0C0C0]">
                      {top3[1].score.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                      <span>Rank</span>
                      <span className="font-bold text-[#C0C0C0]">#2</span>
                    </div>
                  </CardContent>
                </Card>
                {/* FIX: Removed the problematic decorative line */}
              </div>
            )}

            {/* Rank 1 */}
            {top3[0] && (
              <div className="order-1 md:order-none w-full md:w-80 flex flex-col items-center md:-mb-6">
                <Card
                  className="w-full bg-card/80 border-2 overflow-hidden"
                  style={{
                    borderColor: '#FFD700',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)'
                  }}
                >
                  <CardContent className="pt-8 text-center">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-[#FFD700] text-black flex items-center justify-center mb-3">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-[#FFD700] mb-4">
                      <img
                        src={top3[0].image}
                        alt={top3[0].name}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    <h3 className="font-semibold text-xl mb-1">{top3[0].name}</h3>
                    <div className="font-mono text-3xl font-bold text-[#FFD700]">
                      {top3[0].score.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="text-sm text-muted-foreground">Rank</span>
                      <span className="font-bold text-[#FFD700]">#1</span>
                    </div>
                  </CardContent>
                </Card>
                {/* FIX: Removed the problematic decorative line */}
              </div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <div className="order-3 md:order-none w-full md:w-72 flex flex-col items-center">
                <Card
                  className="w-full bg-card/80 border-2 overflow-hidden"
                  style={{
                    borderColor: '#CD7F32',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <CardContent className="pt-6 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-[#CD7F32] text-black flex items-center justify-center mb-3">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#CD7F32] mb-3">
                      <img
                        src={top3[2].image}
                        alt={top3[2].name}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{top3[2].name}</h3>
                    <div className="font-mono text-xl font-bold text-[#CD7F32]">
                      {top3[2].score.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                      <span>Rank</span>
                      <span className="font-bold text-[#CD7F32]">#3</span>
                    </div>
                  </CardContent>
                </Card>
                {/* FIX: Removed the problematic decorative line */}
              </div>
            )}
          </div>
        </div>

        {/* Score Distribution */}
        {scores.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <Card
              className="bg-card/50 border-border/50"
              style={{ transform: 'translateZ(0)' }}
            >
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Score Distribution
                </h3>
                <ScoreDistributionChart scores={scores} />
                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                  <span>Low: {stats?.lowestScore.toFixed(1)}</span>
                  <span>High: {stats?.highestScore.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Leaderboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
          </div>

          <Card
            className="bg-card/50 border-border/50"
            style={{ transform: 'translateZ(0)' }}
          >
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : remaining.length === 0 && filteredRankings.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rankings found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-16">Rank</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Student</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-32">Score</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-24">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRankings.map((r) => {
                        const change = getRankChange();
                        return (
                          <tr
                            key={r.rank}
                            className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center font-bold', getRankStyle(r.rank))}>
                                {getRankIcon(r.rank)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border border-border bg-secondary">
                                  <img
                                    src={r.image}
                                    alt={r.name}
                                    className="w-full h-full object-cover"
                                    loading="eager"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">{r.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="font-mono font-bold text-lg">{r.score.toFixed(1)}</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {change.icon}
                                {change.value && (
                                  <span className={cn(
                                    'text-sm font-medium',
                                    change.value.startsWith('+') ? 'text-primary' : 'text-destructive'
                                  )}>
                                    {change.value}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}