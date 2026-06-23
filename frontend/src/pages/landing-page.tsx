import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StudentRanking, TrackStats } from '@/lib/tracks';
import { fetchTrackData } from '@/lib/sheets-service';
import { fetchTracks, Track } from '@/lib/tracks-service';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  Crown,
  Medal,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import landing_image from '../../public/landing.png';
import { Counter } from './CounterAnimation';


interface TrackWithData {
  config: Track;
  topStudent: StudentRanking | null;
  stats: TrackStats | null;
  loading: boolean;
}

export function LandingPage() {
  const [tracks, setTracks] = useState<TrackWithData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  const loadData = useCallback(async () => {
    const activeTracks = await fetchTracks();

    const trackData: TrackWithData[] = activeTracks.map(config => ({
      config,
      topStudent: null,
      stats: null,
      loading: true,
    }));
    setTracks([...trackData]);
    setHeroLoading(true);

    let totalStudentsCount = 0;
    let maxScore = 0;
    let totalAvgScore = 0;
    let trackCount = 0;

    for (let i = 0; i < activeTracks.length; i++) {
      const config = activeTracks[i];
      try {
        const { rankings, stats } = await fetchTrackData(config.slug || config.id);
        trackData[i] = {
          config,
          topStudent: rankings[0] || null,
          stats,
          loading: false,
        };

        if (stats) {
          totalStudentsCount += stats.totalStudents;
          maxScore = Math.max(maxScore, stats.highestScore);
          totalAvgScore += stats.averageScore;
          trackCount++;
        }
      } catch {
        trackData[i] = { config, topStudent: null, stats: null, loading: false };
      }
    }

    setTracks([...trackData]);
    setTotalStudents(totalStudentsCount);
    setTotalTracks(trackCount);
    setHighestScore(maxScore);
    setAverageScore(trackCount > 0 ? Math.round((totalAvgScore / trackCount) * 10) / 10 : 0);
    setHeroLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 60000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        {/* FIX: Reduced blur intensity and added opacity to prevent scroll artifacts */}
        <div
          className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-primary/5 rounded-full pointer-events-none -z-10"
          style={{ filter: 'blur(100px)', opacity: 0.5, transform: 'translateX(-50%) translateZ(0)' }}
        />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Support Community Standing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Track Rankings.
            <br />
            <span className="text-gradient">Support Community </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Explore student rankings across all training tracks and follow performance in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <img
              src={landing_image}
              className="max-h-80 w-auto shadow-lg shadow-green-500 rounded-full"
              style={{ transform: 'translateZ(0)' }}
              alt="Landing"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient">
                {heroLoading ? <span className="inline-block w-16 h-10 rounded bg-muted animate-pulse" /> : <Counter value={totalTracks} />}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Active Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient">
                {heroLoading ? <span className="inline-block w-16 h-10 rounded bg-muted animate-pulse" /> : <Counter value={totalStudents} />}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient">
                {heroLoading ? <span className="inline-block w-16 h-10 rounded bg-muted animate-pulse" /> : <Counter value={highestScore} decimals={1} />}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Highest Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gradient">
                {heroLoading ? <span className="inline-block w-16 h-10 rounded bg-muted animate-pulse" /> : <Counter value={averageScore} decimals={1} />}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Average Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracks Section */}
      <section id="tracks" className="py-16 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Training Tracks</h2>
            <p className="text-muted-foreground">
              Select a track to view the full leaderboard and rankings
            </p>
          </div>

          {tracks.length === 0 && !heroLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>No active tracks found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tracks.map((track) => (
                <Link
                  key={track.config.id}
                  to={`/track/${track.config.slug || track.config.id}`}
                  className="group block"
                >
                  {/* FIX: Added translateZ(0) for GPU acceleration and removed card-hover */}
                  <Card
                    className="bg-card border-border/50 overflow-hidden h-full min-h-[280px] hover:shadow-lg hover:shadow-primary/10 transition-shadow duration-300"
                    style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                  >
                    <div className="h-1.5 w-full" style={{ backgroundColor: track.config.color }} />
                    <CardContent className="pt-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${track.config.color}15` }}
                        >
                          <Trophy className="w-6 h-6" style={{ color: track.config.color }} />
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">
                            {track.stats?.lastUpdate ? 'Updated recently' : 'Loading...'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                        {track.config.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {track.config.description}
                      </p>

                      {track.loading ? (
                        <div className="space-y-2">
                          <div className="h-4 w-full rounded bg-muted animate-pulse" />
                          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                        </div>
                      ) : track.topStudent ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img
                              src={track.topStudent.image}
                              alt={track.topStudent.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <Crown className="w-3 h-3 text-[#FFD700]" />
                              <span className="text-xs font-medium text-[#FFD700]">Top</span>
                            </div>
                            <p className="text-sm font-medium truncate">{track.topStudent.name}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-lg" style={{ color: track.config.color }}>
                              {track.topStudent.score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">
                          No data available
                        </div>
                      )}

                      {track.stats && (
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{track.stats.totalStudents} students</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>Avg {track.stats.averageScore.toFixed(1)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                        View Leaderboard
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top Performers */}
      <section className="py-16 border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Top Performers</h2>
            <p className="text-muted-foreground">
              The highest scoring students across all tracks
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-4xl mx-auto">
            {tracks.filter(t => t.topStudent).slice(0, 3).map((track, i) => {
              const icon = i === 0 ? <Crown className="w-5 h-5" /> : i === 1 ? <Medal className="w-5 h-5" /> : <Award className="w-5 h-5" />;
              const borderColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32';
              return (
                <Card
                  key={track.config.id}
                  className={cn(
                    'bg-card/80 border-2 w-full md:w-72 overflow-hidden',
                    i === 0 ? 'md:scale-105' : ''
                  )}
                  style={{
                    borderColor,
                    transform: i === 0 ? 'scale(1.05) translateZ(0)' : 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <div className="p-6 text-center">
                    <div
                      className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: borderColor, color: '#000' }}
                    >
                      {icon}
                    </div>
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 mb-4" style={{ borderColor }}>
                      <img
                        src={track.topStudent!.image}
                        alt={track.topStudent!.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{track.topStudent!.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{track.config.name}</p>
                    <div className="font-mono text-2xl font-bold" style={{ color: track.config.color }}>
                      {track.topStudent!.score.toFixed(1)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}