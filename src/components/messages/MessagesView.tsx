import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Plus,
  Camera,
  Image as ImageIcon,
  ChartBar,
  X,
  CaretLeft,
} from '@phosphor-icons/react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { Message } from '../../types';
import { ChatBubble } from './ChatBubble';
import { PinnedPolls } from './PinnedPolls';
import { PollSheet } from './PollSheet';
import { CameraModal } from '../common/CameraModal';
import { Avatar } from '../common/Avatar';
import { CustomScrollArea } from '../common/CustomScrollArea';
import { formatMessageDaySeparator } from '../../utils/date';
import { uploadAsset } from '../../lib/supabase';

interface MessagesViewProps {
  onKeyboardStateChange?: (isOpen: boolean) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onKeyboardStateChange,
}) => {
  const {
    currentTrip,
    tripMembers,
    messages,
    polls,
    sendMessage,
    deleteMessage,
    toggleReaction,
    createPoll,
    votePoll,
    endPoll,
    exitTrip,
  } = useTrip();
  const { user } = useAuth();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isPollSheetOpen, setIsPollSheetOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Virtual keyboard tracking for mobile
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const notifyKeyboard = (open: boolean) => {
    setIsKeyboardOpen(open);
    if (onKeyboardStateChange) {
      onKeyboardStateChange(open);
    }
    window.dispatchEvent(new CustomEvent('trip:keyboard-toggle', { detail: { isOpen: open } }));
  };

  const handleFocus = () => {
    notifyKeyboard(true);
    const vv = window.visualViewport;
    if (vv) {
      const diff = window.innerHeight - vv.height;
      if (diff > 40) {
        setKeyboardHeight(diff);
      }
    }
    setTimeout(scrollToBottom, 60);
  };

  const handleBlur = () => {
    setTimeout(() => {
      const vv = window.visualViewport;
      if (!vv || window.innerHeight - vv.height <= 40) {
        notifyKeyboard(false);
        setKeyboardHeight(0);
      }
    }, 120);
  };

  // Track visualViewport for iOS and mobile keyboard changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const diff = window.innerHeight - vv.height;
      const isOpen = diff > 40;
      setIsKeyboardOpen(isOpen);
      if (onKeyboardStateChange) {
        onKeyboardStateChange(isOpen);
      }
      window.dispatchEvent(new CustomEvent('trip:keyboard-toggle', { detail: { isOpen } }));
      setKeyboardHeight(isOpen ? diff : 0);
      if (isOpen) {
        setTimeout(scrollToBottom, 60);
      }
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      notifyKeyboard(false);
    };
  }, [onKeyboardStateChange]);

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollH = textarea.scrollHeight;
      const newHeight = Math.min(scrollH, 130);
      textarea.style.height = `${Math.max(40, newHeight)}px`;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    await sendMessage(clean, undefined, replyId);
    setTimeout(scrollToBottom, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setIsPlusMenuOpen(false);
    try {
      const url = await uploadAsset(file, 'chat');
      const replyId = replyingTo?.id;
      setReplyingTo(null);
      await sendMessage('', url, replyId);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.warn('Image upload error:', err);
    } finally {
      setUploadingImage(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    setUploadingImage(true);
    setIsCameraOpen(false);
    try {
      const url = await uploadAsset(blob, 'chat');
      const replyId = replyingTo?.id;
      setReplyingTo(null);
      await sendMessage('', url, replyId);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.warn('Camera upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDoubleTapHeart = (messageId: string) => {
    toggleReaction(messageId, 'Heart');
  };

  // Group messages logic
  const messageGroups: {
    message: Message;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    showDaySeparator: boolean;
    dayLabel: string;
  }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const curr = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const currDate = new Date(curr.created_at).toDateString();
    const prevDate = prev ? new Date(prev.created_at).toDateString() : null;
    const showDaySeparator = currDate !== prevDate;
    const dayLabel = formatMessageDaySeparator(curr.created_at);

    const isPrevSame =
      prev &&
      prev.user_id === curr.user_id &&
      !showDaySeparator &&
      Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 180000;

    const nextDate = next ? new Date(next.created_at).toDateString() : null;
    const isNextSame =
      next &&
      next.user_id === curr.user_id &&
      currDate === nextDate &&
      Math.abs(new Date(next.created_at).getTime() - new Date(curr.created_at).getTime()) < 180000;

    messageGroups.push({
      message: curr,
      isFirstInGroup: !isPrevSame,
      isLastInGroup: !isNextSame,
      showDaySeparator,
      dayLabel,
    });
  }

  const hasOpenPolls = polls.some((p) => !p.is_closed);

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto relative bg-black overflow-hidden select-none">
      {/* Top bar with Trip info */}
      <header
        style={{
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}
        className="shrink-0 min-h-[4.75rem] pt-[max(0.6rem,env(safe-area-inset-top))] pb-3 px-4 flex items-center justify-between z-20 bg-[#1c1c1e]/85 border-b border-white/[0.08] select-none transition-colors"
      >
        {/* Left: Back to Trips */}
        <button
          type="button"
          onClick={exitTrip}
          className="min-h-[44px] flex items-center gap-1 text-sm font-semibold text-[#0A84FF] active-press cursor-pointer py-1.5 pr-2 -ml-2"
          title="Exit to My Trips"
        >
          <CaretLeft size={18} weight="bold" />
          <span>Trips</span>
        </button>

        {/* Center: Group Picture Stack and Trip Name */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex -space-x-2 items-center justify-center mb-1">
            {tripMembers.length > 0 ? (
              tripMembers.slice(0, 3).map((m, idx) => (
                <div
                  key={m.user_id}
                  className="rounded-full ring-2 ring-[#1c1c1e] overflow-hidden"
                  style={{ zIndex: 10 - idx }}
                >
                  <Avatar
                    name={m.profile?.display_name}
                    avatarUrl={m.profile?.avatar_url}
                    color={m.profile?.color}
                    size={28}
                  />
                </div>
              ))
            ) : (
              <Avatar
                name={currentTrip?.name || 'Trip'}
                color="#0A84FF"
                size={28}
              />
            )}
          </div>
          <span className="text-[14px] font-bold text-white max-w-[190px] truncate leading-tight text-center">
            {currentTrip?.name || 'Trip'}
          </span>
        </div>

        {/* Right side invite code */}
        <div className="text-xs font-mono font-semibold text-slate-400 px-1">
          {currentTrip?.invite_code}
        </div>
      </header>

      {/* Floating Pinned Polls Overlay (Lower down) */}
      <PinnedPolls
        polls={polls}
        onVote={votePoll}
        onEndPoll={endPoll}
      />

      {/* Messages Scroll Area */}
      <CustomScrollArea scrollRef={scrollRef} className="flex-1 px-4">
        <div
          className={`flex flex-col justify-start min-h-full ${hasOpenPolls ? 'pt-28' : 'pt-4'}`}
          style={{
            paddingBottom: isKeyboardOpen
              ? `${Math.max(keyboardHeight, 0) + 84}px`
              : 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)',
          }}
        >
          {messageGroups.map(({ message, isFirstInGroup, isLastInGroup, showDaySeparator, dayLabel }) => {
            const replyMsg = message.reply_to
              ? messages.find((m) => m.id === message.reply_to)
              : null;

            return (
              <React.Fragment key={message.id}>
                {showDaySeparator && (
                  <div className="flex justify-center my-4 animate-calm-fade-in">
                    <span className="text-xs font-medium text-slate-500 select-none">
                      {dayLabel}
                    </span>
                  </div>
                )}
                <ChatBubble
                  message={message}
                  isOwn={user ? message.user_id === user.id : false}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  currentUserId={user?.id}
                  onDoubleTapHeart={handleDoubleTapHeart}
                  onReact={(mId, kind) => toggleReaction(mId, kind)}
                  onReply={(m) => setReplyingTo(m)}
                  onDelete={deleteMessage}
                  replyMessage={replyMsg}
                />
              </React.Fragment>
            );
          })}
        </div>
      </CustomScrollArea>

      {/* Reply Banner */}
      {replyingTo && (
        <div
          style={{
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            bottom: isKeyboardOpen
              ? `${Math.max(keyboardHeight, 0) + 72}px`
              : 'calc(env(safe-area-inset-bottom, 0px) + 8.75rem)',
          }}
          className="absolute left-3.5 right-3.5 z-30 px-4 py-2.5 flex items-center justify-between bg-[#202024]/90 border border-white/[0.12] rounded-[20px] text-xs text-white shadow-lg animate-spring-in transition-[bottom] duration-150 ease-out"
        >
          <div className="truncate pr-2">
            <span className="font-bold text-[#0A84FF] mr-1.5">
              Replying to {replyingTo.sender?.display_name || 'Member'}:
            </span>
            <span className="truncate opacity-80">{replyingTo.content}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 active:scale-95 cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* Floating Message Input Container */}
      <div
        style={{
          bottom: isKeyboardOpen
            ? `${Math.max(keyboardHeight, 0) + 12}px`
            : 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
        }}
        className="absolute left-3.5 right-3.5 z-30 pointer-events-auto transition-[bottom] duration-150 ease-out"
      >
        <input
          type="file"
          ref={photoInputRef}
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
        />

        {/* items-end: The + button and send button STAY ANCHORED AT THE BOTTOM when textarea expands */}
        <form onSubmit={handleSend} className="relative flex items-end gap-2.5">
          {/* Floating Plus Toggle Button - stays anchored at bottom */}
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => {
              if (textareaRef.current) {
                textareaRef.current.blur();
              }
              notifyKeyboard(false);
              setIsPlusMenuOpen(!isPlusMenuOpen);
            }}
            style={{
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] border border-white/[0.12] active-press shrink-0 self-end mb-0.5 transition-colors ${
              isPlusMenuOpen
                ? 'bg-white/25 text-white'
                : 'bg-[#222226]/90 text-white hover:bg-[#2a2a2e]'
            }`}
          >
            <Plus
              size={22}
              weight="bold"
              className={`transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`}
            />
          </button>

          {/* Plus Menu Popup */}
          {isPlusMenuOpen && (
            <>
              <div
                onClick={() => setIsPlusMenuOpen(false)}
                className="fixed inset-0 z-30 bg-transparent"
              />
              <div
                style={{
                  backdropFilter: 'blur(30px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(190%)',
                  backgroundColor: 'rgba(28, 28, 32, 0.94)',
                }}
                className="absolute left-0 bottom-14 z-40 w-48 border border-white/[0.14] rounded-[24px] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.6)] origin-bottom-left animate-pop-in"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    setIsCameraOpen(true);
                  }}
                  className="w-full h-11 px-3.5 rounded-[18px] flex items-center gap-3 text-sm font-semibold text-white hover:bg-white/10 active:scale-98 cursor-pointer transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-[#0A84FF]">
                    <Camera size={16} weight="bold" />
                  </div>
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    photoInputRef.current?.click();
                  }}
                  className="w-full h-11 px-3.5 rounded-[18px] flex items-center gap-3 text-sm font-semibold text-white hover:bg-white/10 active:scale-98 cursor-pointer transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ImageIcon size={16} weight="bold" />
                  </div>
                  <span>Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    setIsPollSheetOpen(true);
                  }}
                  className="w-full h-11 px-3.5 rounded-[18px] flex items-center gap-3 text-sm font-semibold text-white hover:bg-white/10 active:scale-98 cursor-pointer transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <ChartBar size={16} weight="bold" />
                  </div>
                  <span>Poll</span>
                </button>
              </div>
            </>
          )}

          {/* Floating Pill Input Box - expands UPWARDS */}
          <div
            style={{
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            }}
            className="flex-1 min-w-0 flex items-center min-h-[46px] bg-[#222226]/90 border border-white/[0.12] rounded-[24px] px-4 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-150 ease-out"
          >
            <textarea
              ref={textareaRef}
              id="chat-message-input"
              name="message"
              rows={1}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              enterKeyHint="send"
              placeholder="Message..."
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="flex-1 bg-transparent text-white placeholder:text-slate-400 text-[17px] resize-none outline-none pt-2.5 pb-2 leading-[1.38] max-h-36 overflow-y-auto transition-[height] duration-150 ease-out"
              style={{ minHeight: '40px', height: '40px' }}
            />
          </div>

          {/* Send Button - stays anchored at bottom */}
          <div
            className={`shrink-0 self-end mb-0.5 flex items-center justify-center transition-all duration-250 ease-out ${
              inputText.trim()
                ? 'w-12 opacity-100 scale-100 translate-x-0'
                : 'w-0 opacity-0 scale-50 translate-x-2 pointer-events-none'
            }`}
          >
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-12 h-12 rounded-full bg-[#0A84FF] text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-90 transition-transform"
            >
              <ArrowUp size={20} weight="bold" />
            </button>
          </div>
        </form>
      </div>

      {/* Poll Creation Bottom Sheet */}
      <PollSheet
        isOpen={isPollSheetOpen}
        onClose={() => setIsPollSheetOpen(false)}
        onCreatePoll={createPoll}
      />

      {/* In-app Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};
