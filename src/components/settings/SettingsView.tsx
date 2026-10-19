import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Camera,
  SignOut,
  CalendarBlank,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { Avatar } from '../common/Avatar';
import { DatePickerModal } from '../common/DatePickerModal';
import { formatTripDate } from '../../utils/date';
import { uploadAsset } from '../../lib/supabase';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { CollapsingHeaderLayout } from '../common/CollapsingHeaderLayout';

export const SettingsView: React.FC = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { currentTrip, tripMembers, isOwner, updateTrip, exitTrip } = useTrip();

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit Name
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');

  // Edit Trip (owner only)
  const [tripName, setTripName] = useState(currentTrip?.name || '');
  const [startDate, setStartDate] = useState(currentTrip?.start_date || '');
  const [endDate, setEndDate] = useState(currentTrip?.end_date || '');
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [savedTripNotice, setSavedTripNotice] = useState(false);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  if (!currentTrip) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentTrip.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAsset(file, 'avatars');
      await updateProfile({ avatar_url: publicUrl });
    } catch (err) {
      console.warn('Avatar upload error:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    await updateProfile({ display_name: displayName.trim() });
    setEditingName(false);
  };

  const handleSaveTrip = async () => {
    if (!tripName.trim() || !startDate || !endDate) return;
    await updateTrip({
      name: tripName.trim(),
      start_date: startDate,
      end_date: endDate,
    });
    setSavedTripNotice(true);
    setTimeout(() => setSavedTripNotice(false), 2000);
  };

  return (
    <CollapsingHeaderLayout title="Settings">
      <div className="space-y-6 pb-8 animate-calm-fade-in">
        {/* User Profile Header */}
        <div className="flex flex-col items-center gap-2 pt-1 pb-1">
          <div className="relative">
            <Avatar
              name={profile?.display_name}
              avatarUrl={profile?.avatar_url}
              color={profile?.color}
              size={80}
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#2c2c2e] border border-white/20 text-white shadow-lg flex items-center justify-center active:scale-90 cursor-pointer transition-transform"
            >
              <Camera size={16} weight="bold" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>

          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                autoFocus
                inputMode="text"
                enterKeyHint="done"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveName();
                  }
                }}
                className="h-10 px-4 rounded-full bg-white/10 text-[17px] text-center font-bold text-white outline-none border border-white/20"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="text-sm font-bold text-[#0A84FF] active-press cursor-pointer px-3 py-1.5"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDisplayName(profile?.display_name || '');
                setEditingName(true);
              }}
              className="text-lg font-bold text-white mt-0.5 active:scale-98 cursor-pointer transition-transform"
            >
              {profile?.display_name || 'User'}
            </button>
          )}

          <span className="text-xs text-slate-400 font-medium">
            {user?.email}
          </span>
        </div>

        {/* Switch Trip Button - Clean unboxed row */}
        <button
          type="button"
          onClick={exitTrip}
          className="w-full flex items-center justify-between py-3 px-2 active:bg-white/5 cursor-pointer text-left transition-colors border-y border-white/[0.08]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF]">
              <ArrowsLeftRight size={18} weight="bold" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                Switch Trip
              </div>
              <div className="text-xs text-slate-400">
                Return to your trips list
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-[#0A84FF] px-2">
            All Trips
          </span>
        </button>

        {/* Trip Info & Invite Code - Clean row */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-400 px-2">
            Invite Code
          </div>
          <div className="py-2.5 px-2 flex items-center justify-between border-b border-white/[0.08]">
            <div>
              <div className="text-2xl font-extrabold tracking-widest text-white">
                {currentTrip.invite_code}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="h-9 px-4 rounded-full bg-[#0A84FF] text-white flex items-center gap-1.5 text-xs font-bold active-press cursor-pointer shadow-sm hover:bg-[#007AFF] transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check size={14} weight="bold" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} weight="bold" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trip Details (Owner Only) - Clean unboxed inputs */}
        {isOwner && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 px-2">
              Trip Details
            </div>
            <div className="space-y-3 px-1">
              <div>
                <input
                  type="text"
                  inputMode="text"
                  enterKeyHint="done"
                  placeholder="Trip name"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveTrip();
                    }
                  }}
                  className="w-full h-12 px-3.5 rounded-[16px] bg-white/10 text-white text-[16px] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveDatePicker('start')}
                  className="w-full h-12 px-3 rounded-[16px] bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active-press cursor-pointer"
                >
                  <CalendarBlank size={15} weight="regular" />
                  <span>{formatTripDate(startDate)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDatePicker('end')}
                  className="w-full h-12 px-3 rounded-[16px] bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active-press cursor-pointer"
                >
                  <CalendarBlank size={15} weight="regular" />
                  <span>{formatTripDate(endDate)}</span>
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveTrip}
                  className="w-full h-12 rounded-[18px] bg-[#0A84FF] text-white font-bold text-sm active-press cursor-pointer shadow-sm hover:bg-[#007AFF]"
                >
                  {savedTripNotice ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>

            <DatePickerModal
              isOpen={activeDatePicker === 'start'}
              onClose={() => setActiveDatePicker(null)}
              selectedDate={startDate}
              onSelectDate={(d) => {
                setStartDate(d);
                if (d > endDate) setEndDate(d);
              }}
            />
            <DatePickerModal
              isOpen={activeDatePicker === 'end'}
              onClose={() => setActiveDatePicker(null)}
              selectedDate={endDate}
              onSelectDate={(d) => {
                setEndDate(d);
                if (d < startDate) setStartDate(d);
              }}
            />
          </div>
        )}

        {/* Members - Clean divided list without panel */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 px-2">
            Members ({tripMembers.length})
          </div>
          <div className="divide-y divide-white/[0.08] overflow-hidden">
            {tripMembers.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between min-h-[50px] px-2 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={m.profile?.display_name}
                    avatarUrl={m.profile?.avatar_url}
                    color={m.profile?.color}
                    size={34}
                  />
                  <span className="text-sm font-semibold text-white">
                    {m.profile?.display_name || 'Member'}
                    {user?.id === m.user_id && ' (You)'}
                  </span>
                </div>
                {m.role === 'owner' && (
                  <span className="text-[11px] font-bold text-[#0A84FF] bg-[#0A84FF]/20 px-2.5 py-0.5 rounded-full">
                    Owner
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Install App */}
        <div className="flex justify-center pt-2">
          <PWAInstallPrompt />
        </div>

        {/* Sign Out */}
        <div className="pt-2 pb-6">
          <button
            type="button"
            onClick={signOut}
            className="w-full min-h-[48px] px-4 rounded-[18px] bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center gap-2 text-red-400 font-bold text-sm active-press cursor-pointer transition-colors"
          >
            <SignOut size={18} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </CollapsingHeaderLayout>
  );
};
