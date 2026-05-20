import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Target, Calendar, Clock, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import type { Fixture, TeamData, StandingsRow, AvailableDivision } from '@/types/api';

const CaptainDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [upcomingFixtures, setUpcomingFixtures] = useState<Fixture[]>([]);
  const [pastFixtures, setPastFixtures] = useState<Fixture[]>([]);
  const [position, setPosition] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [divisionName, setDivisionName] = useState<string | null>(null);
  const [availableDivisions, setAvailableDivisions] = useState<AvailableDivision[]>([]);
  const [globalDivId, setGlobalDivId] = useState<string>('all');
  const [recentDivId, setRecentDivId] = useState<string>('all');
  const [standingsDivId, setStandingsDivId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Forfeit confirmation state
  const [forfeitFixtureId, setForfeitFixtureId] = useState<number | null>(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team data
        const teamRes = await apiFetch('/api/captain/team');
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeam(teamData.team);
        }

        // Fetch fixtures
        const fixturesRes = await apiFetch('/api/captain/fixtures');
        if (fixturesRes.ok) {
          const fixturesData = await fixturesRes.json();
          setUpcomingFixtures(fixturesData.upcoming || []);
          setPastFixtures(fixturesData.past || []);
        }

        const standingsRes = await apiFetch('/api/captain/standings');
        if (standingsRes.ok) {
          const standingsData = await standingsRes.json();
          setPosition(standingsData.team_position);
          setStandings(standingsData.standings || []);
          setDivisionName(standingsData.division?.name || null);
          if (standingsData.available_divisions) {
            setAvailableDivisions(standingsData.available_divisions);
            if (standingsData.division) {
              setStandingsDivId(standingsData.division.id.toString());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!standingsDivId || availableDivisions.length === 0) return;
    
    // Check if we just loaded it initially to prevent double fetching
    const division = availableDivisions.find(d => d.id.toString() === standingsDivId);
    if (division?.name === divisionName) return;

    const fetchStandings = async () => {
      try {
        const standingsRes = await apiFetch(`/api/captain/standings?division_id=${standingsDivId}`);
        if (standingsRes.ok) {
          const standingsData = await standingsRes.json();
          setPosition(standingsData.team_position);
          setStandings(standingsData.standings || []);
          setDivisionName(standingsData.division?.name || null);
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
      }
    };
    fetchStandings();
  }, [standingsDivId, availableDivisions, divisionName]);

  const getMatchLabel = (game: { tournament_id?: number | null; round_name?: string | null }) =>
    game.tournament_id ? (game.round_name ?? 'Tournament Match') : 'League Match';

  const refetchData = async () => {
    try {
      const teamRes = await apiFetch('/api/captain/team');
      if (teamRes.ok) { setTeam((await teamRes.json()).team); }
      const fixturesRes = await apiFetch('/api/captain/fixtures');
      if (fixturesRes.ok) {
        const d = await fixturesRes.json();
        setUpcomingFixtures(d.upcoming || []);
        setPastFixtures(d.past || []);
      }
      const standingsRes = await apiFetch(`/api/captain/standings${standingsDivId ? `?division_id=${standingsDivId}` : ''}`);
      if (standingsRes.ok) { setPosition((await standingsRes.json()).team_position); }
    } catch (e) {
      toast.error('Failed to refresh data');
    }
  };

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

  const handlePostpone = async (fixtureId: number) => {
    setActionLoading(fixtureId);
    try {
      const res = await apiFetch(`/api/captain/fixtures/${fixtureId}/postpone`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Postponement request submitted for review');
        await refetchData();
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch (e) {
      toast.error('Network error — could not submit request');
    } finally {
      setActionLoading(null);
    }
  };

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
        await refetchData();
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </DashboardLayout>
    );
  }

  if (!team) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Team Dashboard"
          description="No team assigned"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">You haven't been assigned to a team yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Please contact the admin to be assigned to a team.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const displayStats = globalDivId === 'all' ? team.stats : (team.division_stats?.find(d => d.division_id.toString() === globalDivId) || team.stats);
  const displayPosition = globalDivId === 'all' ? '-' : (team.division_stats?.find(d => d.division_id.toString() === globalDivId)?.position || '-');
  
  const filteredPast = recentDivId === 'all' ? pastFixtures : pastFixtures.filter(f => f.division_id?.toString() === recentDivId);
  const recentFormStats = recentDivId === 'all' ? team.stats : (team.division_stats?.find(d => d.division_id.toString() === recentDivId) || team.stats);

  const recentResults = filteredPast.slice(0, 3);
  const nextGames = upcomingFixtures.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="Team Dashboard"
          description={`Managing ${team.name}${team.division_name ? ` • ${team.division_name}` : ''}`}
        />
        {availableDivisions.length > 0 && (
          <div className="w-64 shrink-0">
            <Select value={globalDivId} onValueChange={setGlobalDivId}>
              <SelectTrigger>
                <SelectValue placeholder="Global Aggregates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Global Aggregates</SelectItem>
                {availableDivisions.map(div => (
                  <SelectItem key={div.id} value={div.id.toString()}>
                    {div.league_name ? `${div.league_name} - ${div.name}` : div.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard
          label="League Position"
          value={displayPosition !== '-' ? `#${displayPosition}` : '-'}
          icon={<Trophy className="h-6 w-6" />}
        />
        <StatCard
          label="Form"
          value={`${displayStats.won}W ${displayStats.drawn}D ${displayStats.lost}L`}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatCard
          label="Goals (F/A/GD)"
          value={`${displayStats.goals_for} / ${displayStats.goals_against} / ${displayStats.goal_difference >= 0 ? '+' : ''}${displayStats.goal_difference}`}
          icon={<Target className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Fixtures */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Upcoming Fixtures
            </CardTitle>
            <CardDescription>
              Manage your upcoming matches. Request postponement if more than 72h away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextGames.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming fixtures</p>
            ) : (
              nextGames.map(fixture => (
                <Card key={fixture.id} variant="default" className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
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
                            <p className="text-xs font-medium text-gold/80 uppercase tracking-wider mt-0.5">
                              {fixture.league_name ? `${fixture.league_name} • ` : ''}{getMatchLabel(fixture)}
                            </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(parseISO(fixture.date), 'EEEE, MMMM d')} at {fixture.time}
                          </p>
                          <p className="text-sm text-muted-foreground">{fixture.venue || 'TBC'}</p>
                          {fixture.referee && (
                            <p className="text-sm text-gold mt-1">Ref: {fixture.referee}</p>
                          )}
                        </div>
                        <Badge variant={fixture.is_home ? 'default' : 'secondary'}>
                          {fixture.is_home ? 'Home' : 'Away'}
                        </Badge>
                      </div>
                      <div className="flex justify-end">
                        {getActionButton(fixture)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            
            {upcomingFixtures.length > 3 && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/captain/fixtures">
                  View all {upcomingFixtures.length} upcoming fixtures <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                Recent Results
              </CardTitle>
              <CardDescription>
                Form: {`${recentFormStats.won}W ${recentFormStats.drawn}D ${recentFormStats.lost}L`}
              </CardDescription>
            </div>
            {availableDivisions.length > 0 && (
              <div className="w-48 shrink-0">
                <Select value={recentDivId} onValueChange={setRecentDivId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    {availableDivisions.map(div => (
                      <SelectItem key={div.id} value={div.id.toString()}>
                        {div.league_name ? `${div.league_name} - ${div.name}` : div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {recentResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No completed matches yet</p>
            ) : (
              recentResults.map(fixture => (
                <Card key={fixture.id} variant="default" className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {fixture.home_team} {fixture.home_score} - {fixture.away_score} {fixture.away_team}
                          {fixture.home_pens !== null && fixture.home_pens !== undefined && ` (${fixture.home_pens}-${fixture.away_pens} pens)`}
                        </p>
                        <p className="text-xs font-medium text-gold/80 uppercase tracking-wider mt-0.5">
                          {fixture.league_name ? `${fixture.league_name} • ` : ''}{getMatchLabel(fixture)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(parseISO(fixture.date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          fixture.result === 'win'
                            ? 'default'
                            : fixture.result === 'draw'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className={fixture.result === 'win' ? 'bg-success' : ''}
                      >
                        {fixture.result === 'win' ? 'Won' : fixture.result === 'draw' ? 'Draw' : 'Lost'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Division League Table */}
      {standingsDivId && (
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                League Table
              </CardTitle>
              <CardDescription>
                {divisionName ? `${divisionName} standings` : team.division_name ? `${team.division_name} standings` : 'Division standings'}
              </CardDescription>
            </div>
            {availableDivisions.length > 1 && (
              <div className="w-64 shrink-0">
                <Select value={standingsDivId} onValueChange={setStandingsDivId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map(div => (
                      <SelectItem key={div.id} value={div.id.toString()}>
                        {div.league_name ? `${div.league_name} - ${div.name}` : div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {standings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">D</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="text-center">GF</TableHead>
                    <TableHead className="text-center">GA</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="text-center font-bold">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map(row => (
                    <TableRow
                      key={row.id}
                      className={row.is_my_team ? 'bg-gold/10 border-l-2 border-l-gold font-semibold' : ''}
                    >
                      <TableCell className="font-medium">
                        {row.position}
                        {row.position === 1 && <span className="ml-1 text-lg">🥇</span>}
                        {row.position === 2 && <span className="ml-1 text-lg">🥈</span>}
                        {row.position === 3 && <span className="ml-1 text-lg">🥉</span>}
                      </TableCell>
                      <TableCell className={row.is_my_team ? 'text-gold font-bold' : 'font-medium'}>
                        {row.name}
                      </TableCell>
                      <TableCell className="text-center">{row.played}</TableCell>
                      <TableCell className="text-center">{row.won}</TableCell>
                      <TableCell className="text-center">{row.drawn}</TableCell>
                      <TableCell className="text-center">{row.lost}</TableCell>
                      <TableCell className="text-center">{row.goals_for}</TableCell>
                      <TableCell className="text-center">{row.goals_against}</TableCell>
                      <TableCell className="text-center">{row.goal_difference >= 0 ? `+${row.goal_difference}` : row.goal_difference}</TableCell>
                      <TableCell className="text-center font-bold text-lg text-primary">{row.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gold mb-2">
                    {position ? `#${position}` : '-'}
                  </div>
                  <p className="text-muted-foreground">No division standings available yet test </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>

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

export default CaptainDashboard;
