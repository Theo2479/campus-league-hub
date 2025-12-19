import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateWeeklySlots, TimeSlot } from '@/data/mockData';
import { Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RefereeAvailability = () => {
  const [slots, setSlots] = useState<TimeSlot[]>(generateWeeklySlots);

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
      return 'bg-success text-white border-success hover:bg-success/90 shadow-sm';
    }
    if (slot.status === 'full') {
      return 'bg-muted text-muted-foreground cursor-not-allowed opacity-60';
    }
    if (slot.signedUpCount === 0) {
      return 'bg-gold/20 text-gold-dark border-gold/50 hover:bg-gold/30 shadow-sm';
    }
    return 'bg-background border-border hover:bg-secondary';
  };

  const getSlotLabel = (slot: TimeSlot) => {
    if (slot.status === 'signed-up') return '✓ Signed Up';
    if (slot.status === 'full') return 'Full';
    if (slot.signedUpCount === 0) return 'Needed!';
    return `${slot.signedUpCount}/${slot.maxCapacity}`;
  };

  const days = [...new Set(slots.map(s => format(s.date, 'yyyy-MM-dd')))];
  const times = [...new Set(slots.map(s => s.time))];

  return (
    <DashboardLayout>
      <PageHeader
        title="Availability Schedule"
        description="Click time slots to sign up or remove yourself from referee duty"
      />

      {/* Legend */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-success" />
              <span className="text-sm text-muted-foreground">Signed Up</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-gold/40 border border-gold/50" />
              <span className="text-sm text-muted-foreground">Refs Needed (Low sign-ups)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-background border border-border" />
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted opacity-60" />
              <span className="text-sm text-muted-foreground">Fully Booked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold" />
            This Week's Schedule
          </CardTitle>
          <CardDescription>
            Click any available slot to sign up. Gold slots indicate low sign-ups - we need more referees!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid grid-cols-8 gap-2 mb-3">
                <div className="text-sm font-semibold text-muted-foreground p-3">Time</div>
                {days.map(day => (
                  <div key={day} className="text-center p-3 rounded-lg bg-secondary">
                    <div className="text-sm font-semibold text-foreground">
                      {format(new Date(day), 'EEE')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(day), 'MMM d')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots grid */}
              {times.map(time => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                  <div className="text-sm font-medium text-muted-foreground p-3 flex items-center">
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
                        disabled={slot.status === 'full'}
                        className={cn(
                          'p-3 rounded-lg text-sm font-medium border transition-all duration-200',
                          getSlotStyle(slot)
                        )}
                      >
                        {getSlotLabel(slot)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card variant="gold" className="mt-6">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Tips for Referees</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sign up for slots early to secure your preferred times. Gold-highlighted slots have
              fewer sign-ups and typically need more referees. Your reliability score improves
              when you show up for your signed-up slots.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default RefereeAvailability;
