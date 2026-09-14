"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';
import { MessageCircle, X } from 'lucide-react';
import { subscribeNotificationEvent } from '@/lib/notificationStream';

type ChatToast = { id: string; trip_id: string; preview: string; sender_name: string; trip_title: string };

export default function ChatMessageToasts() {
  const { user } = useSession();
  return user ? <AuthenticatedChatMessageToasts key={user.id} /> : null;
}

function AuthenticatedChatMessageToasts() {
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const router = useRouter();

  useEffect(() => {
    const seen = new Set<string>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const controller = new AbortController();
    let initialized = false;
    let polling = false;
    let disposed = false;
    const receive = (message: ChatToast, show = true) => {
      if (disposed || !message || typeof message.id !== 'string' || typeof message.trip_id !== 'string' || seen.has(message.id)) return;
      seen.add(message.id);
      if (seen.size > 500) seen.delete(seen.values().next().value!);
      if (!show) return;
      setToasts(previous => [...previous.filter(item => item.trip_id !== message.trip_id), message].slice(-3));
      const timer = setTimeout(() => {
        setToasts(previous => previous.filter(item => item.id !== message.id));
        timers.delete(timer);
      }, 10000);
      timers.add(timer);
    };
    const poll = async () => {
      if (polling || disposed) return;
      polling = true;
      try {
        const response = await fetch('/api/chat/notifications', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!Array.isArray(data.messages)) return;
        for (const message of data.messages) receive(message, initialized);
        initialized = true;
      } catch { /* A later poll retries transient network failures. */ }
      finally { polling = false; }
    };
    const unsubscribe = subscribeNotificationEvent('chat-message', event => {
      try { receive(JSON.parse((event as MessageEvent).data)); } catch { /* Ignore malformed events. */ }
    });
    void poll();
    const interval = setInterval(() => void poll(), 5000);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true; controller.abort(); unsubscribe(); clearInterval(interval);
      timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <aside aria-label="New chat messages" aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-4 right-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-[310px] flex-col gap-2 sm:bottom-5 sm:right-5">
    {toasts.map(message => <div key={message.id} className="pointer-events-auto relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.3)] backdrop-blur-xl motion-safe:animate-[fadeIn_200ms_ease-out]">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-gradient-to-b from-orange-400 to-rose-400" />
      <button aria-label="Dismiss notification" onClick={() => setToasts(previous => previous.filter(item => item.id !== message.id))} className="absolute right-1 top-1 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500"><X className="h-3.5 w-3.5" /></button>
      <button aria-label={`New trip message from ${message.sender_name}. Open chat`} onClick={() => { setToasts(previous => previous.filter(item => item.id !== message.id)); router.push(`/chat/${message.trip_id}`); }} className="group flex w-full items-start gap-2.5 p-3 text-left transition hover:bg-orange-50/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500">
        <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-rose-50 text-sm font-bold text-orange-700 ring-1 ring-orange-200/60">{message.sender_name.trim().charAt(0).toUpperCase() || 'T'}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate pr-6 text-[13px] font-semibold text-slate-900">{message.sender_name}</span>
          <span className="mt-0.5 block truncate pr-4 text-[10px] text-slate-500">{message.trip_title}</span>
          <span className="mt-1.5 line-clamp-2 break-words text-xs leading-[1.4] text-slate-600">Encrypted message received</span>
          <span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-orange-600"><MessageCircle aria-hidden="true" className="h-3 w-3" />Reply in chat <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span></span>
        </span>
      </button>
    </div>)}
  </aside>;
}
