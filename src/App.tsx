import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TripProvider, useTrip } from './context/TripContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { TripGate } from './components/trip/TripGate';
import { BottomTabBar, TabKey } from './components/navigation/BottomTabBar';
import { MessagesView } from './components/messages/MessagesView';
import { GroceriesView } from './components/groceries/GroceriesView';
import { MealsView } from './components/meals/MealsView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { SettingsView } from './components/settings/SettingsView';
import { PaperPlaneTilt } from '@phosphor-icons/react';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { currentTrip } = useTrip();
  const [activeTab, setActiveTab] = useState<TabKey>('messages');
  const [isForcedReady, setIsForcedReady] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Maximum splash timeout of 1.2s to guarantee first-time visitor never hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsForcedReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Listen to keyboard toggle events (nav bar hidden ONLY when typing/keyboard is open)
  useEffect(() => {
    const handleKb = (e: any) => {
      if (typeof e?.detail?.isOpen === 'boolean') {
        setIsKeyboardOpen(e.detail.isOpen);
      }
    };
    window.addEventListener('trip:keyboard-toggle', handleKb);
    return () => {
      window.removeEventListener('trip:keyboard-toggle', handleKb);
    };
  }, []);

  // Reset to messages view whenever a trip opens
  useEffect(() => {
    if (currentTrip?.id) {
      setActiveTab('messages');
      setIsKeyboardOpen(false);
    }
  }, [currentTrip?.id]);

  // Splash screen until session resolves
  if (isLoading && !isForcedReady) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black">
        <div className="w-16 h-16 rounded-[26px] bg-white/10 border border-white/10 flex items-center justify-center animate-pulse shadow-xl">
          <PaperPlaneTilt size={32} weight="fill" className="text-white -ml-0.5 mt-0.5" />
        </div>
      </div>
    );
  }

  // Not signed in: Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // Signed in but no active trip selected: Trip Gate
  if (!currentTrip) {
    return <TripGate />;
  }

  // Active trip: Main tabs layout
  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-black text-white overflow-hidden select-none">
      <main className="flex-1 w-full overflow-hidden relative">
        {activeTab === 'messages' && (
          <MessagesView onKeyboardStateChange={setIsKeyboardOpen} />
        )}
        {activeTab === 'groceries' && <GroceriesView />}
        {activeTab === 'meals' && <MealsView />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Nav bar is hidden ONLY when keyboard is open, NOT when + menu is open */}
      <BottomTabBar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setIsKeyboardOpen(false);
        }}
        isHidden={isKeyboardOpen && activeTab === 'messages'}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TripProvider>
          <MainAppContent />
        </TripProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
