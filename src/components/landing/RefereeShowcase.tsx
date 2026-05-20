import React, { useState } from 'react';
import { LayoutDashboard, CalendarCheck, MessageSquare, AlertTriangle, Check, ChevronRight } from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  primaryImage: string;
  highlights: string[];
}

export const RefereeShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const features: FeatureItem[] = [
    {
      id: 'dashboard',
      title: 'Referee Dashboard',
      subtitle: 'Your Matches & Stats at a Glance',
      description: 'A clean, dedicated hub for referees to see their upcoming assignments, track their reffed games, and access quick actions.',
      icon: LayoutDashboard,
      primaryImage: '/Screenshots/referee/ref dashboad.png',
      highlights: [
        'Clear overview of your assigned games',
        'Quick access to match chats and reports',
        'Track total games refereed across the season'
      ]
    },
    {
      id: 'availability',
      title: 'Dynamic Availability',
      subtitle: 'Pick Up Games That Fit Your Schedule',
      description: 'When the organiser opens an availability window, referees can view all unassigned matches and put themselves forward for the games they want to officiate.',
      icon: CalendarCheck,
      primaryImage: '/Screenshots/referee/ref pick up free game.png',
      highlights: [
        'View a list of all matches requiring a referee',
        'Simply click to request assignment to a fixture',
        'Works seamlessly with the organiser\'s allocation algorithm'
      ]
    },
    {
      id: 'communication',
      title: 'Secure Match Chats',
      subtitle: 'Communicate Without Sharing Contact Info',
      description: 'Join the dedicated chat for your assigned matches to coordinate with team captains. Your personal phone number remains completely private.',
      icon: MessageSquare,
      primaryImage: '/Screenshots/referee/ref chats.png',
      highlights: [
        'Direct access to both team captains',
        'Perfect for confirming pitch locations or kick-off delays',
        'Maintains professional boundaries and privacy'
      ]
    },
    {
      id: 'dropouts',
      title: 'Hassle-Free Dropouts',
      subtitle: 'Automated Re-Allocation Process',
      description: 'If you can no longer make a game, simply drop out via the app. The system immediately notifies the organiser and captains, and opens the slot for other referees.',
      icon: AlertTriangle,
      primaryImage: '/Screenshots/referee/ref games drop out option.png',
      highlights: [
        'One-click dropout button on your assigned games',
        'Instantly triggers alerts to affected teams',
        'Automatically adds the game back to the open availability pool'
      ]
    }
  ];

  const currentFeature = features.find(f => f.id === activeTab) || features[0];

  return (
    <div className="bg-transparent text-slate-900 relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left: Dynamic Tabs */}
          <div className="lg:col-span-5 space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === activeTab;

              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 group relative overflow-hidden ${
                    isActive
                      ? 'bg-navy border-navy shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-white'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold to-gold-light"></div>
                  )}

                  <div className={`p-3 rounded-xl transition-all duration-300 shrink-0 ${
                    isActive ? 'bg-white/10 text-gold' : 'bg-slate-100 text-slate-400 group-hover:text-navy'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-lg transition-colors ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-navy'}`}>
                        {feature.title}
                      </span>
                      <ChevronRight className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                        isActive ? 'text-gold translate-x-0' : 'text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1'
                      }`} />
                    </div>
                    <p className={`text-sm mt-1 font-medium transition-colors ${isActive ? 'text-gold-light' : 'text-slate-500'}`}>
                      {feature.subtitle}
                    </p>
                    {isActive && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        <p className="text-sm text-white/80 leading-relaxed">{feature.description}</p>
                        <div className="space-y-2">
                          {feature.highlights.map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-white/90">
                              <Check className="h-4 w-4 text-gold shrink-0" />
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Screenshot Mockup */}
          <div className="lg:col-span-7 lg:sticky lg:top-8">
            <div className="relative group/mockup">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                {/* Browser Title Bar */}
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-300"></span>
                  <span className="h-3 w-3 rounded-full bg-slate-300"></span>
                  <span className="h-3 w-3 rounded-full bg-slate-300"></span>
                  <span className="text-xs text-slate-500 ml-4 font-mono font-medium tracking-wide bg-white px-3 py-1 rounded-md border border-slate-200">
                    sportingsystems.com/referee/{activeTab}
                  </span>
                </div>

                {/* Screenshot viewport */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#fafafa]">
                  <img
                    key={currentFeature.primaryImage}
                    src={currentFeature.primaryImage}
                    alt={currentFeature.title}
                    className="w-full h-full object-contain object-top"
                  />
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  {activeTab === 'dashboard' && 'Referee Dashboard — see your upcoming matches and sign-up windows.'}
                  {activeTab === 'availability' && 'Available Games list — click to request assignment to open fixtures.'}
                  {activeTab === 'communication' && 'Match Chat — coordinate directly with the two team captains.'}
                  {activeTab === 'dropouts' && 'Managing your schedule — drop out of a game with a single click if needed.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
