"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, ArrowLeft, ShieldAlert, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  full_name: string;
  avatar_url: string | null;
}
interface ChatMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_organizer: boolean;
}

interface ChatInfo {
  name: string;
  default_name: string;
  organizer_id: string;
  organizer_name: string;
  is_organizer: boolean;
  member_count: number;
  members: ChatMember[];
}

export default function ChatPage({ params }: { params: Promise<{ tripId: string }> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRequestGenerationRef = useRef(0);
  const messagesControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Extract params
  useEffect(() => {
    params.then(p => setTripId(p.tripId));
  }, [params]);

  // Fetch current user ID to distinguish my messages
  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        if (data.profile) setCurrentUserId(data.profile.id);
      })
      .catch(console.error);
  }, []);

  const fetchMessages = async () => {
    if (!tripId) return;
    const generation = ++messagesRequestGenerationRef.current;
    messagesControllerRef.current?.abort();
    const controller = new AbortController();
    messagesControllerRef.current = controller;
    try {
      const res = await fetch(`/api/chat/${tripId}`, { signal: controller.signal, cache: "no-store" });
      if (generation !== messagesRequestGenerationRef.current) return;
      if (res.status === 403) {
        setError("You are not authorized to view this chat.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (generation !== messagesRequestGenerationRef.current) return;
      if (data.messages) {
        setMessages(data.messages);
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
      return () => {
        clearInterval(interval);
        ++messagesRequestGenerationRef.current;
        messagesControllerRef.current?.abort();
        messagesControllerRef.current = null;
      };
    }
  }, [tripId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !tripId) return;

    const msg = newMessage;
    setNewMessage(""); // Optimistically clear input

    try {
      const res = await fetch(`/api/chat/${tripId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        fetchMessages(); // Fetch immediately after sending
      } else {
        alert("Failed to send message");
        setNewMessage(msg); // Restore input on failure
      }
    } catch (err) {
      console.error(err);
      alert("Error sending message");
      setNewMessage(msg);
    }
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center shrink-0 z-20 sticky top-0">
        <button 
          onClick={() => router.back()}
          className="mr-3 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <button type="button" onClick={() => setShowChatInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label="View trip chat members and details">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold shadow-sm">{(chat?.name || "T").charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex flex-col">
            <h1 className="truncate text-[17px] font-bold text-slate-900 leading-tight">{chat?.name || "Trip Group Chat"}</h1>
            <p className="text-[12px] text-slate-500 font-medium">{chat ? `${chat.member_count} member${chat.member_count === 1 ? "" : "s"} - Tap for info` : "Coordinate your journey"}</p>
          </div>
        </button>
        <Users className="ml-3 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      </div>

      {showChatInfo && chat && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-label="Trip chat information" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowChatInfo(false); }}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-xl font-extrabold text-slate-900">Chat info</h2><p className="text-sm text-slate-500">{chat.member_count} member{chat.member_count === 1 ? "" : "s"}</p></div>
              <button type="button" onClick={() => setShowChatInfo(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close chat information"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Trip chat</p>
              <p className="mt-1 truncate text-lg font-extrabold text-slate-900">{chat.name}</p>
              <p className="mt-1 text-sm text-slate-500">This group name follows the trip title.</p>
            </div>            <div className="flex-1 overflow-y-auto p-5">
              <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">Members</h3>
              <div className="space-y-2">
                {chat.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-slate-50">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center font-bold">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : member.full_name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{member.full_name || "Traveler"}</p>{member.is_organizer && <p className="text-xs font-semibold text-orange-600">Trip organizer</p>}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 flex flex-col bg-[#fafafa]">
        {messages.length === 0 ? (
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
            
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
            
            const showAvatar = !isMe && isLastInGroup;
            
            // Dynamic border radius for Instagram-like bubble grouping
            let bubbleClasses = isMe
              ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              : "bg-slate-200 text-slate-900";
              
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
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}>
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
                    
                    {isLastInGroup && (
                      <span className="text-[10px] text-slate-400 mt-1 mx-1 font-medium select-none">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full flex items-center px-4 py-2 border border-slate-200 focus-within:border-slate-300 focus-within:bg-white transition-colors">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-500 outline-none font-medium text-[15px] py-1"
            />
          </div>
          {newMessage.trim() && (
            <button
              type="submit"
              className="text-orange-500 hover:text-rose-500 p-2 rounded-full transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="w-6 h-6" fill="currentColor" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
