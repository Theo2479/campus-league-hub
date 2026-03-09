import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Wand2, Trash2, ChevronDown, ChevronRight, Loader2, Swords, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { apiFetch } from '@/lib/api';

interface TeamOption { id: string; name: string; }

interface TournamentFixture {
    id: number;
    home_team: string;
    away_team: string;
    home_team_id: number;
    away_team_id: number;
    date: string;
    time: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    round_name: string;
    match_order: number;
}

interface TournamentData {
    id: number;
    name: string;
    format: string;
    status: string;
    teams: TeamOption[];
    fixtures: TournamentFixture[];
    rounds: Record<string, TournamentFixture[]>;
}

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];

const KnockoutTournament = () => {
    const [tournaments, setTournaments] = useState<TournamentData[]>([]);
    const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number[]>([]);

    // Create dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');

    // Team assignment dialog
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    // Generate dialog
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [generateTournamentId, setGenerateTournamentId] = useState<number | null>(null);
    const [generateDate, setGenerateDate] = useState('');
    const [byeTeamIds, setByeTeamIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Advance dialog
    const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
    const [advanceTournamentId, setAdvanceTournamentId] = useState<number | null>(null);
    const [advanceNextRound, setAdvanceNextRound] = useState('');
    const [advanceDate, setAdvanceDate] = useState('');
    const [advanceByeTeamIds, setAdvanceByeTeamIds] = useState<string[]>([]);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const fetchTournaments = async () => {
        try {
            const res = await apiFetch('/api/admin/tournaments');
            if (res.ok) {
                const data = await res.json();
                setTournaments(data.tournaments);
                if (data.tournaments.length > 0 && expanded.length === 0) {
                    setExpanded([data.tournaments[0].id]);
                }
            }
        } catch (e) {
            toast.error('Failed to load tournaments');
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await apiFetch('/api/admin/teams');
            if (res.ok) {
                const data = await res.json();
                setAvailableTeams(data.teams.map((t: any) => ({ id: t.id.toString(), name: t.name })));
            }
        } catch (e) { /* silent */ }
    };

    useEffect(() => {
        Promise.all([fetchTournaments(), fetchTeams()]).then(() => setLoading(false));
    }, []);

    const toggleExpanded = (id: number) => {
        setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Handlers ──────────────────────────────────────────────

    const handleCreate = async () => {
        if (!newName.trim()) { toast.error('Enter a tournament name'); return; }
        try {
            const res = await apiFetch('/api/admin/tournaments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (res.ok) {
                toast.success('Tournament created');
                setNewName('');
                setIsCreateOpen(false);
                fetchTournaments();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Failed to create tournament');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const openTeamAssign = (t: TournamentData) => {
        setSelectedTournamentId(t.id);
        setSelectedTeamIds(t.teams.map(tm => tm.id));
        setIsTeamDialogOpen(true);
    };

    const handleSaveTeams = async () => {
        if (!selectedTournamentId) return;
        try {
            const res = await apiFetch(`/api/admin/tournaments/${selectedTournamentId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamIds: selectedTeamIds })
            });
            if (res.ok) {
                toast.success('Teams assigned');
                setIsTeamDialogOpen(false);
                fetchTournaments();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Failed to assign teams');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const openGenerate = (t: TournamentData) => {
        setGenerateTournamentId(t.id);
        setGenerateDate('');
        setByeTeamIds([]);
        setIsGenerateOpen(true);
    };

    const handleGenerate = async () => {
        if (!generateDate || !generateTournamentId) { toast.error('Select a start date'); return; }
        setIsGenerating(true);
        try {
            const res = await apiFetch(`/api/admin/tournaments/${generateTournamentId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: generateDate, byeTeamIds })
            });
            const d = await res.json();
            if (res.ok) {
                toast.success(d.message);
                setIsGenerateOpen(false);
                fetchTournaments();
            } else {
                toast.error(d.error || 'Generation failed');
            }
        } catch (e) { toast.error('Network error'); } finally { setIsGenerating(false); }
    };

    const openAdvance = (t: TournamentData) => {
        setAdvanceTournamentId(t.id);
        // Determine next round
        const existingRounds = Object.keys(t.rounds);
        const lastIdx = Math.max(...existingRounds.map(r => ROUND_ORDER.indexOf(r)), -1);
        const nextRound = ROUND_ORDER[lastIdx + 1] || 'Final';
        setAdvanceNextRound(nextRound);
        setAdvanceDate('');
        setAdvanceByeTeamIds([]);
        setIsAdvanceOpen(true);
    };

    const handleAdvance = async () => {
        if (!advanceDate || !advanceTournamentId) { toast.error('Select a date'); return; }
        try {
            const res = await apiFetch(`/api/admin/tournaments/${advanceTournamentId}/advance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nextRound: advanceNextRound, date: advanceDate,
                    byeTeamIds: advanceByeTeamIds
                })
            });
            const d = await res.json();
            if (res.ok) {
                toast.success(d.message);
                setIsAdvanceOpen(false);
                fetchTournaments();
            } else {
                toast.error(d.error || 'Failed to advance');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;
        try {
            const res = await apiFetch(`/api/admin/tournaments/${deleteTargetId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Tournament deleted');
                fetchTournaments();
            } else { toast.error('Failed to delete'); }
        } catch (e) { toast.error('Network error'); }
        finally { setDeleteDialogOpen(false); setDeleteTargetId(null); }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'setup': return <Badge variant="secondary">Setup</Badge>;
            case 'in_progress': return <Badge className="bg-gold text-navy">In Progress</Badge>;
            case 'completed': return <Badge className="bg-success">Completed</Badge>;
            default: return null;
        }
    };

    const getGenerateTeams = () => {
        const t = tournaments.find(x => x.id === generateTournamentId);
        return t?.teams || [];
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

    return (
        <DashboardLayout>
            <PageHeader
                title="Knockout Tournaments"
                description="Create and manage single-elimination knockout tournaments"
            />

            <div className="space-y-6">
                <div className="flex gap-3">
                    <Button variant="gold" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tournament
                    </Button>
                </div>

                {tournaments.length === 0 && (
                    <Card variant="elevated">
                        <CardContent className="py-12 text-center">
                            <Swords className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No tournaments yet. Create one to get started.</p>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    {tournaments.map(t => (
                        <Card key={t.id} variant="elevated">
                            <Collapsible open={expanded.includes(t.id)} onOpenChange={() => toggleExpanded(t.id)}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                                                {expanded.includes(t.id) ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Swords className="h-5 w-5 text-gold" />
                                                        {t.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {t.teams.length} teams • {t.fixtures.length} matches • {getStatusBadge(t.status)}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>
                                        <div className="flex items-center gap-2">
                                            {t.status === 'setup' && (
                                                <Button variant="gold" size="sm" onClick={() => openGenerate(t)} disabled={t.teams.length < 2}>
                                                    <Wand2 className="h-4 w-4 mr-1" /> Generate Bracket
                                                </Button>
                                            )}
                                            {t.status === 'in_progress' && (
                                                <Button variant="gold" size="sm" onClick={() => openAdvance(t)}>
                                                    <ArrowRight className="h-4 w-4 mr-1" /> Advance Round
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => openTeamAssign(t)}>
                                                <Users className="h-4 w-4 mr-1" /> Teams
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => { setDeleteTargetId(t.id); setDeleteDialogOpen(true); }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CollapsibleContent>
                                    <CardContent className="pt-0">
                                        {/* Teams */}
                                        {t.teams.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-muted-foreground mb-2">Participating Teams</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {t.teams.map(tm => (
                                                        <Badge key={tm.id} variant="secondary" className="text-xs">{tm.name}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bracket / Rounds */}
                                        {Object.keys(t.rounds).length > 0 ? (
                                            <div className="space-y-6">
                                                {ROUND_ORDER.filter(r => t.rounds[r]).map(roundName => (
                                                    <div key={roundName}>
                                                        <h4 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
                                                            <Trophy className="h-4 w-4" />
                                                            {roundName}
                                                        </h4>
                                                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                            {t.rounds[roundName].map(fixture => (
                                                                <Card key={fixture.id} className={`bg-muted/30 ${fixture.status === 'completed' ? 'border-success/30' : ''}`}>
                                                                    <CardContent className="p-4">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-xs text-muted-foreground">Match {fixture.match_order}</span>
                                                                            <Badge variant={fixture.status === 'completed' ? 'default' : 'secondary'} className={fixture.status === 'completed' ? 'bg-success' : ''}>
                                                                                {fixture.status === 'completed' ? 'Played' : 'Scheduled'}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="text-center flex-1">
                                                                                <p className="font-semibold text-sm">{fixture.home_team}</p>
                                                                                {fixture.status === 'completed' && (
                                                                                    <p className={`text-2xl font-bold mt-1 ${(fixture.home_score ?? 0) > (fixture.away_score ?? 0) ? 'text-gold' : 'text-muted-foreground'}`}>
                                                                                        {fixture.home_score}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-muted-foreground font-bold mx-3">vs</span>
                                                                            <div className="text-center flex-1">
                                                                                <p className="font-semibold text-sm">{fixture.away_team}</p>
                                                                                {fixture.status === 'completed' && (
                                                                                    <p className={`text-2xl font-bold mt-1 ${(fixture.away_score ?? 0) > (fixture.home_score ?? 0) ? 'text-gold' : 'text-muted-foreground'}`}>
                                                                                        {fixture.away_score}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                {t.teams.length < 2
                                                    ? 'Assign at least 2 teams to generate a bracket.'
                                                    : 'No bracket generated yet. Click "Generate Bracket" to start.'}
                                            </p>
                                        )}
                                    </CardContent>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Knockout Tournament</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Tournament Name</Label>
                            <Input placeholder="e.g., Spring Cup 2026" value={newName} onChange={e => setNewName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button variant="gold" onClick={handleCreate}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Team Assignment Dialog */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Teams</DialogTitle>
                        <DialogDescription>Select teams to participate in this tournament</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto py-4">
                        <div className="space-y-2">
                            {availableTeams.map(team => (
                                <div key={team.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                                    <Checkbox
                                        id={`t-${team.id}`}
                                        checked={selectedTeamIds.includes(team.id)}
                                        onCheckedChange={() =>
                                            setSelectedTeamIds(prev => prev.includes(team.id) ? prev.filter(x => x !== team.id) : [...prev, team.id])
                                        }
                                    />
                                    <label htmlFor={`t-${team.id}`} className="flex-1 text-sm font-medium cursor-pointer">{team.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancel</Button>
                        <Button variant="gold" onClick={handleSaveTeams}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Bracket Dialog */}
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Generate Knockout Bracket</DialogTitle>
                        <DialogDescription>
                            Set the start date and optionally select teams to receive a first-round bye.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={generateDate} onChange={e => setGenerateDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>First-Round Byes (optional)</Label>
                            <p className="text-xs text-muted-foreground">These teams skip Round 1 and advance directly to the next round.</p>
                            <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                                {getGenerateTeams().map(team => (
                                    <div key={team.id} className="flex items-center space-x-3 p-1.5 rounded hover:bg-muted/50">
                                        <Checkbox
                                            id={`bye-${team.id}`}
                                            checked={byeTeamIds.includes(team.id)}
                                            onCheckedChange={() =>
                                                setByeTeamIds(prev => prev.includes(team.id) ? prev.filter(x => x !== team.id) : [...prev, team.id])
                                            }
                                        />
                                        <label htmlFor={`bye-${team.id}`} className="flex-1 text-sm cursor-pointer">{team.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {byeTeamIds.length > 0 && (
                            <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-yellow-600 text-sm">
                                <strong>{byeTeamIds.length} bye(s):</strong> {byeTeamIds.map(id => getGenerateTeams().find(t => t.id === id)?.name).join(', ')} will skip Round 1.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                        <Button variant="gold" onClick={handleGenerate} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Advance Round Dialog */}
            <Dialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Advance to Next Round</DialogTitle>
                        <DialogDescription>Winners from completed matches will be paired for the next round.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Next Round</Label>
                            <Select value={advanceNextRound} onValueChange={setAdvanceNextRound}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROUND_ORDER.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={advanceDate} onChange={e => setAdvanceDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdvanceOpen(false)}>Cancel</Button>
                        <Button variant="gold" onClick={handleAdvance}>
                            <ArrowRight className="h-4 w-4 mr-2" /> Advance
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tournament and all its fixtures.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default KnockoutTournament;
