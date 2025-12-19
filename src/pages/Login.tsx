import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Trophy } from 'lucide-react';

const roles: { role: UserRole; label: string; description: string; icon: React.ComponentType<{ className?: string }>; path: string }[] = [
  {
    role: 'admin',
    label: 'Administrator',
    description: 'Manage league operations, approve requests, and handle emergencies.',
    icon: Shield,
    path: '/admin',
  },
  {
    role: 'referee',
    label: 'Referee',
    description: 'View availability, sign up for games, and track your stats.',
    icon: Users,
    path: '/referee',
  },
  {
    role: 'captain',
    label: 'Team Captain',
    description: 'Manage fixtures, submit scores, and organize friendlies.',
    icon: Trophy,
    path: '/captain',
  },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole, path: string) => {
    login(role);
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-navy/5 via-transparent to-gold/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl" />
      </div>

      {/* Logo & Title */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-navy shadow-premium-lg">
          <Trophy className="h-10 w-10 text-gold" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          University Intramural
        </h1>
        <p className="mt-2 text-xl font-medium text-gold">
          Football League
        </p>
        <p className="mt-4 text-muted-foreground">
          Select a role to explore the dashboard
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {roles.map((item, index) => (
          <Card
            key={item.role}
            variant="elevated"
            className="group cursor-pointer hover:border-gold/50 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleLogin(item.role, item.path)}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-navy text-gold transition-transform duration-300 group-hover:scale-110">
                <item.icon className="h-8 w-8" />
              </div>
              <CardTitle className="text-lg">{item.label}</CardTitle>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="gold" className="w-full">
                Demo Login
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-12 text-sm text-muted-foreground">
        © 2024 University Intramural Sports. All rights reserved.
      </p>
    </div>
  );
};

export default Login;
