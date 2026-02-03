import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';

interface EmergencyCancelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (count: number, date: Date) => void;
}

const emergencyReasons = [
    { id: 'weather-rain', label: 'Heavy Rain/Flooding' },
    { id: 'weather-wind', label: 'High Winds' },
    { id: 'weather-snow', label: 'Snow/Ice' },
    { id: 'maintenance', label: 'Venue Maintenance' },
    { id: 'other', label: 'Other Emergency' },
];

export function EmergencyCancelDialog({
    open,
    onOpenChange,
    onSuccess,
}: EmergencyCancelDialogProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [reason, setReason] = useState<string>('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handlePreSubmit = () => {
        if (!date) {
            toast.error('Please select a date');
            return;
        }
        if (!reason) {
            toast.error('Please select a reason');
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        if (!date) return;

        setLoading(true);
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            const res = await fetch('/api/admin/fixtures/cancel-day', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: formattedDate,
                    reason,
                    message,
                }),
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to cancel games');
            }

            setShowConfirm(false);
            onOpenChange(false);
            onSuccess(data.count, date);

            // Reset form
            setReason('');
            setMessage('');
            setDate(new Date());

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Emergency Cancellation
                        </DialogTitle>
                        <DialogDescription>
                            Cancel all games for a specific day due to emergency or weather.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Date to Cancel</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>Reason</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {emergencyReasons.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Additional Message (Optional)</Label>
                            <Textarea
                                placeholder="Details for teams..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handlePreSubmit}>
                            Proceed to Confirmation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will cancel <strong>ALL</strong> scheduled games on{' '}
                            {date && format(date, 'MMMM do, yyyy')}.
                            <br />
                            <br />
                            Teams and referees will be notified immediately. This action cannot be easily undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirm();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Cancellation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
