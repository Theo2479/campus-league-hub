import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockTeams, mockLeagues, mockVenues, League, Division, Team, Game, generateRoundRobinFixtures } from '@/data/mockData';
import { Plus, Calendar, Users, Trophy, Trash2, Wand2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

const LeagueManagement = () => {
  const [leagues, setLeagues] = useState<League[]>(mockLeagues);
  const [availableTeams] = useState<Team[]>(mockTeams);
  const [generatedGames, setGeneratedGames] = useState<Game[]>([]);
  
  // Dialog states
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);
  const [isDivisionDialogOpen, setIsDivisionDialogOpen] = useState(false);
  const [isTeamAssignDialogOpen, setIsTeamAssignDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  
  // Form states
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDay, setNewLeagueDay] = useState<'Wednesday' | 'Saturday' | 'Sunday'>('Wednesday');
  const [newLeagueTime, setNewLeagueTime] = useState('18:00');
  const [newLeagueVenue, setNewLeagueVenue] = useState('');
  
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');
  
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateDivisionId, setGenerateDivisionId] = useState<string | null>(null);
  
  const [expandedLeagues, setExpandedLeagues] = useState<string[]>(leagues.map(l => l.id));

  const getDayNumber = (day: 'Wednesday' | 'Saturday' | 'Sunday'): number => {
    switch (day) {
      case 'Wednesday': return 3;
      case 'Saturday': return 6;
      case 'Sunday': return 0;
    }
  };

  const toggleLeagueExpanded = (leagueId: string) => {
    setExpandedLeagues(prev => 
      prev.includes(leagueId) 
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  const handleCreateLeague = () => {
    if (!newLeagueName || !newLeagueVenue) {
      toast.error('Please fill in all fields');
      return;
    }

    const newLeague: League = {
      id: `league-${Date.now()}`,
      name: newLeagueName,
      day: newLeagueDay,
      defaultTime: newLeagueTime,
      defaultVenue: newLeagueVenue,
      divisions: [],
    };

    setLeagues(prev => [...prev, newLeague]);
    setExpandedLeagues(prev => [...prev, newLeague.id]);
    setIsLeagueDialogOpen(false);
    setNewLeagueName('');
    setNewLeagueVenue('');
    toast.success(`${newLeagueName} created successfully`);
  };

  const handleDeleteLeague = (leagueId: string) => {
    setLeagues(prev => prev.filter(l => l.id !== leagueId));
    toast.success('League deleted');
  };

  const openAddDivision = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    setNewDivisionName('');
    setIsDivisionDialogOpen(true);
  };

  const handleCreateDivision = () => {
    if (!newDivisionName || !selectedLeagueId) {
      toast.error('Please enter a division name');
      return;
    }

    const newDivision: Division = {
      id: `div-${Date.now()}`,
      name: newDivisionName,
      leagueId: selectedLeagueId,
      teams: [],
    };

    setLeagues(prev => prev.map(l => 
      l.id === selectedLeagueId 
        ? { ...l, divisions: [...l.divisions, newDivision] }
        : l
    ));
    setIsDivisionDialogOpen(false);
    toast.success(`${newDivisionName} created`);
  };

  const handleDeleteDivision = (leagueId: string, divisionId: string) => {
    setLeagues(prev => prev.map(l => 
      l.id === leagueId 
        ? { ...l, divisions: l.divisions.filter(d => d.id !== divisionId) }
        : l
    ));
    toast.success('Division deleted');
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

  const handleSaveTeamAssignment = () => {
    if (!selectedDivision) return;

    setLeagues(prev => prev.map(l => ({
      ...l,
      divisions: l.divisions.map(d => 
        d.id === selectedDivision.id 
          ? { ...d, teams: selectedTeamIds }
          : d
      ),
    })));
    setIsTeamAssignDialogOpen(false);
    toast.success('Teams assigned successfully');
  };

  const getTeamName = (teamId: string) => {
    return availableTeams.find(t => t.id === teamId)?.name || teamId;
  };

  const getAssignedTeamIds = (): string[] => {
    const assigned: string[] = [];
    leagues.forEach(league => {
      league.divisions.forEach(div => {
        // Exclude current division's teams when checking
        if (div.id !== selectedDivision?.id) {
          assigned.push(...div.teams);
        }
      });
    });
    return assigned;
  };

  const openGenerateFixtures = (divisionId: string) => {
    setGenerateDivisionId(divisionId);
    setGenerateStartDate('');
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateFixtures = () => {
    if (!generateStartDate || !generateDivisionId) {
      toast.error('Please select a start date');
      return;
    }

    // Find the division and league
    let targetDivision: Division | null = null;
    let targetLeague: League | null = null;
    
    for (const league of leagues) {
      const div = league.divisions.find(d => d.id === generateDivisionId);
      if (div) {
        targetDivision = div;
        targetLeague = league;
        break;
      }
    }

    if (!targetDivision || !targetLeague) {
      toast.error('Division not found');
      return;
    }

    if (targetDivision.teams.length < 2) {
      toast.error('Need at least 2 teams to generate fixtures');
      return;
    }

    const fixtures = generateRoundRobinFixtures(
      targetDivision.teams,
      targetLeague.id,
      targetDivision.id,
      new Date(generateStartDate),
      targetLeague.defaultTime,
      targetLeague.defaultVenue,
      getDayNumber(targetLeague.day)
    );

    setGeneratedGames(prev => [...prev, ...fixtures]);
    setIsGenerateDialogOpen(false);
    toast.success(`Generated ${fixtures.length} fixtures for ${targetDivision.name}`);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="League & Division Management"
        description="Organize teams into leagues and divisions, then generate fixtures"
      />

      <div className="space-y-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="gold" onClick={() => setIsLeagueDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create League
          </Button>
        </div>

        {/* League Cards */}
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
                            {league.day}s at {league.defaultTime} • {league.defaultVenue} • {league.divisions.length} division(s)
                          </CardDescription>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAddDivision(league.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Division
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteLeague(league.id)}
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
                                  onClick={() => handleDeleteDivision(league.id, division.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <CardDescription>
                                {division.teams.length} team(s)
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Team List */}
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

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => openAssignTeams(division)}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Assign Teams
                                </Button>
                                <Button 
                                  variant="gold" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => openGenerateFixtures(division.id)}
                                  disabled={division.teams.length < 2}
                                >
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  Generate
                                </Button>
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

          {leagues.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Leagues Created</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a league to start organizing teams and fixtures
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Generated Fixtures Preview */}
        {generatedGames.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gold" />
                    Generated Fixtures
                  </CardTitle>
                  <CardDescription>{generatedGames.length} games ready to schedule</CardDescription>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setGeneratedGames([])}
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {generatedGames.map(game => (
                  <div 
                    key={game.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {game.homeTeam} vs {game.awayTeam}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Week {game.matchweek} • {game.date.toLocaleDateString()} at {game.time} • {game.venue}
                      </p>
                    </div>
                    <Badge variant="secondary">Matchweek {game.matchweek}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create League Dialog */}
      <Dialog open={isLeagueDialogOpen} onOpenChange={setIsLeagueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New League</DialogTitle>
            <DialogDescription>
              Set up a new league with its default day and venue
            </DialogDescription>
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
              <Select value={newLeagueDay} onValueChange={(v) => setNewLeagueDay(v as typeof newLeagueDay)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Time</Label>
              <Input 
                type="time"
                value={newLeagueTime}
                onChange={e => setNewLeagueTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Venue</Label>
              <Select value={newLeagueVenue} onValueChange={setNewLeagueVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {mockVenues.map(venue => (
                    <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                  ))}
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

      {/* Create Division Dialog */}
      <Dialog open={isDivisionDialogOpen} onOpenChange={setIsDivisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Division</DialogTitle>
            <DialogDescription>
              Create a new division within the league
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Division Name</Label>
              <Input 
                placeholder="e.g., Division 1"
                value={newDivisionName}
                onChange={e => setNewDivisionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDivisionDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreateDivision}>Add Division</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teams Dialog */}
      <Dialog open={isTeamAssignDialogOpen} onOpenChange={setIsTeamAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teams to {selectedDivision?.name}</DialogTitle>
            <DialogDescription>
              Select teams to compete in this division
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto py-4">
            <div className="space-y-2">
              {availableTeams.map(team => {
                const assignedElsewhere = getAssignedTeamIds().includes(team.id);
                return (
                  <div 
                    key={team.id} 
                    className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 ${
                      assignedElsewhere ? 'opacity-50' : ''
                    }`}
                  >
                    <Checkbox 
                      id={team.id}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                      disabled={assignedElsewhere}
                    />
                    <label 
                      htmlFor={team.id} 
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {team.name}
                      {assignedElsewhere && (
                        <span className="text-xs text-muted-foreground ml-2">(assigned elsewhere)</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamAssignDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleSaveTeamAssignment}>
              Save ({selectedTeamIds.length} teams)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Fixtures Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Fixtures</DialogTitle>
            <DialogDescription>
              Choose a start date to generate round-robin fixtures
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Season Start Date</Label>
              <Input 
                type="date"
                value={generateStartDate}
                onChange={e => setGenerateStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Fixtures will be scheduled weekly starting from the first match day after this date
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleGenerateFixtures}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Fixtures
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LeagueManagement;
