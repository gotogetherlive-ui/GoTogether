"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Smile, X } from 'lucide-react';

const emojis = [
  ['😀', 'Grinning'], ['😊', 'Smiling'], ['😂', 'Laughing'], ['🤣', 'Rolling with laughter'],
  ['😍', 'Heart eyes'], ['🥰', 'Feeling loved'], ['😎', 'Cool'], ['🥳', 'Celebrating'],
  ['🤔', 'Thinking'], ['😅', 'Nervous smile'], ['😢', 'Sad'], ['😭', 'Crying'],
  ['👋', 'Hello'], ['👍', 'Thumbs up'], ['👎', 'Thumbs down'], ['🙌', 'Celebration'],
  ['👏', 'Clapping'], ['🙏', 'Thanks'], ['🤝', 'Handshake'], ['💪', 'Strong'],
  ['❤️', 'Heart'], ['💯', 'Hundred percent'], ['🔥', 'Fire'], ['✨', 'Sparkles'],
  ['🎉', 'Party'], ['✅', 'Done'], ['📍', 'Location'], ['🗺️', 'Map'],
  ['✈️', 'Flight'], ['🚗', 'Car'], ['🚆', 'Train'], ['🏍️', 'Motorbike'],
  ['🏖️', 'Beach'], ['🏔️', 'Mountain'], ['🏕️', 'Camping'], ['🎒', 'Backpack'],
  ['📸', 'Camera'], ['🌅', 'Sunrise'], ['☕', 'Coffee'], ['🍕', 'Pizza'],
];

export default function ChatEmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);

  return <div ref={root} className="relative shrink-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-label="Add emoji" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className={`flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-orange-500 ${open ? 'bg-orange-100 text-orange-600' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}><Smile className="h-5 w-5" /></button>
    {open && <section id={panelId} aria-label="Choose an emoji" className="absolute bottom-full left-0 z-30 mb-3 w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-orange-100 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Add a little expression</span><button type="button" aria-label="Close emoji picker" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      <div className="grid max-h-[min(240px,40dvh)] grid-cols-5 gap-1 overflow-y-auto">
        {emojis.map(([emoji, label]) => <button key={label} type="button" aria-label={label} title={label} onClick={() => { setOpen(false); onSelect(emoji); }} className="flex h-11 items-center justify-center rounded-lg text-2xl transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-500">{emoji}</button>)}
      </div>
    </section>}
  </div>;
}
