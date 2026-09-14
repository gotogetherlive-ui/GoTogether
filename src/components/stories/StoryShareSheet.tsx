"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Link2, MessageCircle, X } from "lucide-react";

export type ShareableStory = {
  id: string;
  content: string;
  images: string[];
  location: string | null;
  author_name: string;
  author_avatar: string | null;
};

type Props = {
  story: ShareableStory;
  copied: boolean;
  shareUrl: string;
  onClose: () => void;
  onCopy: () => void;
  onOpenTarget: (target: "whatsapp" | "x" | "facebook") => void;
};

function ShareAvatar({ story }: { story: ShareableStory }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-rose-100 text-sm font-bold text-slate-700">
      {story.author_avatar && !imageFailed ? (
        <Image src={story.author_avatar} alt={story.author_name} fill sizes="40px" className="object-cover" onError={() => setImageFailed(true)} />
      ) : story.author_name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function StoryShareSheet({ story, copied, shareUrl, onClose, onCopy, onOpenTarget }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 md:items-center md:p-4">
      <div className="w-full overflow-hidden rounded-t-[2rem] border border-white/80 bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-200 md:max-w-md md:rounded-xl md:zoom-in-95">
        <div className="relative h-32 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-900">
          {story.images[0] && <Image src={story.images[0]} alt="Story preview" fill sizes="448px" className="object-cover opacity-35" />}
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50" aria-label="Close share sheet">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Share story</p>
            <h3 className="text-xl font-bold leading-tight">Send this travel moment</h3>
            <p className="mt-1 text-[11px] font-medium text-white/65">Choose an app or copy a private link.</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <ShareAvatar story={story} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-800">{story.author_name}</p>
                {story.location && <span className="truncate text-[10px] font-bold text-sky-600">{story.location}</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{story.content}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => onOpenTarget("whatsapp")} className="group flex flex-col items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700 transition-colors hover:bg-emerald-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform "><MessageCircle className="h-4 w-4" /></span><span className="text-[10px] font-bold">WhatsApp</span>
            </button>
            <button onClick={() => onOpenTarget("x")} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-800 transition-colors hover:bg-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white transition-transform ">X</span><span className="text-[10px] font-bold">X</span>
            </button>
            <button onClick={() => onOpenTarget("facebook")} className="group flex flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700 transition-colors hover:bg-blue-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white transition-transform ">f</span><span className="text-[10px] font-bold">Facebook</span>
            </button>
            <button onClick={onCopy} className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 p-3 text-violet-700 transition-colors hover:bg-violet-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white transition-transform ">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</span><span className="text-[10px] font-bold">{copied ? "Copied" : "Copy link"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">{shareUrl}</span>
            <button onClick={onCopy} className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-slate-800">{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
