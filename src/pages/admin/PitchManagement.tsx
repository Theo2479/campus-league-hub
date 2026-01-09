import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPitches, generateMockPitchSlots, Pitch, PitchSlot } from '@/data/mockData';
import { Plus, MapPin, Clock, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PitchManagement = () => {
  const [pitches, setPitches] = useState<Pitch[]>(mockPitches);
  const [pitchSlots, setPitchSlots] = useState<PitchSlot[]>(generateMockPitchSlots());
  
  // Dialog states
  const [isPitchDialogOpen, setIsPitchDialogOpen] = useState(false);
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [isBulkSlotDialogOpen, setIsBulkSlotDialogOpen] = useState(false);
  
  // Form states
  const [newPitchName, setNewPitchName] = useState('');
  const [newPitchLocation, setNewPitchLocation] = useState('');
  
  const [selectedPitchId, setSelectedPitchId] = useState<string>('');
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotStartTime, setNewSlotStartTime] = useState('');
  const [newSlotEndTime, setNewSlotEndTime] = useState('');
  
  // Bulk slot form
  const [bulkPitchId, setBulkPitchId] = useState<string>('');
  const [bulkDay, setBulkDay] = useState<'Wednesday' | 'Saturday' | 'Sunday'>('Wednesday');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkWeeks, setBulkWeeks] = useState('8');
  const [bulkTimeSlots, setBulkTimeSlots] = useState('18:00-19:30, 19:30-21:00');
  
  // View state
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    return monday.toISOString().split('T')[0];
  });

  const getWeekDates = (startDate: string) => {
    const dates: string[] = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(selectedWeekStart);
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeekStart(current.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleCreatePitch = () => {
    if (!newPitchName || !newPitchLocation) {
      toast.error('Please fill in all fields');
      return;
    }

    const newPitch: Pitch = {
      id: `pitch-${Date.now()}`,
      name: newPitchName,
      location: newPitchLocation,
      capacity: 1,
    };

    setPitches(prev => [...prev, newPitch]);
    setIsPitchDialogOpen(false);
    setNewPitchName('');
    setNewPitchLocation('');
    toast.success(`${newPitchName} added successfully`);
  };

  const handleDeletePitch = (pitchId: string) => {
    setPitches(prev => prev.filter(p => p.id !== pitchId));
    setPitchSlots(prev => prev.filter(s => s.pitchId !== pitchId));
    toast.success('Pitch deleted');
  };

  const handleCreateSlot = () => {
    if (!selectedPitchId || !newSlotDate || !newSlotStartTime || !newSlotEndTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const newSlot: PitchSlot = {
      id: `slot-${Date.now()}`,
      pitchId: selectedPitchId,
      date: newSlotDate,
      startTime: newSlotStartTime,
      endTime: newSlotEndTime,
      isBooked: false,
    };

    setPitchSlots(prev => [...prev, newSlot]);
    setIsSlotDialogOpen(false);
    toast.success('Slot added successfully');
  };

  const handleBulkCreateSlots = () => {
    if (!bulkPitchId || !bulkStartDate || !bulkWeeks || !bulkTimeSlots) {
      toast.error('Please fill in all fields');
      return;
    }

    const weeks = parseInt(bulkWeeks);
    const timeSlotPairs = bulkTimeSlots.split(',').map(s => s.trim());
    const dayNumber = bulkDay === 'Wednesday' ? 3 : bulkDay === 'Saturday' ? 6 : 0;
    
    const newSlots: PitchSlot[] = [];
    const startDate = new Date(bulkStartDate);
    
    // Find the next occurrence of the selected day
    const currentDay = startDate.getDay();
    const daysUntilTarget = (dayNumber - currentDay + 7) % 7;
    startDate.setDate(startDate.getDate() + daysUntilTarget);
    
    for (let week = 0; week < weeks; week++) {
      const slotDate = new Date(startDate);
      slotDate.setDate(startDate.getDate() + (week * 7));
      const dateStr = slotDate.toISOString().split('T')[0];
      
      timeSlotPairs.forEach((pair, idx) => {
        const [start, end] = pair.split('-').map(t => t.trim());
        if (start && end) {
          newSlots.push({
            id: `bulk-${bulkPitchId}-${dateStr}-${idx}`,
            pitchId: bulkPitchId,
            date: dateStr,
            startTime: start,
            endTime: end,
            isBooked: false,
          });
        }
      });
    }

    setPitchSlots(prev => [...prev, ...newSlots]);
    setIsBulkSlotDialogOpen(false);
    toast.success(`Created ${newSlots.length} slots for ${weeks} weeks`);
  };

  const handleDeleteSlot = (slotId: string) => {
    setPitchSlots(prev => prev.filter(s => s.id !== slotId));
    toast.success('Slot deleted');
  };

  const getSlotsForPitchAndDate = (pitchId: string, date: string) => {
    return pitchSlots.filter(s => s.pitchId === pitchId && s.date === date);
  };

  const getPitchName = (pitchId: string) => {
    return pitches.find(p => p.id === pitchId)?.name || pitchId;
  };

  const weekDates = getWeekDates(selectedWeekStart);

  return (
    <DashboardLayout>
      <PageHeader
        title="Pitch & Availability Management"
        description="Manage pitches and their available time slots for fixture allocation"
      />

      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" onClick={() => setIsPitchDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pitch
          </Button>
          <Button variant="outline" onClick={() => setIsSlotDialogOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Add Single Slot
          </Button>
          <Button variant="outline" onClick={() => setIsBulkSlotDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Bulk Add Slots
          </Button>
        </div>

        {/* Pitch List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gold" />
              Registered Pitches
            </CardTitle>
            <CardDescription>{pitches.length} pitch(es) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pitches.map(pitch => (
                <div 
                  key={pitch.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{pitch.name}</p>
                    <p className="text-xs text-muted-foreground">{pitch.location}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeletePitch(pitch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Availability Grid */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gold" />
                  Weekly Availability
                </CardTitle>
                <CardDescription>View and manage pitch slots by week</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">
                  {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                </span>
                <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Pitch</TableHead>
                    {weekDates.map(date => (
                      <TableHead key={date} className="text-center min-w-[120px]">
                        {formatDate(date)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pitches.map(pitch => (
                    <TableRow key={pitch.id}>
                      <TableCell className="font-medium text-sm">{pitch.name}</TableCell>
                      {weekDates.map(date => {
                        const slots = getSlotsForPitchAndDate(pitch.id, date);
                        return (
                          <TableCell key={date} className="text-center">
                            {slots.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {slots.map(slot => (
                                  <Badge 
                                    key={slot.id} 
                                    variant={slot.isBooked ? "destructive" : "secondary"}
                                    className="text-xs cursor-pointer hover:opacity-80"
                                    onClick={() => !slot.isBooked && handleDeleteSlot(slot.id)}
                                  >
                                    {slot.startTime}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Click on an available slot to delete it. Booked slots (red) cannot be deleted.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Pitch Dialog */}
      <Dialog open={isPitchDialogOpen} onOpenChange={setIsPitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Pitch</DialogTitle>
            <DialogDescription>Add a new pitch/venue for fixture allocation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Pitch Name</Label>
              <Input 
                placeholder="e.g., Main Stadium - Field C"
                value={newPitchName}
                onChange={e => setNewPitchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input 
                placeholder="e.g., Central Campus"
                value={newPitchLocation}
                onChange={e => setNewPitchLocation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPitchDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreatePitch}>Add Pitch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Slot Dialog */}
      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>Add a single availability slot for a pitch</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Pitch</Label>
              <Select value={selectedPitchId} onValueChange={setSelectedPitchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch" />
                </SelectTrigger>
                <SelectContent>
                  {pitches.map(pitch => (
                    <SelectItem key={pitch.id} value={pitch.id}>{pitch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date"
                value={newSlotDate}
                onChange={e => setNewSlotDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  value={newSlotStartTime}
                  onChange={e => setNewSlotStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time"
                  value={newSlotEndTime}
                  onChange={e => setNewSlotEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSlotDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreateSlot}>Add Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Slots Dialog */}
      <Dialog open={isBulkSlotDialogOpen} onOpenChange={setIsBulkSlotDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Add Time Slots</DialogTitle>
            <DialogDescription>
              Create recurring time slots for multiple weeks
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Pitch</Label>
              <Select value={bulkPitchId} onValueChange={setBulkPitchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch" />
                </SelectTrigger>
                <SelectContent>
                  {pitches.map(pitch => (
                    <SelectItem key={pitch.id} value={pitch.id}>{pitch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={bulkDay} onValueChange={(v) => setBulkDay(v as typeof bulkDay)}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start From</Label>
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
                  min="1"
                  max="52"
                  value={bulkWeeks}
                  onChange={e => setBulkWeeks(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time Slots (comma separated)</Label>
              <Input 
                placeholder="e.g., 18:00-19:30, 19:30-21:00"
                value={bulkTimeSlots}
                onChange={e => setBulkTimeSlots(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: START-END, separated by commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkSlotDialogOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleBulkCreateSlots}>Create Slots</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PitchManagement;
