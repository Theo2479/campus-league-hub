import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Calendar, User as UserIcon, Lock, Unlock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api';

interface AllocationResult {
    fixture_id: number;
    fixture: string;
    date: string;
    time: string;
    referee: string;
    score: number;
}

interface CoverageSlot {
    date: string;
    time: string;
    game_count: number;
    ref_count: number;
}

const AdminAllocation = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [coverageData, setCoverageData] = useState<CoverageSlot[]>([]);
    const [checkingInterest, setCheckingInterest] = useState(false);
    const [results, setResults] = useState<AllocationResult[]>([]);
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [windowLoading, setWindowLoading] = useState(true);

    useEffect(() => {
        fetchWindowStatus();
    }, []);

    const fetchWindowStatus = async () => {
        try {
            const res = await apiFetch('/api/admin/availability-window');
            if (res.ok) {
                const data = await res.json();
                if (data.startDate) setStartDate(data.startDate);
                if (data.endDate) setEndDate(data.endDate);
                setIsWindowOpen(data.isOpen);
            }
        } catch (error) {
            console.error('Failed to fetch window status', error);
        } finally {
            setWindowLoading(false);
        }
    };

    const handleWindowToggle = async (open: boolean) => {
        if (!startDate || !endDate) {
            toast.error('Please select a date range first');
            return;
        }
        setWindowLoading(true);
        try {
            const res = await apiFetch('/api/admin/availability-window', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    isOpen: open
                })
                
            });
            if (res.ok) {
                setIsWindowOpen(open);
                toast.success(open ? 'Availability form OPENED to referees' : 'Availability form CLOSED');
            }
        } catch (error) {
            toast.error('Failed to update window status');
        } finally {
            setWindowLoading(false);
        }
    };

    const handleCheckCoverage = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select a date range');
            return;
        }
        setCheckingInterest(true);
        try {
            const response = await apiFetch('/api/admin/referee-coverage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
                
            });

            if (response.ok) {
                const data = await response.json();
                setCoverageData(data.slots || []);
                if (data.slots && data.slots.length === 0) {
                    toast.info('No scheduled games found in this period');
                }
            } else {
                toast.error('Failed to fetch coverage data');
            }
        } catch (error) {
            console.error('Failed to fetch coverage:', error);
            toast.error('Network error');
        } finally {
            setCheckingInterest(false);
        }
    };

    const handleAllocate = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select a date range');
            return;
        }

        if (isWindowOpen) {
            const confirmClose = window.confirm("Allocation will CLOSE the availability form. Continue?");
            if (!confirmClose) return;
        }

        setLoading(true);
        try {
            // 1. Close window
            await apiFetch('/api/admin/availability-window', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isOpen: false })
                
            });
            setIsWindowOpen(false);

            // 2. Run allocation
            const response = await apiFetch('/api/admin/allocate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate,
                    endDate
                })
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data.allocations);
                toast.success(data.message);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Allocation failed');
            }
        } catch (error) {
            console.error('Allocation failed:', error);
            toast.error(error instanceof Error ? error.message : 'Allocation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <PageHeader
                title="Referee Allocation"
                description="Manage availability windows, check coverage, and allocate games"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle>Controls</CardTitle>
                            <CardDescription>Manage the availability lifecycle</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 border-t">
                                <Label className="mb-2 block">Availability Status</Label>
                                {isWindowOpen ? (
                                    <Alert className="mb-4 border-success bg-success/10 text-success">
                                        <Unlock className="h-4 w-4" />
                                        <AlertTitle>OPEN</AlertTitle>
                                        <AlertDescription>Referees can sign up.</AlertDescription>
                                    </Alert>
                                ) : (
                                    <Alert className="mb-4 border-destructive bg-destructive/10 text-destructive">
                                        <Lock className="h-4 w-4" />
                                        <AlertTitle>CLOSED</AlertTitle>
                                        <AlertDescription>Sign-ups disabled.</AlertDescription>
                                    </Alert>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={isWindowOpen ? "outline" : "default"}
                                        onClick={() => handleWindowToggle(true)}
                                        disabled={windowLoading || isWindowOpen}
                                        className="w-full"
                                    >
                                        Open Form
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleWindowToggle(false)}
                                        disabled={windowLoading || !isWindowOpen}
                                        className="w-full text-destructive hover:bg-destructive/10"
                                    >
                                        Close Form
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleCheckCoverage}
                                    disabled={checkingInterest}
                                >
                                    {checkingInterest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Live Coverage'}
                                </Button>
                                <Button
                                    variant="gold"
                                    onClick={handleAllocate}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Allocation'}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-1">
                                    Running allocation will automatically close the availability form.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle>
                                {results.length > 0 ? 'Final Allocation Results' : 'Referee Coverage Overview'}
                            </CardTitle>
                            <CardDescription>
                                {results.length > 0
                                    ? `Successfully assigned referees to ${results.length} fixtures.`
                                    : 'Live view of game demand vs referee availability per time slot.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {results.length > 0 ? (
                                <div className="space-y-4">
                                    {results.map((result, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                            <div>
                                                <p className="font-semibold">{result.fixture}</p>
                                                <p className="text-sm text-muted-foreground">{result.date} at {result.time}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <UserIcon className="h-4 w-4 text-gold" />
                                                    <span className="font-medium">{result.referee}</span>
                                                </div>
                                                <Badge variant="secondary" className="mt-1">Rel Score: {result.score}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : coverageData.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground mb-2 px-4">
                                        <div className="col-span-2">Time Slot</div>
                                        <div>Games</div>
                                        <div>Available refs</div>
                                    </div>
                                    {coverageData.map((slot, idx) => {
                                        const dateLabel = format(new Date(slot.date), 'EEE, MMM d');
                                        const isShortage = slot.ref_count < slot.game_count;
                                        const isSurplus = slot.ref_count > slot.game_count;
                                        const isExact = slot.ref_count === slot.game_count;

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{dateLabel}</span>
                                                    <span className="text-sm text-gold">{slot.time}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{slot.game_count}</span>
                                                </div>

                                                <div className="flex items-center gap-2 w-24">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <Badge
                                                        variant={isShortage ? "destructive" : "secondary"}
                                                        className={isSurplus ? "bg-success/10 text-success hover:bg-success/20 border-success/20" : ""}
                                                    >
                                                        {slot.ref_count}
                                                    </Badge>
                                                </div>

                                                <div className="w-8 flex justify-center">
                                                    {isShortage && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                                    {(isSurplus || isExact) && slot.game_count > 0 && <CheckCircle className="h-4 w-4 text-success" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="flex justify-center mb-4">
                                        <Users className="h-12 w-12 opacity-20" />
                                    </div>
                                    <p className="text-lg">No coverage data loaded</p>
                                    <p className="text-sm mt-2">Select dates and click "Check Live Coverage" to see availability vs demand.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminAllocation;
