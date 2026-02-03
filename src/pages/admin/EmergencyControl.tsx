import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, CloudRain, Wind, Snowflake, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { format } from 'date-fns';
import { EmergencyCancelDialog } from '@/components/admin/EmergencyCancelDialog';

const emergencyReasons = [
  { id: 'weather-rain', label: 'Heavy Rain/Flooding', icon: CloudRain },
  { id: 'weather-wind', label: 'High Winds', icon: Wind },
  { id: 'weather-snow', label: 'Snow/Ice', icon: Snowflake },
  { id: 'other', label: 'Other Emergency', icon: Zap },
];

const EmergencyControl = () => {
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [cancelledDate, setCancelledDate] = useState<Date | null>(null);
  const [cancelCount, setCancelCount] = useState(0);

  const handleEmergencySuccess = (count: number, date: Date) => {
    setEmergencyTriggered(true);
    setCancelCount(count);
    setCancelledDate(date);
    toast.error(
      `EMERGENCY CANCELLATION ACTIVE - ${count} games cancelled for ${format(date, 'MMM do')}.`,
      { duration: 5000 }
    );
  };

  const handleClearEmergency = () => {
    setEmergencyTriggered(false);
    setCancelledDate(null);
    toast.success('Emergency status cleared. Normal operations resumed.');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Emergency Control Center"
        description="Mass cancellation for severe weather or emergencies"
      />

      {emergencyTriggered ? (
        <Card variant="urgent" className="max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20 animate-pulse">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-destructive mb-2">
              Emergency Cancellation Active
            </h2>
            <p className="text-sm text-muted-foreground">
              All scheduled games for <strong>{cancelledDate ? format(cancelledDate, 'MMMM do, yyyy') : 'selected date'}</strong> have been cancelled ({cancelCount} total). Teams, referees, and staff have been notified via email and SMS.
            </p>
            <Button variant="outline" size="lg" onClick={handleClearEmergency}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Clear Emergency Status
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 max-w-4xl">
          {/* Emergency Button Card */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Emergency Cancellation
              </CardTitle>
              <CardDescription>
                Use this only for genuine emergencies. This will immediately cancel all scheduled
                games and notify everyone in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                Clicking the button below will open the emergency dialog where you can select a specific date and reason for mass cancellation.
              </div>

              {/* The Big Red Button */}
              <Button
                variant="danger"
                size="xl"
                className="w-full"
                onClick={() => setShowDialog(true)}
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Cancel Games by Date
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card variant="gold">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-navy shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Before You Cancel</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Verify the emergency situation with facility management</li>
                    <li>• Consider partial cancellations if only some venues are affected</li>
                    <li>• Have a plan for rescheduling impacted games</li>
                    <li>• This action is logged for audit purposes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <EmergencyCancelDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={handleEmergencySuccess}
      />
    </DashboardLayout>
  );
};

export default EmergencyControl;
