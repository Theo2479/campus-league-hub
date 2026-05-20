import React, { useState } from 'react';
import { LayoutGrid, CalendarRange, UserCheck, BellRing, Check, ChevronRight } from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  primaryImage: string;
  hasStages?: boolean;
  highlights: string[];
}

export const OrganizerShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('management');
  const [activeStage, setActiveStage] = useState<number>(1);

  const features: FeatureItem[] = [
    {
      id: 'management',
      title: 'Centralized Management',
      subtitle: 'All Leagues, Divisions & Teams in One Place',
      description: 'Manage teams, leagues, and competitions from a single dashboard where all participant data is integrated.',
      icon: LayoutGrid,
      primaryImage: '/Screenshots/organizer/admin league overview.png',
      highlights: [
        'Create and organise multiple leagues with custom divisions',
        'View all registered teams per division at a glance',
        'Full admin sidebar: Teams, Referees, Captains, Approvals & more'
      ]
    },
    {
      id: 'scheduling',
      title: 'Automated Scheduling',
      subtitle: 'One-Click Full-Season Fixture Generation',
      description: 'Generate full-season fixtures and allocate pitches automatically for any number of games.',
      icon: CalendarRange,
      primaryImage: '/Screenshots/organizer/admin league overview.png',
      highlights: [
        'Generate balanced fixtures for entire divisions with one click',
        'Automatic pitch allocation across all scheduled time slots',
        'Add new divisions and leagues on-the-fly as your program grows'
      ]
    },
    {
      id: 'refereeing',
      title: 'Smart Referee Allocation',
      subtitle: 'Automated 3-Stage Assignment Algorithm',
      description: 'The system automatically assigns referees to matches, ensuring fair distribution while actively preventing double-bookings.',
      icon: UserCheck,
      hasStages: true,
      primaryImage: '/Screenshots/organizer/admin ref allocation stage 1.png',
      highlights: [
        'Open availability windows for referees to self-select time slots',
        'Live coverage overview showing demand vs. available officials',
        'One-click allocation with reliability scoring and conflict prevention'
      ]
    },
    {
      id: 'sync',
      title: 'Real-Time Synchronisation',
      subtitle: 'Instant Notifications for All Changes',
      description: 'Any changes made to fixtures, leagues, or schedules automatically and instantly notify the affected teams and referees.',
      icon: BellRing,
      primaryImage: '/Screenshots/organizer/admin notif of dropout and pick up.png',
      highlights: [
        'Instant alerts when a referee drops out of a match',
        'Automatic notification when replacement coverage is found',
        'Postponement requests from captains appear immediately'
      ]
    }
  ];

  const currentFeature = features.find(f => f.id === activeTab) || features[0];

  const getDisplayImage = () => {
    if (activeTab === 'refereeing') {
      if (activeStage === 1) return '/Screenshots/organizer/admin ref allocation stage 1.png';
      if (activeStage === 2) return '/Screenshots/organizer/admin ref allocation stage 2 .png';
      return '/Screenshots/organizer/admin ref allocation stage 3 .png';
    }
    return currentFeature.primaryImage;
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setActiveStage(1);
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

                        {feature.hasStages && (
                          <div className="mt-4 bg-black/20 p-3 rounded-xl border border-white/10" onClick={e => e.stopPropagation()}>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-2">
                              Allocation Stages:
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((stage) => (
                                <button
                                  key={stage}
                                  onClick={(e) => { e.stopPropagation(); setActiveStage(stage); }}
                                  className={`py-2 px-1 text-center rounded-lg text-xs font-medium transition-all ${
                                    activeStage === stage
                                      ? 'bg-gold text-navy font-bold shadow-md'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                                  }`}
                                >
                                  Stage {stage}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 text-[11px] text-gold-light font-medium">
                              {activeStage === 1 && '• Open availability window for referees to sign up'}
                              {activeStage === 2 && '• Close sign-ups & check coverage gaps'}
                              {activeStage === 3 && '• Run allocation algorithm & view results'}
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
                    sportingsystems.com/admin/{activeTab === 'refereeing' ? `allocation/stage-${activeStage}` : activeTab}
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
                  {activeTab === 'management' && 'League & Division Management — organise teams, divisions, and competitions from one dashboard.'}
                  {activeTab === 'scheduling' && 'One-click "Generate Fixtures" for full-season scheduling across all divisions.'}
                  {activeTab === 'refereeing' && `Referee Allocation — Stage ${activeStage} of 3: ${activeStage === 1 ? 'Availability window open, referees signing up for time slots.' : activeStage === 2 ? 'Sign-ups closed, reviewing coverage gaps across all time slots.' : 'Final allocation results — referees assigned to 6 fixtures with reliability scores.'}`}
                  {activeTab === 'sync' && 'Real-time notifications: referee dropouts, coverage pickups, and postponement requests.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
