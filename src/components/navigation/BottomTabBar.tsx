import React from 'react';
import {
  PaperPlaneTilt,
  ShoppingCart,
  ForkKnife,
  CalendarBlank,
  Gear,
} from '@phosphor-icons/react';

export type TabKey = 'messages' | 'groceries' | 'meals' | 'schedule' | 'settings';

interface BottomTabBarProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  isHidden?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onChangeTab,
  isHidden = false,
}) => {
  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<any> }[] = [
    { key: 'messages', label: 'Messages', Icon: PaperPlaneTilt },
    { key: 'groceries', label: 'Groceries', Icon: ShoppingCart },
    { key: 'meals', label: 'Meals', Icon: ForkKnife },
    { key: 'schedule', label: 'Schedule', Icon: CalendarBlank },
    { key: 'settings', label: 'Settings', Icon: Gear },
  ];

  if (isHidden) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Bottom Navigation"
      style={{
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#161618]/95 border-t border-white/[0.08] select-none pointer-events-auto"
    >
      {/* Completely flush bar with no empty space under, background covers safe area */}
      <div className="max-w-lg mx-auto grid grid-cols-5 items-center px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeTab(key)}
              className="flex flex-col items-center justify-center py-1 min-h-[50px] w-full cursor-pointer active-press group"
            >
              <Icon
                size={27}
                weight={isActive ? 'fill' : 'regular'}
                className={`transition-colors duration-200 ${
                  isActive ? 'text-[#0A84FF]' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[12px] tracking-tight mt-1 transition-colors duration-200 ${
                  isActive ? 'text-[#0A84FF] font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
