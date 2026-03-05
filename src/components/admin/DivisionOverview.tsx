import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Calendar, Clock, MapPin, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

interface PitchSlot {
    id: number;
    pitch_name: string;
    date: string;
    time_slot: string;
    is_booked: boolean;
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

    // Reschedule dialog state
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleFixture, setRescheduleFixture] = useState<Fixture | null>(null);
    const [pitchSlots, setPitchSlots] = useState<PitchSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [rescheduleLoading, setRescheduleLoading] = useState(false);

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

    const openRescheduleDialog = async (fixture: Fixture) => {
        setRescheduleFixture(fixture);
        setSelectedSlot('');
        setShowReschedule(true);

        // Fetch available pitch slots
        try {
            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 60 days ahead
            const res = await fetch(`/api/admin/pitches/availability-summary?start_date=${today}&end_date=${endDate}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                // Flatten the nested structure and add pitch_name
                const allSlots: PitchSlot[] = [];
                for (const pitch of data.pitches || []) {
                    for (const slot of pitch.slots || []) {
                        if (!slot.is_booked) {
                            allSlots.push({
                                id: slot.id,
                                pitch_name: pitch.name,
                                date: slot.date,
                                time_slot: slot.time_slot,
                                is_booked: slot.is_booked
                            });
                        }
                    }
                }
                setPitchSlots(allSlots);
            }
        } catch (e) {
            console.error('Failed to fetch pitch availability', e);
        }
    };

    const handleReschedule = async () => {
        if (!rescheduleFixture || !selectedSlot) {
            toast.error('Please select a date/time/pitch');
            return;
        }

        const slot = pitchSlots.find(s => `${s.id}` === selectedSlot);
        if (!slot) return;

        setRescheduleLoading(true);
        try {
            const res = await fetch(`/api/admin/fixtures/${rescheduleFixture.id}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    date: slot.date,
                    time_slot: slot.time_slot,
                    pitch: slot.pitch_name
                })
            });

            if (res.ok) {
                toast.success('Fixture rescheduled! Teams have been notified.');
                setShowReschedule(false);
                fetchOverview();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to reschedule');
            }
        } catch (e) {
            toast.error('Error rescheduling fixture');
        } finally {
            setRescheduleLoading(false);
        }
    };

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

            {/* Postponed Fixtures - Admin Can Reschedule */}
            {upcomingFixtures.filter(f => f.status === 'postponed').length > 0 && (
                <Card className="border-gold/30">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-gold" />
                            <CardTitle className="text-gold">Postponed - Needs Rescheduling</CardTitle>
                        </div>
                        <CardDescription>Click to reschedule these matches</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {upcomingFixtures.filter(f => f.status === 'postponed').map((fixture) => (
                                <div
                                    key={fixture.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-gold/10 border border-gold/30 cursor-pointer hover:bg-gold/20 transition-colors"
                                    onClick={() => openRescheduleDialog(fixture)}
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-base text-foreground">
                                            {fixture.home_team} vs {fixture.away_team}
                                        </div>
                                        <p className="text-sm text-gold mt-1">
                                            Click to reschedule this match
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold/20">
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Reschedule
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reschedule Dialog */}
            <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reschedule Match</DialogTitle>
                        <DialogDescription>
                            {rescheduleFixture && `${rescheduleFixture.home_team} vs ${rescheduleFixture.away_team}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select New Date, Time & Pitch</Label>
                            {pitchSlots.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No available slots. Please add pitch availability first.</p>
                            ) : (
                                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an available slot" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {pitchSlots.map((slot) => (
                                            <SelectItem key={slot.id} value={`${slot.id}`}>
                                                {format(parseISO(slot.date), 'EEE, MMM d')} - {slot.time_slot} @ {slot.pitch_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReschedule(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReschedule}
                            disabled={!selectedSlot || rescheduleLoading}
                            className="bg-gold text-black hover:bg-gold/80"
                        >
                            {rescheduleLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Confirm Reschedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DivisionOverview;
