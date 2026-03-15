import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      // Navigation is handled by the protected route wrapper or we can redirect based on role here
      // For now, let's just go to the dashboard which should redirect based on role
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
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
          Sporting Systems
        </h1>
        <p className="mt-2 text-xl font-medium text-gold">
          League Management
        </p>
      </div>

      {/* Login Form */}
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-navy hover:bg-navy/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Contact your league administrator for login credentials</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-12 text-sm text-muted-foreground">
        Theo Jouas-Yosano beta tester.
      </p>
    </div>
  );
};

export default Login;
