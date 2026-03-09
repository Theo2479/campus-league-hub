import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Calendar, Clock, CheckCircle, Lock, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

interface TimeSlot {
  date: string;
  time: string;
  game_count: number;
  is_available: boolean;
  total_ref_count?: number;
}

const SlotCard = ({
  slot,
  loadingSlot,
  onAction
}: {
  slot: TimeSlot;
  loadingSlot: string | null;
  onAction: (slot: TimeSlot, isAdding: boolean) => void;
}) => {
  const slotKey = `${slot.date}-${slot.time}`;
  const isLoading = loadingSlot === slotKey;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">
                {format(new Date(slot.date), 'EEEE, MMMM d')}
              </h3>
              <Badge variant="outline" className="text-muted-foreground">
                {slot.time}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {slot.game_count} Game{slot.game_count !== 1 ? 's' : ''} scheduled
              </span>

              {slot.total_ref_count !== undefined && slot.total_ref_count > 0 && (
                <span className="flex items-center gap-1 text-gold">
                  <Users className="h-4 w-4" />
                  {slot.total_ref_count} other ref{slot.total_ref_count !== 1 ? 's' : ''} available
                </span>
              )}

              {slot.is_available && (
                <span className="flex items-center gap-1 text-success font-medium">
                  <CheckCircle className="h-4 w-4" />
                  You are available
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slot.is_available ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onAction(slot, false)}
                disabled={!!loadingSlot}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onAction(slot, true)}
                disabled={!!loadingSlot}
                className="bg-navy hover:bg-navy/90"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "I'm Available"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RefereeAvailability = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slotsRes, windowRes] = await Promise.all([
        apiFetch('/api/fixtures/available'),
        apiFetch('/api/admin/availability-window')
      ]);

      if (slotsRes.ok) {
        const data = await slotsRes.json();
        setSlots(data.slots || []);
      }

      if (windowRes.ok) {
        const wData = await windowRes.json();
        setIsWindowOpen(wData.isOpen);
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailability = async (slot: TimeSlot, isAdding: boolean) => {
    const slotKey = `${slot.date}-${slot.time}`;
    setLoadingSlot(slotKey);

    try {
      const endpoint = '/api/referee/availability';
      const method = isAdding ? 'POST' : 'DELETE';

      const response = await apiFetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: slot.date,
          time: slot.time
        }),
        
      });

      if (response.ok) {
        toast.success(isAdding ? 'Marked as available' : 'Availability withdrawn');
        // Refresh
        const slotsRes = await apiFetch('/api/fixtures/available');
        if (slotsRes.ok) {
          const data = await slotsRes.json();
          setSlots(data.slots || []);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update availability');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoadingSlot(null);
    }
  };

  // Filter slots for "My Availability" tab
  const mySlots = slots.filter(s => s.is_available);

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
        title="Referee Availability"
        description="Indicate when you are available to referee games"
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            Available Slots {isWindowOpen ? `(${slots.length})` : '(Closed)'}
          </TabsTrigger>
          <TabsTrigger value="mine">
            My Availability ({mySlots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {!isWindowOpen ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-4 text-destructive/40" />
                <p className="text-lg font-medium text-foreground">Sign-up Window Closed</p>
                <p className="text-sm mt-2">The administrator has not opened the sign-up window yet.</p>
              </CardContent>
            </Card>
          ) : slots.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No games found in the open allocation period.</p>
                <p className="text-sm mt-2">Check back later.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {slots.map((slot) => (
                <SlotCard
                  key={`${slot.date}-${slot.time}`}
                  slot={slot}
                  loadingSlot={loadingSlot}
                  onAction={handleAvailability}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {mySlots.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>You haven't marked yourself available for any slots.</p>
                <p className="text-sm mt-2">Switch to the "Available Slots" tab to sign up.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {mySlots.map((slot) => (
                <SlotCard
                  key={`${slot.date}-${slot.time}`}
                  slot={slot}
                  loadingSlot={loadingSlot}
                  onAction={handleAvailability}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-sm text-muted-foreground bg-muted/20 p-4 rounded-lg">
        <p className="font-semibold mb-1">How Allocation Works:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Review the time slots where games are scheduled.</li>
          <li>Mark yourself available for any slots you can attend.</li>
          <li>When the window closes, the Administrator will run the allocation algorithm.</li>
          <li>You will be assigned to specific games based on availability, reliability, and fairness.</li>
          <li>Check your Dashboard or "My Games" page for final assignments.</li>
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default RefereeAvailability;
