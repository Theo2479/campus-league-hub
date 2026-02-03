import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Calendar, Clock, MapPin, UserCheck, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Standing {
    position: number;
    id: number;
    name: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
}

interface Fixture {
    id: number;
    home_team: string;
    away_team: string;
    date: string;
    time: string;
    venue: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    referee: string | null;
    has_referee?: boolean;
}

interface DivisionOverviewProps {
    divisionId: string;
    divisionName: string;
}

const DivisionOverview = ({ divisionId, divisionName }: DivisionOverviewProps) => {
    const [loading, setLoading] = useState(true);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [upcomingFixtures, setUpcomingFixtures] = useState<Fixture[]>([]);
    const [pastFixtures, setPastFixtures] = useState<Fixture[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchOverview = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/divisions/${divisionId}/overview`, {
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setStandings(data.standings || []);
                setUpcomingFixtures(data.upcoming_fixtures || []);
                setPastFixtures(data.past_fixtures || []);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch division overview:', error);
        } finally {
            setLoading(false);
        }
    }, [divisionId]);

    // Initial load
    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchOverview, 30000);
        return () => clearInterval(interval);
    }, [fetchOverview]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Last Updated Indicator */}
            {lastUpdated && (
                <div className="text-xs text-muted-foreground text-right">
                    Last updated: {format(lastUpdated, 'HH:mm:ss')} (auto-refreshes every 30s)
                </div>
            )}

            {/* League Table / Standings */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-gold" />
                        <CardTitle>League Table</CardTitle>
                    </div>
                    <CardDescription>{divisionName} Standings</CardDescription>
                </CardHeader>
                <CardContent>
                    {standings.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No teams in this division yet</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">Pos</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="text-center w-10">P</TableHead>
                                    <TableHead className="text-center w-10">W</TableHead>
                                    <TableHead className="text-center w-10">D</TableHead>
                                    <TableHead className="text-center w-10">L</TableHead>
                                    <TableHead className="text-center w-12">GF</TableHead>
                                    <TableHead className="text-center w-12">GA</TableHead>
                                    <TableHead className="text-center w-12">GD</TableHead>
                                    <TableHead className="text-center w-12 font-bold">Pts</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {standings.map((team) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">
                                            {team.position}
                                            {team.position === 1 && <span className="ml-1">🥇</span>}
                                            {team.position === 2 && <span className="ml-1">🥈</span>}
                                            {team.position === 3 && <span className="ml-1">🥉</span>}
                                        </TableCell>
                                        <TableCell className="font-semibold">{team.name}</TableCell>
                                        <TableCell className="text-center">{team.played}</TableCell>
                                        <TableCell className="text-center">{team.won}</TableCell>
                                        <TableCell className="text-center">{team.drawn}</TableCell>
                                        <TableCell className="text-center">{team.lost}</TableCell>
                                        <TableCell className="text-center">{team.goals_for}</TableCell>
                                        <TableCell className="text-center">{team.goals_against}</TableCell>
                                        <TableCell className={`text-center ${team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-500' : ''}`}>
                                            {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-lg text-primary">
                                            {team.points}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Fixtures */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gold" />
                        <CardTitle>Upcoming Fixtures</CardTitle>
                    </div>
                    <CardDescription>{upcomingFixtures.length} upcoming match(es)</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingFixtures.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No upcoming fixtures scheduled</p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingFixtures.map((fixture) => (
                                <div
                                    key={fixture.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-base">
                                            {fixture.home_team} vs {fixture.away_team}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(parseISO(fixture.date), 'EEE, MMM d, yyyy')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {fixture.time}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {fixture.venue || 'TBC'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {fixture.referee ? (
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <UserCheck className="h-3 w-3" />
                                                {fixture.referee}
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                No Ref
                                            </Badge>
                                        )}
                                        <Badge variant="outline">{fixture.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Past Results */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <CardTitle>Past Results</CardTitle>
                    </div>
                    <CardDescription>{pastFixtures.length} completed match(es)</CardDescription>
                </CardHeader>
                <CardContent>
                    {pastFixtures.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No past results</p>
                    ) : (
                        <div className="space-y-3">
                            {pastFixtures.map((fixture) => (
                                <div
                                    key={fixture.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-base">
                                            {fixture.home_team}{' '}
                                            <span className="text-primary font-bold">
                                                {fixture.home_score ?? '-'}
                                            </span>
                                            {' - '}
                                            <span className="text-primary font-bold">
                                                {fixture.away_score ?? '-'}
                                            </span>
                                            {' '}{fixture.away_team}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(parseISO(fixture.date), 'EEE, MMM d, yyyy')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {fixture.venue || 'TBC'}
                                            </span>
                                            {fixture.referee && (
                                                <span className="flex items-center gap-1">
                                                    <UserCheck className="h-3 w-3" />
                                                    {fixture.referee}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            fixture.status === 'completed'
                                                ? 'bg-green-600'
                                                : fixture.status === 'cancelled'
                                                    ? 'bg-red-500'
                                                    : ''
                                        }
                                    >
                                        {fixture.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DivisionOverview;
