"use client";

import { Children, isValidElement, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCheck, RotateCcw } from 'lucide-react';
import styles from './MobileCardStack.module.css';

type Props = { children: ReactNode; className: string; label: string };

export default function MobileCardStack({ children, className, label }: Props) {
  const cards = Children.toArray(children);
  // Start from the first card whenever filters change the result order or set.
  const signature = JSON.stringify(cards.map((card, index) => isValidElement(card) ? card.key ?? index : index));
  return <CardStack key={signature} cards={cards} className={className} label={label} />;
}

function CardStack({ cards, className, label }: Omit<Props, 'children'> & { cards: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [passStamp, setPassStamp] = useState<number | null>(null);
  const passSequence = useRef(0);
  const gesture = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const finished = index >= cards.length;

  function move(next: number) {
    setPassStamp(null);
    setDrag(0);
    setIndex(Math.max(0, Math.min(cards.length, next)));
  }

  function pass() {
    if (finished) return;
    move(index + 1);
    setPassStamp(++passSequence.current);
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!window.matchMedia('(max-width: 767px)').matches || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    if ((event.target as HTMLElement).closest('button, input, textarea, select, [role="button"]')) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  }

  function swipe(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.horizontal) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
      if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      current.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDrag(Math.max(-110, Math.min(110, dx)));
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    gesture.current = null;
    if (!current || current.id !== event.pointerId) return;
    if (current.horizontal) {
      suppressClick.current = true;
      if (Math.abs(event.clientX - current.x) >= 60) pass();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(0);
  }

  if (cards.length === 0) return null;

  return (
    <section aria-label={label} className="overflow-x-clip">
      <div className="mb-5 flex items-center justify-between gap-3 md:hidden">
        <div><p className="text-sm font-semibold text-slate-900" aria-live="polite" aria-atomic="true">{finished ? 'All cards explored' : `Card ${index + 1} of ${cards.length}`}</p><p className="mt-1 text-xs text-slate-500">Swipe left or right to pass to the next card</p></div>
        <span aria-hidden="true" className="flex shrink-0 gap-1 text-orange-700"><ArrowLeft className="h-4 w-4" /><ArrowRight className="h-4 w-4" /></span>
      </div>

      <div className="relative isolate">
        {passStamp !== null && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center md:hidden">
            <span key={passStamp} onAnimationEnd={() => setPassStamp(current => current === passStamp ? null : current)} className={`${styles.passStamp} rounded-xl border-4 border-red-600 bg-white/95 px-7 py-3 text-5xl font-black tracking-[0.15em] text-red-600 shadow-lg`}>PASS</span>
          </div>
        )}
        {!finished && index < cards.length - 1 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 -top-2 bottom-2 -z-10 rounded-xl border border-orange-200 bg-orange-100 md:hidden" />}
        {!finished && index < cards.length - 2 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 -top-4 bottom-4 -z-20 rounded-xl border border-slate-200 bg-slate-100 md:hidden" />}
        <div className={className}>
          {cards.map((card, cardIndex) => (
            <div
              key={cardIndex}
              className={`${cardIndex === index ? 'block' : 'hidden'} min-w-0 touch-pan-y touch-pinch-zoom md:contents`}
              style={cardIndex === index && drag !== 0 ? { transform: `translateX(${drag}px) rotate(${drag / 25}deg)` } : undefined}
              onPointerDown={start}
              onDragStart={event => { if (window.matchMedia('(max-width: 767px)').matches) event.preventDefault(); }}
              onPointerMove={swipe}
              onPointerUp={end}
              onPointerCancel={() => { gesture.current = null; setDrag(0); }}
              onClickCapture={event => {
                if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
              }}
            >{card}</div>
          ))}
        </div>
        {finished && <div className="rounded-xl border border-orange-200 bg-orange-50 px-6 py-12 text-center md:hidden"><CheckCheck aria-hidden="true" className="mx-auto h-9 w-9 text-orange-700" /><h3 className="mt-4 text-xl font-semibold text-slate-900">You’ve seen all {cards.length} cards</h3><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600">Go back to the previous card or restart to explore them all again.</p></div>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 md:hidden">
        <button type="button" disabled={index === 0} onClick={() => move(index - 1)} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Previous</button>
        <button type="button" disabled={finished} onClick={pass} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2 text-sm font-semibold text-white disabled:opacity-40">Pass<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" disabled={index === 0} onClick={() => move(0)} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><RotateCcw aria-hidden="true" className="h-4 w-4" />Restart</button>
      </div>
    </section>
  );
}
