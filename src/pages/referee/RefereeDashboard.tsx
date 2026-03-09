import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Trophy, Calendar, MessageCircle, Clock, CheckCircle, ArrowRight, Lock, Unlock, XCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MatchScoreModal } from '@/components/referee/MatchScoreModal';
import { Link } from 'react-router-dom';
import { RecentChatsWidget } from '@/components/shared/RecentChatsWidget';

// Interface matching the API response
interface APIFixture {
  id: number;
  home_team: string; // string
  away_team: string;
  date: string;
  time: string;
  venue: string;
  status: string;
  referee?: string;
  home_score?: number;
  away_score?: number;
}

import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

// ... (previous imports)

const RefereeDashboard = () => {
  const { user } = useAuth();
  const [upcomingGames, setUpcomingGames] = useState<APIFixture[]>([]);
  const [openGames, setOpenGames] = useState<APIFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  // Fetch games from API
  const fetchData = async () => {
    try {
      const [gamesRes, windowRes] = await Promise.all([
        apiFetch('/api/referee/my-games'),
        apiFetch('/api/admin/availability-window')
      ]);

      if (gamesRes.ok) {
        const data = await gamesRes.json();
        setUpcomingGames(data.assigned);
        setOpenGames(data.open || []);
      }

      if (windowRes.ok) {
        const wData = await windowRes.json();
        setIsWindowOpen(wData.isOpen);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePickup = async (gameId: number) => {
    try {
      const res = await apiFetch(`/api/referee/games/${gameId}/pickup`, {
        method: 'POST'
        
      });

      if (res.ok) {
        toast.success("Game claimed successfully!");
        fetchData(); // Refresh to move it to assigned list
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to claim game");
      }
    } catch (e) {
      toast.error("Error claiming game");
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Referee Dashboard"
        description="Manage your games and track your stats"
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Games Reffed"
          value={user?.games_reffed || 0}
          icon={<Trophy className="h-6 w-6" />}
        />
        {/* Removed Reliability, Rating, and Earnings cards as requested */}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Open Games (Urgent Pickup) */}
        {openGames.length > 0 && (
          <Card variant="urgent" className="lg:col-span-2 border-orange-500/50 bg-orange-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Unlock className="h-5 w-5" />
                Open Games - Coverage Needed
              </CardTitle>
              <CardDescription className="text-orange-600/80">
                These games currently have no referee. Result of dropouts or unallocated slots. First come, first served.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openGames.map(game => (
                <Card key={game.id} className="bg-background/80 backdrop-blur">
                  <CardContent className="p-4">
                    <p className="font-bold text-foreground mb-1">{game.home_team} vs {game.away_team}</p>
                    <div className="text-sm text-muted-foreground space-y-1 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(game.date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {game.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {game.venue}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => handlePickup(game.id)}
                    >
                      Claim Game
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="lg:col-span-1">
          <RecentChatsWidget />
        </div>

        {/* Availability / Action Item */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Game Sign-Up
            </CardTitle>
            <CardDescription>
              {isWindowOpen ? 'Sign-ups are currently OPEN' : 'Sign-ups are currently CLOSED'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isWindowOpen ? (
              <div className="bg-success/10 border border-success/20 rounded-lg p-6 text-center">
                <Unlock className="h-10 w-10 mx-auto text-success mb-3" />
                <h3 className="text-lg font-semibold text-success mb-2">Availability Window Open!</h3>
                <p className="text-muted-foreground mb-4">
                  The admin has opened the sign-up window for upcoming games.
                  Put yourself forward for the matches you want to referee.
                </p>
                <Button asChild className="w-full bg-success hover:bg-success/90 text-white">
                  <Link to="/referee/availability">
                    Go to Sign-Up Page <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
                <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Window Closed</h3>
                <p className="text-muted-foreground mb-4">
                  You cannot sign up for new games at this time.
                  Wait for the admin to open the next allocation window.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/referee/availability">
                    View Status
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Games */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              My Upcoming Games
            </CardTitle>
            <CardDescription>Your assigned matches for the coming days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Loading games...</p>
            ) : upcomingGames.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center italic">No upcoming games assigned.</p>
            ) : (
              upcomingGames.map(game => (
                <Card key={game.id} variant="default" className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {game.home_team} vs {game.away_team}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(game.date), 'EEEE, MMMM d')} at {game.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{game.venue}</p>

                        {game.status === 'completed' && (
                          <p className="text-sm font-bold text-success mt-1">
                            Result: {game.home_score} - {game.away_score}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {game.status === 'cancelled' ? (
                          <div className="flex items-center text-destructive gap-1 border border-destructive/20 bg-destructive/10 px-3 py-1.5 rounded-md text-sm">
                            <XCircle className="h-4 w-4" />
                            Cancelled
                          </div>
                        ) : game.status === 'completed' ? (
                          <div className="flex items-center text-success gap-1 border border-success/20 bg-success/10 px-3 py-1.5 rounded-md text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Final
                          </div>
                        ) : (
                          <>
                            <MatchScoreModal
                              fixture={game}
                              onScoreSubmitted={fetchData}
                            />
                            <Button size="sm" variant="outline">
                              <MessageCircle className="h-4 w-4" />
                              Chat
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RefereeDashboard;
