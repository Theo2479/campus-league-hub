import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  time: string;
  venue: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress' | 'postponed';
  homeScore?: number;
  awayScore?: number;
  refereeId?: string;
}
import { Plus, Calendar, Trophy, MapPin, Clock, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Mock data removed in favor of API


const mockVenues = [
  'Main Stadium - Field A',
  'Main Stadium - Field B',
  'South Field',
  'North Field',
  'West Practice Field',
  'Indoor Arena',
];

const ManageGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);

  // Form state
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState<Game['status']>('scheduled');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const [pitches, setPitches] = useState<{ id: number, name: string }[]>([]);
  const [referees, setReferees] = useState<{ id: string, name: string }[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string, name: string }[]>([]);

  // Form state additional
  const [refereeId, setRefereeId] = useState('');

  // Fetch games and pitches from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, pitchesRes, refereesRes, teamsRes] = await Promise.all([
          fetch('/api/fixtures', { credentials: 'include' }),
          fetch('/api/admin/pitches', { credentials: 'include' }),
          fetch('/api/admin/referees', { credentials: 'include' }),
          fetch('/api/admin/teams', { credentials: 'include' })
        ]);

        if (gamesRes.ok) {
          const data = await gamesRes.json();
          const mappedGames: Game[] = data.fixtures.map((f: any) => ({
            id: f.id.toString(),
            homeTeam: f.home_team,
            awayTeam: f.away_team,
            date: new Date(f.date),
            time: f.time,
            venue: f.venue,
            status: f.status,
            homeScore: f.home_score,
            awayScore: f.away_score,
            refereeId: f.ref_id ? f.ref_id.toString() : undefined
          }));
          setGames(mappedGames);
        }

        if (pitchesRes.ok) {
          const data = await pitchesRes.json();
          setPitches(data.pitches);
        }

        if (refereesRes.ok) {
          const data = await refereesRes.json();
          setReferees(data.referees.map((r: any) => ({
            id: r.id.toString(),
            name: r.name
          })));
        }

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setAvailableTeams(data.teams.map((t: any) => ({
            id: t.id ? t.id.toString() : '',
            name: t.name
          })));
        }

      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const resetForm = () => {
    setHomeTeam('');
    setAwayTeam('');
    setDate('');
    setTime('');
    setVenue('');
    setStatus('scheduled');
    setHomeScore('');
    setAwayScore('');
    setRefereeId('');
    setEditingGame(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (game: Game) => {
    setEditingGame(game);
    setHomeTeam(game.homeTeam);
    setAwayTeam(game.awayTeam);
    setDate(format(game.date, 'yyyy-MM-dd'));
    setTime(game.time);
    setVenue(game.venue);
    setStatus(game.status);
    setHomeScore(game.homeScore?.toString() || '');
    setAwayScore(game.awayScore?.toString() || '');
    setRefereeId(game.refereeId || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!homeTeam || !awayTeam || !date || !time || !venue) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (homeTeam === awayTeam) {
      toast.error('Home and away teams must be different');
      return;
    }

    const payload = {
      homeTeam,
      awayTeam,
      date,
      time,
      venue,
      status,
      homeScore: homeScore ? parseInt(homeScore) : undefined,
      awayScore: awayScore ? parseInt(awayScore) : undefined,
      refereeId: refereeId || null,
    };

    try {
      let res;
      if (editingGame) {
        res = await fetch(`/api/admin/fixtures/${editingGame.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      } else {
        res = await fetch('/api/admin/fixtures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      }

      if (res.ok) {
        toast.success(editingGame ? 'Game updated' : 'Game created');
        setIsDialogOpen(false);
        resetForm();
        // Refetch games
        // Ideally extract fetchGames to a function we can call again. 
        // For now, reload page or hack trigger. 
        // Better: update state yourself or re-trigger the useEffect (add dependency).
        window.location.reload(); // Simple brute force for now to ensure state sync, or fix fetch
        // Ideally: fetchGames(); 
      } else {
        toast.error("Failed to save game");
      }
    } catch (e) {
      toast.error("Error saving game");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteGameId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteGameId) return;

    try {
      const res = await fetch(`/api/admin/fixtures/${deleteGameId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        toast.success('Game deleted');
        window.location.reload();
      } else {
        toast.error('Failed to delete game');
      }
    } catch (e) {
      toast.error('Error deleting game');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteGameId(null);
    }
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled');
  const completedGames = games.filter(g => g.status === 'completed');

  const getStatusBadge = (status: Game['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in-progress':
        return <Badge className="bg-gold text-navy">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Manage Games"
        description="Create, edit, and manage league fixtures"
      />

      <div className="mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" size="lg" onClick={openCreateDialog}>
              <Plus className="h-5 w-5 mr-2" />
              Add New Game
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingGame ? 'Edit Game' : 'Create New Game'}</DialogTitle>
              <DialogDescription>
                {editingGame ? 'Update the game details below.' : 'Fill in the details to schedule a new game.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeTeam">Home Team *</Label>
                  <Select value={homeTeam} onValueChange={setHomeTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayTeam">Away Team *</Label>
                  <Select value={awayTeam} onValueChange={setAwayTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Select value={venue} onValueChange={setVenue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {pitches.map(p => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referee">Referee</Label>
                <Select value={refereeId} onValueChange={setRefereeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select referee" />
                  </SelectTrigger>
                  <SelectContent>
                    {referees.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Game['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === 'completed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">Home Score</Label>
                    <Input
                      id="homeScore"
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">Away Score</Label>
                    <Input
                      id="awayScore"
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" onClick={handleSubmit}>
                {editingGame ? 'Update Game' : 'Create Game'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scheduled Games */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Upcoming Games
            </CardTitle>
            <CardDescription>{scheduledGames.length} games scheduled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledGames.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming games</p>
            ) : (
              scheduledGames.map(game => (
                <Card key={game.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-gold" />
                          <span className="font-semibold text-foreground">
                            {game.homeTeam} vs {game.awayTeam}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(game.date, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {game.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {game.venue}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(game.status)}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(game)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(game.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Games */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              Completed Games
            </CardTitle>
            <CardDescription>{completedGames.length} games played</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedGames.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No completed games</p>
            ) : (
              completedGames.map(game => (
                <Card key={game.id} variant="success" className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-gold" />
                          <span className="font-semibold text-foreground">
                            {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(game.date, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {game.venue}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(game.status)}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(game)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(game.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this game record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ManageGames;
