import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, MapPin, Trophy, Loader2 } from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import type { Fixture } from '@/types/api';

const CaptainFixtures = () => {
  const { user } = useAuth();
  const [upcomingGames, setUpcomingGames] = useState<Fixture[]>([]);
  const [completedGames, setCompletedGames] = useState<Fixture[]>([]);
  const [teamName, setTeamName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Forfeit confirmation state
  const [forfeitFixtureId, setForfeitFixtureId] = useState<number | null>(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const refetchFixtures = async () => {
    try {
      const response = await apiFetch('/api/captain/fixtures');
      if (response.ok) {
        const data = await response.json();
        setUpcomingGames(data.upcoming || []);
        setCompletedGames(data.past || []);
        setTeamName(data.team_name || user?.team_name || '');
      }
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const response = await apiFetch('/api/captain/fixtures');
        if (response.ok) {
          const data = await response.json();
          setUpcomingGames(data.upcoming || []);
          setCompletedGames(data.past || []);
          setTeamName(data.team_name || user?.team_name || '');
        } else {
          throw new Error('Failed to fetch fixtures');
        }
      } catch (error) {
        console.error('Failed to fetch fixtures:', error);
        toast.error('Failed to load fixtures');
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, [user]);

  const handleForfeit = (fixtureId: number) => {
    setForfeitFixtureId(fixtureId);
    setShowForfeitConfirm(true);
  };

  const confirmForfeit = async () => {
    if (!forfeitFixtureId) return;
    setActionLoading(forfeitFixtureId);
    try {
      const res = await apiFetch(`/api/captain/fixtures/${forfeitFixtureId}/forfeit`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Match forfeited. -3 point penalty applied.');
        await refetchFixtures();
      } else {
        toast.error(data.error || 'Failed to forfeit');
      }
    } catch (e) {
      toast.error('Network error — could not process forfeit');
    } finally {
      setActionLoading(null);
      setShowForfeitConfirm(false);
      setForfeitFixtureId(null);
    }
  };

  const handlePostpone = async (fixtureId: number) => {
    setActionLoading(fixtureId);
    try {
      const res = await apiFetch(`/api/captain/fixtures/${fixtureId}/postpone`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Postponement request submitted for review');
        await refetchFixtures();
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch (e) {
      toast.error('Network error — could not submit request');
    } finally {
      setActionLoading(null);
    }
  };

  const getMatchLabel = (game: { tournament_id?: number | null; round_name?: string | null }) =>
    game.tournament_id ? (game.round_name ?? 'Tournament Match') : 'League Match';

  const getActionButton = (fixture: Fixture) => {
    const fixtureDate = parseISO(fixture.date);
    const hoursUntil = differenceInHours(fixtureDate, new Date());

    if (hoursUntil > 72) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handlePostpone(fixture.id)}
        >
          <Clock className="h-4 w-4 mr-1" />
          Request Postponement
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleForfeit(fixture.id)}
      >
        Forfeit Match
      </Button>
    );
  };

  const GameCard = ({ fixture, showActions = false }: { fixture: Fixture; showActions?: boolean }) => (
    <Card variant="elevated" className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-gold">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {fixture.is_home ? (
                  <>
                    <span className="text-gold">{fixture.home_team}</span>
                    {fixture.status === 'completed' && (
                      <span className="mx-2">{fixture.home_score}</span>
                    )}
                    <span className="text-muted-foreground mx-2">-</span>
                    {fixture.status === 'completed' && (
                      <span className="mx-2">{fixture.away_score}</span>
                    )}
                    {fixture.away_team}
                  </>
                ) : (
                  <>
                    {fixture.home_team}
                    {fixture.status === 'completed' && (
                      <span className="mx-2">{fixture.home_score}</span>
                    )}
                    <span className="text-muted-foreground mx-2">-</span>
                    {fixture.status === 'completed' && (
                      <span className="mx-2">{fixture.away_score}</span>
                    )}
                    <span className="text-gold">{fixture.away_team}</span>
                  </>
                )}
              </p>
              <p className="text-xs font-medium text-gold/80 uppercase tracking-wider">
                {getMatchLabel(fixture)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(fixture.date), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {fixture.time || 'TBC'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {fixture.venue || 'TBC'}
                </span>
                {fixture.referee && (
                  <span className="flex items-center gap-1 text-gold">
                    <div className="h-3 w-3 rounded-full bg-gold/50" />
                    Ref: {fixture.referee}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={fixture.is_home ? 'default' : 'secondary'}>
              {fixture.is_home ? 'Home' : 'Away'}
            </Badge>
            {fixture.result && (
              <Badge
                variant={fixture.result === 'win' ? 'default' : fixture.result === 'draw' ? 'secondary' : 'destructive'}
                className={fixture.result === 'win' ? 'bg-success' : ''}
              >
                {fixture.result === 'win' ? 'Won' : fixture.result === 'draw' ? 'Draw' : 'Lost'}
              </Badge>
            )}
            {showActions && getActionButton(fixture)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Season Fixtures"
        description={teamName ? `${teamName} - Full season schedule` : 'Full season schedule'}
      />

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcomingGames.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedGames.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {/* Scheduled Fixtures */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Scheduled</h3>
            {upcomingGames.filter(f => f.status === 'scheduled').map(fixture => (
              <GameCard key={fixture.id} fixture={fixture} showActions />
            ))}
            {upcomingGames.filter(f => f.status === 'scheduled').length === 0 && (
              <Card variant="elevated">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No scheduled fixtures</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Postponed Fixtures */}
          {upcomingGames.filter(f => f.status === 'postponed').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Postponed (Awaiting Reschedule)</h3>
              {upcomingGames.filter(f => f.status === 'postponed').map(fixture => (
                <Card key={fixture.id} variant="elevated" className="border-gold/30 bg-gold/5">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/20 text-gold">
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {fixture.is_home ? (
                              <>
                                <span className="text-gold">{fixture.home_team}</span>
                                <span className="text-muted-foreground mx-2">vs</span>
                                {fixture.away_team}
                              </>
                            ) : (
                              <>
                                {fixture.home_team}
                                <span className="text-muted-foreground mx-2">vs</span>
                                <span className="text-gold">{fixture.away_team}</span>
                              </>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Awaiting new date from admin
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-gold/20 text-gold border-gold/30">
                        {fixture.is_home ? 'Home' : 'Away'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedGames.map(fixture => (
            <GameCard key={fixture.id} fixture={fixture} />
          ))}
          {completedGames.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No completed matches</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your match history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Forfeit Confirmation Dialog */}
      <Dialog open={showForfeitConfirm} onOpenChange={setShowForfeitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Forfeit</DialogTitle>
            <DialogDescription>
              Are you sure you want to forfeit this match? This will result in a 3-0 loss and a -3 point penalty for your team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForfeitConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmForfeit}>
              Forfeit Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CaptainFixtures;
