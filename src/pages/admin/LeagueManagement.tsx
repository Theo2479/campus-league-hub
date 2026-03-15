import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Interfaces
interface Team {
  id: string;
  name: string;
  divisionId?: string;
}

interface Division {
  id: string;
  name: string;
  leagueId: string;
  teams: string[]; // Team IDs
}

interface League {
  id: string;
  name: string;
  day: string;
  divisions: Division[];
}

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  time: string;
  venue: string;
  matchweek?: number;
}
import { Plus, Calendar, Users, Trophy, Trash2, Wand2, ChevronDown, ChevronRight, Loader2, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import DivisionOverview from '@/components/admin/DivisionOverview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/api';

const LeagueManagement = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [generatedGames, setGeneratedGames] = useState<Game[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dialog states
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);
  const [isDivisionDialogOpen, setIsDivisionDialogOpen] = useState(false);
  const [isTeamAssignDialogOpen, setIsTeamAssignDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGamesDialogOpen, setIsGamesDialogOpen] = useState(false);

  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'league' | 'division' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDay, setNewLeagueDay] = useState('Monday');

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');

  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Generation State
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateLeagueId, setGenerateLeagueId] = useState<string | null>(null);

  // Games dialog state
  const [viewingDivisionGames, setViewingDivisionGames] = useState<{
    divisionId: string;
    divisionName: string;
    games: any[];
  } | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);

  const [expandedLeagues, setExpandedLeagues] = useState<string[]>([]);

  const toggleLeagueExpanded = (leagueId: string) => {
    setExpandedLeagues(prev =>
      prev.includes(leagueId)
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  // Fetch leagues on mount
  useEffect(() => {
    fetchLeagues();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await apiFetch('/api/admin/teams');
      if (res.ok) {
        const data = await res.json();
        const teams = data.teams.map((t: any) => ({
          ...t,
          id: t.id.toString(),
          divisionId: t.division_id ? t.division_id.toString() : null
        }));
        setAvailableTeams(teams);
      }
    } catch (e) {
      console.error("Failed to fetch teams");
      toast.error("Failed to load teams");
    }
  };

  const fetchLeagues = async () => {
    try {
      const res = await apiFetch('/api/admin/leagues');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.leagues.map((l: any) => ({
          id: l.id.toString(),
          name: l.name,
          day: l.default_day || 'Wednesday',
          divisions: l.divisions.map((d: any) => ({
            id: d.id.toString(),
            name: d.name,
            leagueId: l.id.toString(),
            teams: d.teams // IDs
          }))
        }));
        setLeagues(mapped);
        // Default expand first league
        if (mapped.length > 0 && expandedLeagues.length === 0) {
          setExpandedLeagues([mapped[0].id]);
        }
      }
    } catch (e) {
      toast.error("Failed to load leagues");
    }
  };

  const handleCreateLeague = async () => {
    if (!newLeagueName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const res = await apiFetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeagueName,
          day: newLeagueDay
        })

      });

      if (res.ok) {
        toast.success(`${newLeagueName} created`);
        setNewLeagueName('');
        setIsLeagueDialogOpen(false);
        fetchLeagues();
      } else {
        toast.error("Failed to create league");
      }
    } catch (e) {
      toast.error("Error creating league");
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, type: 'league' | 'division', targetId: string, leagueId?: string) => {
    e.stopPropagation();
    setDeleteType(type);
    setDeleteTargetId(targetId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !deleteType) return;

    try {
      let url = '';
      if (deleteType === 'league') {
        url = `/api/admin/leagues/${deleteTargetId}`;
      } else {
        url = `/api/admin/divisions/${deleteTargetId}`;
      }

      const res = await apiFetch(url, { method: 'DELETE' });

      if (res.ok) {
        toast.success(`${deleteType === 'league' ? 'League' : 'Division'} deleted`);
        fetchLeagues();
        fetchTeams();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to delete ${deleteType}`);
      }
    } catch (e) {
      toast.error(`Error deleting ${deleteType}`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteType(null);
      setDeleteTargetId(null);
    }
  };

  const openAddDivision = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    setNewDivisionName('');
    setIsDivisionDialogOpen(true);
  };

  const handleCreateDivision = async () => {
    if (!newDivisionName || !selectedLeagueId) {
      toast.error('Please enter a division name');
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/leagues/${selectedLeagueId}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDivisionName })

      });

      if (res.ok) {
        toast.success(`${newDivisionName} created`);
        setIsDivisionDialogOpen(false);
        fetchLeagues();
      } else {
        toast.error("Failed to create division");
      }
    } catch (e) {
      toast.error("Error creating division");
    }
  };

  const openAssignTeams = (division: Division) => {
    setSelectedDivision(division);
    setSelectedTeamIds(division.teams);
    setIsTeamAssignDialogOpen(true);
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSaveTeamAssignment = async () => {
    if (!selectedDivision) return;

    try {
      const res = await apiFetch(`/api/admin/divisions/${selectedDivision.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIdentifiers: selectedTeamIds })

      });

      if (res.ok) {
        toast.success('Teams assigned successfully');
        setIsTeamAssignDialogOpen(false);
        fetchLeagues();
        fetchTeams();
      } else {
        toast.error("Failed to assign teams");
      }
    } catch (e) {
      toast.error("Error assigning teams");
    }
  };

  const getTeamName = (teamId: string) => {
    return availableTeams.find(t => t.id === teamId)?.name || teamId;
  };

  const getTeamDivisionLabel = (teamId: string): string | null => {
    for (const league of leagues) {
      for (const div of league.divisions) {
        if (div.id !== selectedDivision?.id && div.teams.includes(teamId)) {
          return `${league.name} — ${div.name}`;
        }
      }
    }
    return null;
  };

  const openGenerateFixtures = (leagueId: string) => {
    setGenerateLeagueId(leagueId);
    setGenerateStartDate('');
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateFixtures = async () => {
    if (!generateStartDate || !generateLeagueId) {
      toast.error('Please select a start date');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiFetch(`/api/leagues/${generateLeagueId}/generate-fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: generateStartDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate fixtures');
      }

      const data = await response.json();
      toast.success(data.message);

      // Update UI with generated games if needed, or just notify logic
      if (data.fixtures) {
        setGeneratedGames(data.fixtures.map((f: any) => ({
          id: f.id,
          homeTeam: f.home_team,
          awayTeam: f.away_team,
          date: new Date(f.date),
          time: f.time,
          venue: f.venue,
          matchweek: 1
        })));
      }
      setIsGenerateDialogOpen(false);

    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate fixtures');
    } finally {
      setIsGenerating(false);
    }
  };

  const openViewOverview = (divisionId: string, divisionName: string) => {
    setViewingDivisionGames({ divisionId, divisionName, games: [] });
    setIsGamesDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="League & Division Management"
        description="Organize teams into leagues and divisions, then generate fixtures"
      />

      <div className="space-y-6">
        <div className="flex gap-3">
          <Button variant="gold" onClick={() => setIsLeagueDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create League
          </Button>
        </div>

        <div className="space-y-4">
          {leagues.map(league => (
            <Card key={league.id} variant="elevated">
              <Collapsible
                open={expandedLeagues.includes(league.id)}
                onOpenChange={() => toggleLeagueExpanded(league.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                        {expandedLeagues.includes(league.id)
                          ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        }
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-gold" />
                            {league.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {league.day}s • {league.divisions.length} division(s)
                          </CardDescription>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGenerateFixtures(league.id);
                        }}
                      >
                        <Wand2 className="h-4 w-4 mr-1" />
                        Generate Fixtures
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddDivision(league.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Division
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => openDeleteDialog(e, 'league', league.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {league.divisions.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No divisions yet. Add a division to get started.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {league.divisions.map(division => (
                          <Card key={division.id} className="bg-muted/30">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gold" />
                                  {division.name}
                                </CardTitle>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => openDeleteDialog(e, 'division', division.id, league.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <CardDescription>
                                {division.teams.length} team(s)
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex flex-wrap gap-1">
                                {division.teams.length === 0 ? (
                                  <span className="text-sm text-muted-foreground">No teams assigned</span>
                                ) : (
                                  division.teams.map(teamId => (
                                    <Badge key={teamId} variant="secondary" className="text-xs">
                                      {getTeamName(teamId)}
                                    </Badge>
                                  ))
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAssignTeams(division)}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Teams
                                </Button>
                                <Button
                                  variant="gold"
                                  size="sm"
                                  onClick={() => openViewOverview(division.id, division.name)}
                                >
                                  <LayoutDashboard className="h-3 w-3 mr-1" />
                                  Overview
                                </Button>
                                {/* Removed individual Generate button */}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {generatedGames.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gold" />
                    Generated Fixtures (Preview)
                  </CardTitle>
                  <CardDescription>{generatedGames.length} games scheduled across league</CardDescription>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setGeneratedGames([])}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {generatedGames.map(game => (
                  <div key={game.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{game.homeTeam} vs {game.awayTeam}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(game.date).toLocaleDateString()} at {game.time} • {game.venue}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      <Dialog open={isLeagueDialogOpen} onOpenChange={setIsLeagueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New League</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>League Name</Label>
              <Input
                placeholder="e.g., Wednesday League"
                value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Match Day</Label>
              <Select value={newLeagueDay} onValueChange={setNewLeagueDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeagueDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreateLeague}>Create League</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDivisionDialogOpen} onOpenChange={setIsDivisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Division</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Division Name</Label>
              <Input value={newDivisionName} onChange={e => setNewDivisionName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDivisionDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreateDivision}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamAssignDialogOpen} onOpenChange={setIsTeamAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teams</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto py-4">
            <div className="space-y-2">
              {availableTeams.map(team => {
                const otherDivision = getTeamDivisionLabel(team.id);
                return (
                  <div key={team.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={team.id}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                    />
                    <label htmlFor={team.id} className="flex-1 text-sm font-medium cursor-pointer">
                      {team.name}
                      {otherDivision && (
                        <span className="text-xs text-muted-foreground ml-2">({otherDivision})</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamAssignDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleSaveTeamAssignment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate League Fixtures</DialogTitle>
            <DialogDescription>
              This will generate round-robin fixtures for ALL divisions in this league, optimizing pitch usage to avoid clashes.
              Existing future fixtures will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={generateStartDate}
                onChange={e => setGenerateStartDate(e.target.value)}
              />
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-yellow-600 text-sm">
              <strong>Note:</strong> Fixtures will be assigned to available pitch slots randomly to ensure fairness across divisions.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleGenerateFixtures} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generate All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Division Overview Dialog */}
      <Dialog open={isGamesDialogOpen} onOpenChange={setIsGamesDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Division Overview: {viewingDivisionGames?.divisionName}</DialogTitle>
          </DialogHeader>
          {viewingDivisionGames && (
            <DivisionOverview
              divisionId={viewingDivisionGames.divisionId}
              divisionName={viewingDivisionGames.divisionName}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {deleteType} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default LeagueManagement;
