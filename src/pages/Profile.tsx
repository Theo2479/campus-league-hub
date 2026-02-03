import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
// Line 8: import { User, Mail, Shield, Bell, Lock, Save } from 'lucide-react';
// Line 10: import { Switch } from '@/components/ui/switch';
// I should remove unused imports. Mail, Bell. Switch is also unused now.

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  const handleSave = () => {
    toast.success('Profile settings saved successfully');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Profile Settings"
        description="Manage your account and preferences"
      />

      <div className="grid gap-6 max-w-3xl">
        {/* Personal Information */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-gold" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user.name} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gold" />
              Security
            </CardTitle>
            <CardDescription>Manage your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card variant="navy">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold">
                <Shield className="h-6 w-6 text-navy" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gold">
                  {user.role === 'admin'
                    ? 'Administrator Account'
                    : user.role === 'referee'
                      ? 'Referee Account'
                      : 'Team Captain Account'}
                </p>
                <p className="text-sm text-sidebar-foreground">
                  Member since January 2024
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="gold" size="lg" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
