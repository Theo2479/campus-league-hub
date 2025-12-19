import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockRefereeGames, mockRefereeStats, generateWeeklySlots, TimeSlot } from '@/data/mockData';
import { Trophy, Star, DollarSign, Calendar, MessageCircle, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RefereeDashboard = () => {
  const [slots, setSlots] = useState<TimeSlot[]>(generateWeeklySlots);
  const upcomingGames = mockRefereeGames.slice(0, 2);

  const toggleSlot = (slotId: string) => {
    setSlots(prev =>
      prev.map(slot => {
        if (slot.id !== slotId) return slot;
        if (slot.status === 'full') {
          toast.error('This slot is fully booked');
          return slot;
        }
        const newStatus = slot.status === 'signed-up' ? 'available' : 'signed-up';
        toast.success(newStatus === 'signed-up' ? 'Signed up for slot!' : 'Removed from slot');
        return { ...slot, status: newStatus };
      })
    );
  };

  const getSlotStyle = (slot: TimeSlot) => {
    if (slot.status === 'signed-up') {
      return 'bg-success text-white border-success hover:bg-success/90';
    }
    if (slot.status === 'full') {
      return 'bg-muted text-muted-foreground cursor-not-allowed';
    }
    if (slot.signedUpCount === 0) {
      return 'bg-gold/20 text-gold border-gold/50 hover:bg-gold/30';
    }
    return 'bg-background border-border hover:bg-secondary';
  };

  // Get unique days from slots
  const days = [...new Set(slots.map(s => format(s.date, 'yyyy-MM-dd')))];
  const times = [...new Set(slots.map(s => s.time))];

  return (
    <DashboardLayout>
      <PageHeader
        title="Referee Dashboard"
        description="Manage your availability and track your refereeing stats"
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Games Reffed"
          value={mockRefereeStats.gamesReffed}
          icon={<Trophy className="h-6 w-6" />}
        />
        <StatCard
          label="Reliability Score"
          value={`${mockRefereeStats.reliabilityScore}%`}
          icon={<Star className="h-6 w-6" />}
        />
        <StatCard
          label="Avg Rating"
          value={mockRefereeStats.avgRating}
          icon={<Star className="h-6 w-6" />}
        />
        <StatCard
          label="Total Earnings"
          value={mockRefereeStats.totalEarnings}
          icon={<DollarSign className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Availability Grid */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Weekly Availability
            </CardTitle>
            <CardDescription>
              Click slots to toggle your availability. Green = signed up, Gold = low sign-ups (needed!)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Header row with days */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="text-xs font-medium text-muted-foreground p-2">Time</div>
                  {days.map(day => (
                    <div key={day} className="text-xs font-medium text-center p-2">
                      <div className="text-foreground">{format(new Date(day), 'EEE')}</div>
                      <div className="text-muted-foreground">{format(new Date(day), 'MMM d')}</div>
                    </div>
                  ))}
                </div>

                {/* Time slots */}
                {times.map(time => (
                  <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                    <div className="text-xs font-medium text-muted-foreground p-2 flex items-center">
                      {time}
                    </div>
                    {days.map(day => {
                      const slot = slots.find(
                        s => format(s.date, 'yyyy-MM-dd') === day && s.time === time
                      );
                      if (!slot) return <div key={day} />;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => toggleSlot(slot.id)}
                          className={cn(
                            'p-2 rounded-md text-xs font-medium border transition-all duration-200',
                            getSlotStyle(slot)
                          )}
                        >
                          {slot.status === 'full' ? 'Full' : slot.signedUpCount === 0 ? 'Need!' : `${slot.signedUpCount}/3`}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
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
            {upcomingGames.map(game => (
              <Card key={game.id} variant="default" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {game.homeTeam} vs {game.awayTeam}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(game.date, 'EEEE, MMMM d')} at {game.time}
                      </p>
                      <p className="text-sm text-muted-foreground">{game.venue}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => toast.info('Drop out request submitted')}
                      >
                        <X className="h-4 w-4" />
                        Drop Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RefereeDashboard;
