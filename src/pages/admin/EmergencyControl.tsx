import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, CloudRain, Wind, Snowflake, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const emergencyReasons = [
  { id: 'weather-rain', label: 'Heavy Rain/Flooding', icon: CloudRain },
  { id: 'weather-wind', label: 'High Winds', icon: Wind },
  { id: 'weather-snow', label: 'Snow/Ice', icon: Snowflake },
  { id: 'other', label: 'Other Emergency', icon: Zap },
];

const EmergencyControl = () => {
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const handleEmergencyCancel = () => {
    setEmergencyTriggered(true);
    toast.error(
      `EMERGENCY CANCELLATION TRIGGERED - All scheduled games cancelled. Notifications sent to all teams and referees.`,
      { duration: 5000 }
    );
  };

  const handleClearEmergency = () => {
    setEmergencyTriggered(false);
    setSelectedReason(null);
    setCustomMessage('');
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
            <p className="text-muted-foreground mb-6">
              All scheduled games have been cancelled. Teams, referees, and staff have been notified via email and SMS.
            </p>
            <div className="bg-secondary/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong>Reason:</strong>{' '}
                {selectedReason
                  ? emergencyReasons.find(r => r.id === selectedReason)?.label
                  : 'Manual trigger'}
              </p>
              {customMessage && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Message:</strong> {customMessage}
                </p>
              )}
            </div>
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
              {/* Reason Selection */}
              <div className="space-y-3">
                <Label>Select Reason (Optional)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {emergencyReasons.map(reason => (
                    <button
                      key={reason.id}
                      onClick={() =>
                        setSelectedReason(selectedReason === reason.id ? null : reason.id)
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                        selectedReason === reason.id
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <reason.icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{reason.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Additional Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add any additional information for teams and referees..."
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* The Big Red Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="danger" size="xl" className="w-full">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Cancel All Games
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Confirm Emergency Cancellation
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>This will immediately:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Cancel ALL scheduled games for today and tomorrow</li>
                        <li>Send email notifications to all team captains</li>
                        <li>Send SMS alerts to all registered referees</li>
                        <li>Update the public schedule</li>
                      </ul>
                      <p className="font-medium mt-4">
                        This action should only be used for severe weather or genuine emergencies.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEmergencyCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Confirm Emergency Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
    </DashboardLayout>
  );
};

export default EmergencyControl;
