"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { LockKeyhole, CalendarCheck2, Loader2, Send, ArrowLeft, ShieldAlert, Users, X } from "lucide-react";
import { useSession } from '@/components/SessionProvider';
import { chatDateKey, chatDateLabel, chatMessageTime } from "@/lib/chatDates";
import ChatEmojiPicker from "@/components/ChatEmojiPicker";
import TravelerModerationDialog from "@/components/TravelerModerationDialog";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  full_name: string;
  avatar_url: string | null;
  encryption_version: number;
}
interface ChatMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_organizer: boolean;
  is_online: boolean;
}

interface ChatInfo {
  name: string;
  default_name: string;
  organizer_id: string;
  organizer_name: string;
  is_organizer: boolean;
  member_count: number;
  online_count: number;
  members: ChatMember[];
  is_completed: boolean;
  chat_closes_at: string | null;
  is_chat_closed: boolean;
  encryption_mode: 'server-managed';
}

export default function ChatPage({ params }: { params: Promise<{ tripId: string }> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const { user } = useSession();
  const currentUserId = user?.id ?? null;
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [moderation, setModeration] = useState<{ member: ChatMember; action: 'remove' | 'report' } | null>(null);
  const [notice, setNotice] = useState('');
  const [lastRemoved, setLastRemoved] = useState<ChatMember | null>(null);
  
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRequestGenerationRef = useRef(0);
  const messagesControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Extract params
  useEffect(() => {
    params.then(p => setTripId(p.tripId));
  }, [params]);

  useEffect(() => { setMessages([]); }, [currentUserId]);

  const fetchMessages = async () => {
    if (!tripId || document.visibilityState !== "visible") return;
    const generation = ++messagesRequestGenerationRef.current;
    messagesControllerRef.current?.abort();
    const controller = new AbortController();
    messagesControllerRef.current = controller;
    try {
      const res = await fetch(`/api/chat/${tripId}`, { signal: controller.signal, cache: "no-store" });
      if (generation !== messagesRequestGenerationRef.current) return;
      if (res.status === 403) {
        setError("You no longer have access to this trip chat. Check My interests for your request status.");
        setMessages([]); setChat(null); setShowChatInfo(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (generation !== messagesRequestGenerationRef.current) return;
      if (data.messages) {
        setError(null);
        setMessages(previous => JSON.stringify(previous) === JSON.stringify(data.messages) ? previous : data.messages);
        if (data.chat) {
          setChat(data.chat);
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error(err);
    } finally {
      if (generation === messagesRequestGenerationRef.current) {
        setLoading(false);
        messagesControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchMessages();
      // Set up short polling every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      const onVisible = () => { if (document.visibilityState === "visible") void fetchMessages(); };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
        ++messagesRequestGenerationRef.current;
        messagesControllerRef.current?.abort();
        messagesControllerRef.current = null;
      };
    }
  }, [tripId, currentUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !tripId || chat?.is_chat_closed || !currentUserId || sending) return;

    const msg = newMessage;
    setSending(true);
    setPendingMessage(msg);
    setSendError(null);

    try {
      const res = await fetch(`/api/chat/${tripId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages(); // Keep sending feedback visible until history refreshes.
      } else {
        const data = await res.json().catch(() => null);
        if (res.status === 410) void fetchMessages();
        setSendError(res.status >= 500 ? "Could not send your message. Please try again shortly." : data?.error || "Failed to send message");
        setNewMessage(msg); // Restore input on failure
      }
    } catch (err) {
      console.error(err);
      setSendError("Could not send your message. Check your connection and try again.");
      setNewMessage(msg);
    } finally { setSending(false); setPendingMessage(null); }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to load chat</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push("/buddy/interests")}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gt-page-canvas flex h-dvh flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 flex shrink-0 items-center border-b border-amber-100 bg-white/90 px-3 py-3 shadow-[0_10px_30px_-24px_rgba(120,53,15,0.45)] backdrop-blur-xl sm:px-5">
        <button 
          onClick={() => router.push("/team-chat")}
          className="mr-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-3"
          aria-label="Back to team chats"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
          <span className="hidden sm:inline">All chats</span>
        </button>
        <button type="button" onClick={() => setShowChatInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="View trip chat members and details">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white shadow-sm ring-1 ring-orange-300/50">{(chat?.name || "T").charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[17px] font-bold leading-tight text-slate-950">{chat?.name || "Trip group chat"}</h1>
      {chat?.is_completed && <span className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 md:inline">Completed</span>}
            </div>
            <p className={`text-[12px] font-medium ${chat?.is_completed ? "text-emerald-700" : "text-slate-500"}`}>
              {chat?.is_completed ? (chat.is_chat_closed ? "Chat closed - read-only" : "Trip completed - chat closes after one week") : chat ? `${chat.member_count} member${chat.member_count === 1 ? "" : "s"}` : "Coordinate your journey"}
            </p>
          </div>
        </button>
        <button type="button" onClick={() => setShowChatInfo(true)} className="ml-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-3" aria-label="View chat members">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
        </button>
      </header>



      {chat?.is_completed && chat.chat_closes_at && <div role="status" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>{chat.is_chat_closed ? 'Chat closed' : 'This chat is closing soon'}</strong><p className="mt-1">{chat.is_chat_closed ? 'This conversation is now read-only. Chat closed on ' : 'You can send messages until '}{new Date(chat.chat_closes_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST.</p></div>}
      {chat && <button type="button" onClick={() => setShowChatInfo(true)} className="shrink-0 border-b border-slate-100 bg-white px-4 py-2 text-left text-xs font-semibold text-emerald-700">{chat.online_count || 0} online in this chat <span className="font-normal text-slate-500">- View team</span></button>}
      {notice && <div role="status" className="border-b border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}{lastRemoved && <button type="button" onClick={() => setModeration({ member: lastRemoved, action: 'report' })} className="ml-3 font-semibold underline">Report a separate concern</button>}</div>}
      {moderation && tripId && <TravelerModerationDialog tripId={tripId} traveler={moderation.member} action={moderation.action} onClose={() => setModeration(null)} onSuccess={message => { setNotice(message); if (moderation.action === 'remove') setLastRemoved(moderation.member); else setLastRemoved(null); setModeration(null); setShowChatInfo(false); void fetchMessages(); }} />}

      {showChatInfo && chat && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-label="Trip chat information" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowChatInfo(false); }}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-xl font-bold text-slate-900">Chat info</h2><p className="text-sm text-slate-500">{chat.member_count} member{chat.member_count === 1 ? "" : "s"}</p></div>
              <button type="button" onClick={() => setShowChatInfo(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close chat information"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Trip chat</p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">{chat.name}</p>
              <p className="mt-1 text-sm text-slate-500">This group name follows the trip title.</p>
              {chat.is_completed && <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><CalendarCheck2 className="h-4 w-4" />The chat stays open for seven days after the trip ends, then becomes read-only.</p>}
            </div>            <div className="flex-1 overflow-y-auto p-5">

              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Members</h3><p className="mb-3 text-xs text-slate-500">Online means this chat was open in the last 30 seconds.</p>
              <div className="space-y-2">
                {chat.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-slate-50">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : member.full_name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{member.full_name || "Traveler"}</p><p className={`flex items-center gap-1.5 text-xs ${member.is_online ? "text-emerald-700" : "text-slate-400"}`}><span aria-hidden="true" className={`h-2 w-2 rounded-full ${member.is_online ? "bg-emerald-500" : "bg-slate-300"}`} />{member.is_online ? "Online" : "Offline"}</p>{member.is_organizer && <p className="text-xs font-semibold text-orange-600">Trip organizer</p>}</div>
                    {currentUserId && member.id !== currentUserId && <div className="flex shrink-0 flex-col gap-2 text-xs"><button type="button" onClick={() => setModeration({ member, action: 'report' })} className="rounded-md border border-slate-200 px-2 py-1.5 font-semibold text-slate-600">Report</button>{chat.is_organizer && !member.is_organizer && <button type="button" onClick={() => setModeration({ member, action: 'remove' })} className="rounded-md border border-rose-200 px-2 py-1.5 font-semibold text-rose-700">Remove</button>}</div>}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.08),_transparent_22rem),linear-gradient(180deg,#fffdf9,#f8fafc)] px-4 py-6">
        {chat?.encryption_mode === 'server-managed' && <div className="mx-auto text-center"><p title="Messages are encrypted on our servers. This is not end-to-end encryption." className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-50 px-4 py-2 text-[11px] text-amber-800"><LockKeyhole aria-hidden="true" className="h-3 w-3" />Messages are encrypted</p></div>}

        {messages.length === 0 && !pendingMessage ? (
          <div className="m-auto text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full mb-4 flex items-center justify-center">
              <Send className="w-8 h-8 text-rose-400 -ml-1" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No messages yet</h3>
            <p className="text-slate-500 text-sm max-w-[250px]">
              Say hello to start planning your trip together!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            
            // Check previous and next messages to group them
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            
            const startsNewDay = !prevMsg || chatDateKey(prevMsg.created_at) !== chatDateKey(msg.created_at);
            const isFirstInGroup = startsNewDay || prevMsg?.sender_id !== msg.sender_id;
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || chatDateKey(nextMsg.created_at) !== chatDateKey(msg.created_at);
            
            const showAvatar = !isMe && isLastInGroup;
            
            // Dynamic border radius for Instagram-like bubble grouping
            let bubbleClasses = isMe
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-900";
              
            if (isMe) {
              bubbleClasses += " rounded-2xl";
              if (!isFirstInGroup) bubbleClasses += " rounded-tr-[4px]";
              if (!isLastInGroup) bubbleClasses += " rounded-br-[4px]";
            } else {
              bubbleClasses += " rounded-2xl";
              if (!isFirstInGroup) bubbleClasses += " rounded-tl-[4px]";
              if (!isLastInGroup) bubbleClasses += " rounded-bl-[4px]";
            }

            return (
              <Fragment key={msg.id}>
              {startsNewDay && <div className="flex justify-center py-3"><time dateTime={chatDateKey(msg.created_at)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{chatDateLabel(msg.created_at)}</time></div>}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}>
                <div className={`flex max-w-[75%] md:max-w-[60%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  
                  {/* Avatar column for others */}
                  {!isMe && (
                    <div className="w-7 h-7 shrink-0">
                      {showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                          {msg.avatar_url ? <img src={msg.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : msg.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && isFirstInGroup && (
                      <span className="text-[11px] text-slate-500 font-medium mb-1 ml-1">{msg.full_name}</span>
                    )}
                    
                    <div className={`px-4 py-2.5 shadow-sm ${bubbleClasses}`}>
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.message}</p>
                    </div>
                    
                    {(
                      <time dateTime={msg.created_at} title={chatDateLabel(msg.created_at) + " " + chatMessageTime(msg.created_at)} className="text-[10px] text-slate-400 mt-1 mx-1 font-medium select-none">
                        {chatMessageTime(msg.created_at)}
                      </time>
                    )}
                  </div>
                </div>
              </div>
              </Fragment>
            );
          })
        )}
        {pendingMessage && <div className="flex justify-end" role="status" aria-live="polite">
          <div className="max-w-[85%] rounded-2xl bg-slate-900/75 px-4 py-3 text-white sm:max-w-[60%]">
            <p className="whitespace-pre-wrap break-words text-[15px]">{pendingMessage}</p>
            <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-slate-200"><Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />Sending…</p>
          </div>
        </div>}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-amber-100 bg-white/92 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        {sendError && <p role="alert" className="mx-auto mb-2 max-w-4xl text-sm text-rose-700">{sendError}</p>}
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          {!chat?.is_chat_closed && <ChatEmojiPicker onSelect={emoji => {
            const input = messageInputRef.current;
            const start = input?.selectionStart ?? newMessage.length;
            const end = input?.selectionEnd ?? start;
            const value = newMessage.slice(0, start) + emoji + newMessage.slice(end);
            if (value.length > 2000) return;
            setNewMessage(value);
            requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length); });
          }} />}
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-5 py-2 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100/60">
            <input
              ref={messageInputRef}
              maxLength={2000}
              name="chat-message"
              aria-label="Chat message"
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={chat?.is_chat_closed || sending}
              placeholder={chat?.is_chat_closed ? "Chat closed - read-only" : "Message..."}
              className="chat-message-input min-w-0 flex-1 border-0 bg-transparent text-slate-900 placeholder:text-slate-400 font-medium text-base py-1"
            />
          </div>
          {!chat?.is_chat_closed && (newMessage.trim() || sending) && (
            <button
              type="submit"
              disabled={sending}
              aria-label="Send message"
              aria-busy={sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition active:scale-90 hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              {sending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Send aria-hidden="true" className="h-5 w-5" />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
