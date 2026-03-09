
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Check, X, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';


interface PitchSlot {
  id: number;
  date: string;
  day_of_week: string;
  time_slot: string;
  is_booked: boolean;
}

interface Pitch {
  id: number;
  name: string;
  status: string;
  slots: PitchSlot[];
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

const PitchManagement = () => {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [newPitchName, setNewPitchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);

  // Calendar state - show 4 weeks at a time
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
    return today;
  });

  // Bulk add dialog
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkWeeks, setBulkWeeks] = useState(10);
  const [bulkDay, setBulkDay] = useState<number>(6); // Saturday = 6 (JS)
  const [bulkSlots, setBulkSlots] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'add' | 'clear'>('add');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchPitches();
  }, [calendarStartDate]);

  const fetchPitches = async () => {
    try {
      const startStr = formatDate(calendarStartDate);
      const endDate = new Date(calendarStartDate);
      endDate.setDate(endDate.getDate() + 56); // 8 weeks
      const endStr = formatDate(endDate);

      const res = await apiFetch(`/api/admin/pitches/availability-summary?start_date=${startStr}&end_date=${endStr}`);
      if (res.ok) {
        const data = await res.json();
        setPitches(data.pitches);

        // Update selected pitch with new data
        if (selectedPitch) {
          const updated = data.pitches.find((p: Pitch) => p.id === selectedPitch.id);
          if (updated) setSelectedPitch(updated);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pitches');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleCreatePitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPitchName.trim()) return;

    try {
      const res = await apiFetch('/api/admin/pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPitchName })
        
      });

      if (res.ok) {
        toast.success('Pitch created');
        setNewPitchName('');
        fetchPitches();
      } else {
        toast.error('Failed to create pitch');
      }
    } catch (error) {
      toast.error('Error creating pitch');
    }
  };

  const selectPitchForEdit = (pitch: Pitch) => {
    setSelectedPitch(pitch);
  };

  const toggleSlot = async (date: string, time: string) => {
    if (!selectedPitch) return;

    // Check if slot already exists
    const existingSlot = selectedPitch.slots.find(
      s => s.date === date && s.time_slot === time
    );

    if (existingSlot) {
      if (existingSlot.is_booked) {
        toast.error('Cannot modify a booked slot');
        return;
      }
      // Delete the slot
      try {
        await apiFetch(`/api/admin/pitches/${selectedPitch.id}/availability/${existingSlot.id}`, {
          method: 'DELETE'
          
        });
        toast.success('Slot removed');
        fetchPitches();
      } catch (e) {
        toast.error('Failed to remove slot');
      }
    } else {
      // Add new slot
      try {
        await apiFetch(`/api/admin/pitches/${selectedPitch.id}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, slots: [time] })
          
        });
        toast.success('Slot added');
        fetchPitches();
      } catch (e) {
        toast.error('Failed to add slot');
      }
    }
  };

  const handleDeletePitch = async () => {
    if (!selectedPitch) return;

    try {
      const res = await apiFetch(`/api/admin/pitches/${selectedPitch.id}`, {
        method: 'DELETE'
        
      });

      if (res.ok) {
        toast.success('Pitch deleted');
        setSelectedPitch(null);
        fetchPitches();
        setIsDeleteDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete pitch');
      }
    } catch (e) {
      toast.error('Error deleting pitch');
    }
  };

  const getSlotForDate = (date: string, time: string): PitchSlot | undefined => {
    return selectedPitch?.slots.find(s => s.date === date && s.time_slot === time);
  };

  const navigateCalendar = (weeks: number) => {
    const newDate = new Date(calendarStartDate);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setCalendarStartDate(newDate);
  };

  const getWeekDates = () => {
    const weeks: Date[][] = [];
    for (let w = 0; w < 8; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(calendarStartDate);
        date.setDate(date.getDate() + (w * 7) + d);
        week.push(date);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const openBulkDialog = () => {
    setBulkStartDate(formatDate(new Date()));
    setBulkSlots([]);
    setBulkMode('add');
    setIsBulkDialogOpen(true);
  };

  const handleBulkSubmit = async () => {
    if (!selectedPitch || !bulkStartDate) {
      toast.error('Please fill required fields');
      return;
    }

    // For ADD mode, we need slots
    if (bulkMode === 'add' && bulkSlots.length === 0) {
      toast.error('Select at least one time slot');
      return;
    }

    // Calculate start and end dates for the endpoint
    const start = new Date(bulkStartDate);
    // Find first occurrence of the selected day
    // bulkDay is 0 (Sun) to 6 (Sat)
    const daysUntilTarget = (bulkDay - start.getDay() + 7) % 7;
    const firstDate = new Date(start);
    firstDate.setDate(start.getDate() + daysUntilTarget);

    // Calculate end date (last occurrence)
    const endDate = new Date(firstDate);
    endDate.setDate(firstDate.getDate() + ((bulkWeeks - 1) * 7));

    // Convert JS Day (0=Sun, 6=Sat) to Python Day (0=Mon, 6=Sun)
    // JS: 0 1 2 3 4 5 6 (Sun Mon Tue Wed Thu Fri Sat)
    // PY: 6 0 1 2 3 4 5
    const pyDay = bulkDay === 0 ? 6 : bulkDay - 1;

    try {
      if (bulkMode === 'add') {
        // Use existing explicit date list logic for ADD (or update backend to match clear logic)
        // Keeping efficient list logic for add:
        const dates: string[] = [];
        for (let i = 0; i < bulkWeeks; i++) {
          const d = new Date(firstDate);
          d.setDate(firstDate.getDate() + (i * 7));
          dates.push(formatDate(d));
        }

        const res = await apiFetch(`/api/admin/pitches/${selectedPitch.id}/availability/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates, slots: bulkSlots })
          
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(data.message);
          setIsBulkDialogOpen(false);
          fetchPitches();
        } else {
          toast.error('Failed to add slots');
        }

      } else {
        // CLEAR mode
        const res = await apiFetch('/api/admin/pitches/availability/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pitch_id: selectedPitch.id,
            start_date: formatDate(firstDate),
            end_date: formatDate(endDate),
            day_of_week: pyDay
          })
          
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(data.message);
          setIsBulkDialogOpen(false);
          fetchPitches();
        } else {
          toast.error('Failed to clear slots');
        }
      }
    } catch (e) {
      toast.error('Error processing request');
    }
  };

  const toggleBulkSlot = (slot: string) => {
    setBulkSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const getSlotCounts = (pitch: Pitch) => {
    const total = pitch.slots.length;
    const booked = pitch.slots.filter(s => s.is_booked).length;
    return { total, booked, available: total - booked };
  };

  const weeks = getWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <DashboardLayout>
      <PageHeader
        title="Pitch Availability Calendar"
        description="Set specific date availability for pitches. Each week can have different times."
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column: List & Create */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add New Pitch</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePitch} className="flex gap-2">
                <Input
                  placeholder="e.g. North Field"
                  value={newPitchName}
                  onChange={e => setNewPitchName(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pitches
              </CardTitle>
              <CardDescription>Select a pitch to edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : pitches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pitches yet</p>
              ) : (
                pitches.map(pitch => {
                  const counts = getSlotCounts(pitch);
                  return (
                    <div
                      key={pitch.id}
                      onClick={() => selectPitchForEdit(pitch)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                        selectedPitch?.id === pitch.id && "bg-accent border-primary"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pitch.name}</span>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {counts.available} free
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Date-Based Calendar */}
        <div className="lg:col-span-3">
          {selectedPitch ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gold" />
                      {selectedPitch.name} - Schedule
                    </CardTitle>
                    <CardDescription>
                      Click dates to add/remove time slots. Each date can have different times.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Pitch
                    </Button>
                    <Button variant="outline" onClick={openBulkDialog}>
                      <Plus className="h-4 w-4 mr-1" />
                      Bulk Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="sm" onClick={() => navigateCalendar(-4)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    {calendarStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigateCalendar(4)}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Legend */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-500"></div>
                    <span>Booked</span>
                  </div>
                </div>

                {/* Weekly Calendar Grid */}
                <div className="space-y-4">
                  {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="border rounded-lg overflow-hidden">
                      {/* Week Header */}
                      <div className="grid grid-cols-8 bg-muted/50">
                        <div className="p-2 text-xs font-medium text-muted-foreground border-r">
                          Time
                        </div>
                        {week.map((date, dayIdx) => (
                          <div key={dayIdx} className="p-2 text-center border-r last:border-r-0">
                            <div className="text-xs font-medium">{dayNames[dayIdx]}</div>
                            <div className="text-xs text-muted-foreground">
                              {date.getDate()}/{date.getMonth() + 1}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time Slots */}
                      {TIME_SLOTS.map(time => (
                        <div key={time} className="grid grid-cols-8 border-t">
                          <div className="p-1 text-xs text-muted-foreground border-r flex items-center justify-center">
                            {time}
                          </div>
                          {week.map((date, dayIdx) => {
                            const dateStr = formatDate(date);
                            const slot = getSlotForDate(dateStr, time);
                            const hasSlot = !!slot;
                            const isBooked = slot?.is_booked || false;

                            return (
                              <div key={dayIdx} className="p-0.5 border-r last:border-r-0">
                                <button
                                  onClick={() => toggleSlot(dateStr, time)}
                                  className={cn(
                                    "w-full h-6 rounded text-xs transition-all flex items-center justify-center",
                                    isBooked && "bg-orange-500/30 border border-orange-500 cursor-not-allowed",
                                    !isBooked && hasSlot && "bg-green-500/20 border border-green-500 hover:bg-green-500/30",
                                    !hasSlot && "hover:bg-muted"
                                  )}
                                  disabled={isBooked}
                                >
                                  {isBooked && <X className="h-3 w-3 text-orange-600" />}
                                  {!isBooked && hasSlot && <Check className="h-3 w-3 text-green-600" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a pitch</p>
              <p className="text-sm">Choose a pitch to manage its availability calendar</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkMode === 'add' ? 'Bulk Add Availability' : 'Bulk Clear Availability'}</DialogTitle>
            <DialogDescription>
              {bulkMode === 'add'
                ? 'Add the same time slots across multiple weeks'
                : 'Remove all available slots for selected days over the range'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex p-1 bg-muted rounded-lg">
              <button
                className={cn(
                  "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
                  bulkMode === 'add' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBulkMode('add')}
              >
                Add Availability
              </button>
              <button
                className={cn(
                  "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
                  bulkMode === 'clear' ? "bg-background shadow-sm text-destructive" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBulkMode('clear')}
              >
                Clear Availability
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={bulkStartDate}
                  onChange={e => setBulkStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Weeks</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={bulkWeeks}
                  onChange={e => setBulkWeeks(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Day of Week</Label>
              <div className="flex gap-2 flex-wrap">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <Button
                    key={day}
                    variant={bulkDay === (idx + 1) % 7 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkDay((idx + 1) % 7)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Slots (Only for Add Mode) */}
            {bulkMode === 'add' && (
              <div className="space-y-2">
                <Label>Time Slots</Label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(time => (
                    <button
                      key={time}
                      onClick={() => toggleBulkSlot(time)}
                      className={cn(
                        "h-9 text-xs border rounded transition-colors hover:bg-muted",
                        bulkSlots.includes(time) && "bg-gold text-navy border-gold font-medium"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bulkMode === 'clear' && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <p className="font-medium flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Warning
                </p>
                <p className="mt-1">
                  This will remove ALL unbooked availability slots for <strong>{dayNames[bulkDay === 0 ? 6 : bulkDay - 1]}s</strong> in this date range.
                  Booked slots (orange) will not be removed.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
            <Button
              variant={bulkMode === 'add' ? "gold" : "destructive"}
              onClick={handleBulkSubmit}
            >
              {bulkMode === 'add' ? 'Generate Slots' : 'Clear Slots'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{selectedPitch?.name}</strong> and remove all associated availability data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePitch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PitchManagement;
