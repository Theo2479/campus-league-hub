import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Shield, Zap, Bell, Trophy, ArrowRight, Activity, MessageSquare } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-charcoal text-white selection:bg-electric-green selection:text-charcoal overflow-x-hidden font-sans">

      {/* Navbar */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-green text-charcoal shadow-[0_0_15px_rgba(0,255,102,0.5)]">
            <Trophy className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SportingSystems</span>
        </div>
        <div>
          <Button
            onClick={() => navigate('/login')}
            className="bg-transparent border border-white/20 hover:bg-white/10 text-white font-medium px-6 py-2 rounded-full backdrop-blur-md transition-all"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/athletes_match.png"
            alt="Athletes playing a match"
            className="w-full h-full object-cover opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/95 to-charcoal"></div>
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-bright-blue/20 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-electric-green/10 rounded-full blur-[100px] mix-blend-screen"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-electric-green animate-pulse"></span>
              <span className="text-sm font-medium text-white/80">Next-Gen League Management</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              The All-in-One <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bright-blue to-electric-green">
                Ecosystem
              </span> <br />
              for Sports Leagues.
            </h1>
            <p className="text-lg lg:text-xl text-white/60 mb-8 leading-relaxed max-w-xl">
              Automate administration, effortlessly connect teams, organizers, and referees in one centralized platform built for modern sports.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="bg-electric-green hover:bg-[#00e65c] text-charcoal font-bold text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(0,255,102,0.3)] transition-all hover:scale-105"
              >
                Start Your League <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-lg px-8 py-6 rounded-full backdrop-blur-md transition-all"
              >
                Explore Features
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block perspective-1000">
            <div className="relative transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-bright-blue/20 to-electric-green/20 blur-3xl -z-10 rounded-3xl"></div>
              <img
                src="/dashboard_mockup.png"
                alt="SportingSystems Dashboard"
                className="w-full h-auto rounded-xl shadow-2xl border border-white/10 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholder Value Proposition */}
      <section className="py-24 px-6 relative z-10 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built for Everyone on the Pitch</h2>
            <p className="text-white/60 max-w-2xl mx-auto">A unified platform that caters to the unique needs of every stakeholder in your sports league.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* For Organizers */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:bg-white/[0.05] transition-colors group">
              <div className="h-14 w-14 rounded-2xl bg-bright-blue/20 flex items-center justify-center mb-6 text-bright-blue group-hover:scale-110 transition-transform">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">For Organizers</h3>
              <p className="text-white/60 leading-relaxed">
                Automate your entire schedule. Generate fixtures, allocate pitches, and manage league tables without ever touching a spreadsheet again.
              </p>
            </div>

            {/* For Teams */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:bg-white/[0.05] transition-colors group">
              <div className="h-14 w-14 rounded-2xl bg-electric-green/20 flex items-center justify-center mb-6 text-electric-green group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">For Teams</h3>
              <p className="text-white/60 leading-relaxed">
                A centralized hub for your squad. View upcoming fixtures and communicate seamlessly in one dedicated space.
              </p>
            </div>

            {/* For Referees */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:bg-white/[0.05] transition-colors group">
              <div className="h-14 w-14 rounded-2xl bg-vibrant-orange/20 flex items-center justify-center mb-6 text-vibrant-orange group-hover:scale-110 transition-transform">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">For Referees</h3>
              <p className="text-white/60 leading-relaxed">
                Take control of your schedule. Submit availability dynamically, receive automated game assignments, and maintain privacy with centralized comms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcases */}
      <section id="features" className="py-24 px-6 relative z-10 bg-charcoal overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-32">

          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-bright-blue/10 blur-[80px] rounded-full"></div>
              <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-bright-blue" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Real-Time Sync</div>
                      <div className="text-xs text-white/50">System Status</div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-electric-green/20 text-electric-green text-xs font-medium rounded-full">Online</span>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="h-8 w-8 rounded-lg bg-white/10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-1/3 bg-white/20 rounded"></div>
                        <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-bright-blue font-semibold mb-4">
                <Activity className="h-5 w-5" /> Lightning Fast Updates
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">Everything in Sync. Instantly.</h2>
              <p className="text-lg text-white/60 leading-relaxed">
                When a score is updated, a fixture changes, or a pitch is reallocated, everyone knows immediately. Our real-time architecture ensures that teams, referees, and fans are always looking at the most up-to-date information, eliminating confusion and missed games.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-vibrant-orange font-semibold mb-4">
                <Bell className="h-5 w-5" /> Smart Notifications
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">Automated Alerts & Communication.</h2>
              <p className="text-lg text-white/60 leading-relaxed mb-6">
                Say goodbye to chasing people down. SportingSystems automatically alerts referees of new assignments, reminds captains of upcoming fixtures, and notifies everyone of emergency cancellations.
              </p>
              <ul className="space-y-4 text-white/70">
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-vibrant-orange/20 flex items-center justify-center text-vibrant-orange">✓</div>
                  Instant match assignment alerts for referees
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-vibrant-orange/20 flex items-center justify-center text-vibrant-orange">✓</div>
                  Automated kickoff reminders for teams
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-vibrant-orange/20 flex items-center justify-center text-vibrant-orange">✓</div>
                  Centralized, private group chats
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-vibrant-orange/10 blur-[80px] rounded-full"></div>
              <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                  <MessageSquare className="h-6 w-6 text-white/60" />
                  <div className="font-semibold">Referee Comms Group</div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm p-4 w-[85%] border border-white/5">
                    <p className="text-sm text-white/80">Automated Alert: Match #104 requires a referee. Saturday 2PM, Pitch A.</p>
                    <span className="text-[10px] text-white/40 mt-2 block">10:42 AM</span>
                  </div>
                  <div className="bg-vibrant-orange/20 rounded-2xl rounded-tr-sm p-4 w-[75%] ml-auto border border-vibrant-orange/30">
                    <p className="text-sm text-white/90">I can take this match. Claiming now.</p>
                    <span className="text-[10px] text-white/50 mt-2 block text-right">10:45 AM</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm p-4 w-[85%] border border-white/5">
                    <p className="text-sm text-electric-green/90 font-medium">System: Match #104 assigned to John D.</p>
                    <span className="text-[10px] text-white/40 mt-2 block">10:45 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-bright-blue/20 via-charcoal to-electric-green/20 rounded-[2.5rem] p-12 lg:p-20 text-center border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-bright-blue/30 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-electric-green/20 rounded-full blur-[80px]"></div>

          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">Stop managing leagues in spreadsheets.</h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Upgrade to SportingSystems today and experience the future of sports administration. Less admin work, more time for the game.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-electric-green hover:bg-[#00e65c] text-charcoal font-bold text-xl px-10 py-7 rounded-full shadow-[0_0_30px_rgba(0,255,102,0.4)] transition-all hover:scale-105"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-white/40 text-sm border-t border-white/10 bg-charcoal">
        <p>© 2026 SportingSystems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
