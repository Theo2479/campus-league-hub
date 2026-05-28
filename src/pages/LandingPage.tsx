import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Shield, Trophy, ArrowRight, Mail } from 'lucide-react';
import { OrganizerShowcase } from '@/components/landing/OrganizerShowcase';
import { TeamShowcase } from '@/components/landing/TeamShowcase';
import { RefereeShowcase } from '@/components/landing/RefereeShowcase';

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<'organizer' | 'team' | 'referee'>('organizer');

  const scrollToShowcase = (role: 'organizer' | 'team' | 'referee') => {
    setActiveRole(role);
    document.getElementById('platform-showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-gold selection:text-navy overflow-x-hidden font-sans">

      {/* Navbar */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy shadow-md">
            <Trophy className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SportingSystems</span>
        </div>
        <div>
          <Button
            onClick={() => navigate('/login')}
            className="bg-white/10 border border-white/20 hover:bg-white/20 text-white font-medium px-6 py-2 rounded-full backdrop-blur-md transition-all"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 bg-navy text-white">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/athletes_match.png"
            alt="Athletes playing a match"
            className="w-full h-full object-cover opacity-20 scale-105 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/95 to-navy"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              The All-in-One <br />
              <span className="text-gold">
                Ecosystem
              </span> <br />
              for Sports Leagues.
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 mb-8 leading-relaxed max-w-xl">
              Automate administration, effortlessly connect teams, organisers, and referees in one centralised platform built for modern sports.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Button
                onClick={() => navigate('/login')}
                className="bg-gold hover:bg-gold-dark text-navy font-bold text-lg px-8 py-6 rounded-full shadow-lg transition-all hover:scale-105"
              >
                Start Your League <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
                <div className="h-10 w-10 bg-gold/20 rounded-full flex items-center justify-center text-gold shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Interested in early access?</p>
                  <p className="text-sm text-slate-300">Contact Theo Jouas-Yosano at <br /><a href="mailto:23jouast@gmail.com" className="text-gold font-bold hover:underline">23jouast@gmail.com</a></p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block perspective-1000">
            <div className="relative transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0">
              <div className="absolute inset-0 bg-gold/10 blur-3xl -z-10 rounded-3xl"></div>
              <img
                src="/Screenshots/organizer/admin league overview.png"
                alt="SportingSystems Dashboard"
                className="w-full h-auto rounded-xl shadow-2xl border border-white/10 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholder Value Proposition */}
      <section className="py-24 px-6 relative z-10 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-navy">Built for Everyone on the Pitch</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">A unified platform that caters to the unique needs of every stakeholder in your sports league.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* For Organizers */}
            <div
              onClick={() => scrollToShowcase('organizer')}
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 hover:shadow-md hover:border-gold/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-2xl bg-navy/5 flex items-center justify-center mb-6 text-navy group-hover:bg-navy group-hover:text-gold transition-colors">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-navy">For Organizers</h3>
              <p className="text-slate-600 leading-relaxed">
                Automate your entire schedule. Generate fixtures, allocate pitches, and manage league tables without ever touching a spreadsheet again.
              </p>
            </div>

            {/* For Teams */}
            <div
              onClick={() => scrollToShowcase('team')}
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 hover:shadow-md hover:border-gold/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-2xl bg-navy/5 flex items-center justify-center mb-6 text-navy group-hover:bg-navy group-hover:text-gold transition-colors">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-navy">For Teams</h3>
              <p className="text-slate-600 leading-relaxed">
                A centralised hub for your squad. View upcoming fixtures and communicate seamlessly in one dedicated space.
              </p>
            </div>

            {/* For Referees */}
            <div
              onClick={() => scrollToShowcase('referee')}
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 hover:shadow-md hover:border-gold/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-2xl bg-navy/5 flex items-center justify-center mb-6 text-navy group-hover:bg-navy group-hover:text-gold transition-colors">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-navy">For Referees</h3>
              <p className="text-slate-600 leading-relaxed">
                Take control of your schedule. Submit availability dynamically, receive automated game assignments, and maintain privacy with centralised comms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Platform Showcase Hub */}
      <section id="platform-showcase" className="pt-24 pb-24 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center px-6">
          <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mb-4 text-navy">
            Explore the Platform in Action
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm lg:text-base">
            Select a role to see real in-app screenshots, dashboards, and live interactive workflows.
          </p>

          {/* Central Role Selector Tabs */}
          <div className="flex justify-center gap-2 mt-8 max-w-md mx-auto p-1 bg-slate-100 rounded-full">
            <button
              onClick={() => setActiveRole('organizer')}
              className={`flex-1 py-2.5 px-5 rounded-full text-xs lg:text-sm font-semibold tracking-wide transition-all ${activeRole === 'organizer'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-slate-500 hover:text-navy hover:bg-slate-200'
                }`}
            >
              Organizers
            </button>
            <button
              onClick={() => setActiveRole('team')}
              className={`flex-1 py-2.5 px-5 rounded-full text-xs lg:text-sm font-semibold tracking-wide transition-all ${activeRole === 'team'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-slate-500 hover:text-navy hover:bg-slate-200'
                }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveRole('referee')}
              className={`flex-1 py-2.5 px-5 rounded-full text-xs lg:text-sm font-semibold tracking-wide transition-all ${activeRole === 'referee'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-slate-500 hover:text-navy hover:bg-slate-200'
                }`}
            >
              Referees
            </button>
          </div>
        </div>

        {/* Dynamic Showcase View */}
        <div className="relative mt-12">
          {activeRole === 'organizer' && <OrganizerShowcase />}
          {activeRole === 'team' && <TeamShowcase />}
          {activeRole === 'referee' && <RefereeShowcase />}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 relative z-10 bg-slate-50">
        <div className="max-w-5xl mx-auto bg-navy rounded-[2.5rem] p-12 lg:p-20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/20 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/10 rounded-full blur-[80px]"></div>

          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white">Stop managing leagues in spreadsheets.</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Upgrade to SportingSystems today and experience the future of sports administration. Less admin work, more time for the game.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-gold hover:bg-gold-dark text-navy font-bold text-xl px-10 py-7 rounded-full shadow-xl transition-all hover:scale-105"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-200 bg-white">
        <p>© 2026 SportingSystems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
