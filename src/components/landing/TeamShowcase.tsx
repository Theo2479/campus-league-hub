import React, { useState } from 'react';
import { LayoutDashboard, Trophy, MessageSquare, Bell, CalendarDays, Check, ChevronRight } from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  primaryImage: string;
  altImage?: string;
  highlights: string[];
}

export const TeamShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAltImage, setShowAltImage] = useState(false);

  const features: FeatureItem[] = [
    {
      id: 'dashboard',
      title: 'Captain Dashboard',
      subtitle: 'Complete Overview of Your Squad',
      description: 'Captains get a unified view of their team\'s season. See upcoming fixtures, recent results, and your current position in the league table.',
      icon: LayoutDashboard,
      primaryImage: '/Screenshots/team/cap dashboard 1.png',
      altImage: '/Screenshots/team/cap dashboard 2.png',
      highlights: [
        'Quick glance at your next 3 fixtures',
        'Live, auto-updating league standings',
        'Interactive match history and form guide'
      ]
    },
    {
      id: 'communication',
      title: 'Centralised Communication',
      subtitle: 'In-App Chat for Every Fixture',
      description: 'Stop relying on scattered text messages. Every fixture automatically generates a dedicated chat connecting the two captains and the assigned referee.',
      icon: MessageSquare,
      primaryImage: '/Screenshots/team/chats 1.png',
      altImage: '/Screenshots/team/chats 2 .png',
      highlights: [
        'Dedicated chat room auto-created for every match',
        'Direct, private line to the referee without sharing phone numbers',
        'Easily confirm kick-off times and kit colours'
      ]
    },
    {
      id: 'postponements',
      title: 'Easy Postponements',
      subtitle: 'Request Changes with Zero Friction',
      description: 'Need to reschedule? Submit a postponement request directly through the app. The opposition and organizer are notified instantly.',
      icon: CalendarDays,
      primaryImage: '/Screenshots/team/postponemnet cap pic.png',
      highlights: [
        'Formalised postponement requests attached to fixtures',
        'Provide a reason for transparency',
        'Automatic alert sent to the league organiser for approval'
      ]
    },
    {
      id: 'notifications',
      title: 'Live Fixture Updates',
      subtitle: 'Stay Informed When Things Change',
      description: 'If a referee drops out, a pitch changes, or a game is cancelled, team captains receive immediate notifications on their dashboard.',
      icon: Bell,
      primaryImage: '/Screenshots/team/ref drop out cap.png',
      highlights: [
        'Clear dashboard banners for urgent alerts',
        'Immediate notification if your assigned referee drops out',
        'Automatic update when a replacement is found'
      ]
    }
  ];

  const currentFeature = features.find(f => f.id === activeTab) || features[0];

  const getDisplayImage = () => {
    if (showAltImage && currentFeature.altImage) {
      return currentFeature.altImage;
    }
    return currentFeature.primaryImage;
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setShowAltImage(false);
  };

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
                  onClick={() => handleTabChange(feature.id)}
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

                        {/* Interactive toggle for features with alternative views */}
                        {feature.altImage && (
                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-white/60 font-medium">Explore Feature:</span>
                            <div className="flex bg-black/20 rounded-lg p-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowAltImage(false); }}
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${!showAltImage ? 'bg-gold text-navy shadow-sm font-bold' : 'text-white/60 hover:text-white'}`}
                              >
                                {feature.id === 'dashboard' ? 'Overview' : 'Inbox'}
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowAltImage(true); }}
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${showAltImage ? 'bg-gold text-navy shadow-sm font-bold' : 'text-white/60 hover:text-white'}`}
                              >
                                {feature.id === 'dashboard' ? 'League Table' : 'Match Chat'}
                              </button>
                            </div>
                          </div>
                        )}
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
                    sportingsystems.com/captain/{activeTab}
                  </span>
                </div>

                {/* Screenshot viewport */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#fafafa]">
                  <img
                    key={getDisplayImage()}
                    src={getDisplayImage()}
                    alt={currentFeature.title}
                    className="w-full h-full object-contain object-top"
                  />
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  {activeTab === 'dashboard' && !showAltImage && 'Captain Dashboard — quick access to upcoming fixtures and team management.'}
                  {activeTab === 'dashboard' && showAltImage && 'League Table view — see exactly where your team stands.'}
                  {activeTab === 'communication' && !showAltImage && 'Chat Inbox — all your match-specific chats organised in one place.'}
                  {activeTab === 'communication' && showAltImage && 'Inside a match chat — talk directly with the referee and opposition captain.'}
                  {activeTab === 'postponements' && 'Postponement requests attached directly to the specific fixture.'}
                  {activeTab === 'notifications' && 'Live alert on the dashboard notifying the captain that their referee dropped out.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
