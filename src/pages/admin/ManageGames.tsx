import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Game } from '@/data/mockData';
import { Plus, Calendar, Trophy, MapPin, Clock, Edit2, Trash2 } from 'lucide-react';
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

const mockTeams = [
  'Engineering Eagles',
  'Business Hawks',
  'Law Lions',
  'Medical Wolves',
  'Arts Panthers',
  'Science Tigers',
  'Philosophy Foxes',
  'History Hounds',
];

const mockVenues = [
  'Main Stadium - Field A',
  'Main Stadium - Field B',
  'South Field',
  'North Field',
  'West Practice Field',
  'Indoor Arena',
];

const initialGames: Game[] = [
  {
    id: 'ag1',
    homeTeam: 'Engineering Eagles',
    awayTeam: 'Business Hawks',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    time: '14:00',
    venue: 'Main Stadium - Field A',
    status: 'completed',
    homeScore: 3,
    awayScore: 1,
  },
  {
    id: 'ag2',
    homeTeam: 'Law Lions',
    awayTeam: 'Medical Wolves',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    time: '16:00',
    venue: 'South Field',
    status: 'completed',
    homeScore: 2,
    awayScore: 2,
  },
  {
    id: 'ag3',
    homeTeam: 'Arts Panthers',
    awayTeam: 'Science Tigers',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    time: '10:00',
    venue: 'North Field',
    status: 'scheduled',
  },
  {
    id: 'ag4',
    homeTeam: 'Philosophy Foxes',
    awayTeam: 'History Hounds',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    time: '14:00',
    venue: 'West Practice Field',
    status: 'scheduled',
  },
];

const ManageGames = () => {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Form state
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState<Game['status']>('scheduled');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const resetForm = () => {
    setHomeTeam('');
    setAwayTeam('');
    setDate('');
    setTime('');
    setVenue('');
    setStatus('scheduled');
    setHomeScore('');
    setAwayScore('');
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
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!homeTeam || !awayTeam || !date || !time || !venue) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (homeTeam === awayTeam) {
      toast.error('Home and away teams must be different');
      return;
    }

    const gameData: Game = {
      id: editingGame?.id || `ag-${Date.now()}`,
      homeTeam,
      awayTeam,
      date: new Date(date),
      time,
      venue,
      status,
      homeScore: homeScore ? parseInt(homeScore) : undefined,
      awayScore: awayScore ? parseInt(awayScore) : undefined,
    };

    if (editingGame) {
      setGames(prev => prev.map(g => (g.id === editingGame.id ? gameData : g)));
      toast.success('Game updated successfully');
    } else {
      setGames(prev => [...prev, gameData]);
      toast.success('Game created successfully');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
    toast.success('Game deleted');
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
                      {mockTeams.map(team => (
                        <SelectItem key={team} value={team}>
                          {team}
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
                      {mockTeams.map(team => (
                        <SelectItem key={team} value={team}>
                          {team}
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
                    {mockVenues.map(v => (
                      <SelectItem key={v} value={v}>
                        {v}
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
                          onClick={() => handleDelete(game.id)}
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
                          onClick={() => handleDelete(game.id)}
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
    </DashboardLayout>
  );
};

export default ManageGames;
