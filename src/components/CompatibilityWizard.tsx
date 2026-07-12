"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Utensils, Mountain, Compass, Sun, Users, Sparkles,
  Wine, Cigarette, Globe, CalendarCheck, Star, ChevronLeft,
  ChevronRight, Check, Loader2, X, Wallet,
} from "lucide-react";

// ─── Step Configuration ──────────────────────────────────────────────
const FOOD_OPTIONS = [
  { value: "Any", label: "ANY", emoji: "🍽️" },
  { value: "Veg", label: "Vegetarian", emoji: "🥗" },
  { value: "Non-Veg", label: "Non-Veg", emoji: "🍗" },
  { value: "Vegan", label: "Vegan", emoji: "🌱" },
  { value: "Jain", label: "Jain", emoji: "🙏" },
  { value: "Eggetarian", label: "Eggetarian", emoji: "🥚" },
];

const TRAVEL_STYLE_OPTIONS = [
  { value: "Luxury", label: "Luxury", emoji: "✨", desc: "Five-star stays, fine dining" },
  { value: "Comfort", label: "Comfort", emoji: "🏨", desc: "Nice stays, planned tours" },
  { value: "Budget", label: "Budget", emoji: "🎒", desc: "Smart spending, great value" },
  { value: "Backpacker", label: "Backpacker", emoji: "🗺️", desc: "Hostels, street food, raw vibes" },
];

const ACTIVITY_OPTIONS = [
  { value: "Adventure", emoji: "🧗" },
  { value: "Trekking", emoji: "🥾" },
  { value: "Sightseeing", emoji: "📸" },
  { value: "Photography", emoji: "📷" },
  { value: "Wildlife", emoji: "🦁" },
  { value: "Party / Nightlife", emoji: "🎉" },
  { value: "Spiritual", emoji: "🕉️" },
  { value: "Historical Places", emoji: "🏛️" },
  { value: "Food Exploration", emoji: "🍜" },
  { value: "Relaxation", emoji: "🧘" },
];

const ENERGY_OPTIONS = [
  { value: "Early Bird", label: "Early Bird", emoji: "🌅", desc: "Up at dawn, maximizing daylight" },
  { value: "Flexible", label: "Flexible", emoji: "⚡", desc: "Go with the flow" },
  { value: "Night Owl", label: "Night Owl", emoji: "🌙", desc: "Late nights, late mornings" },
];

const SOCIAL_OPTIONS = [
  { value: "Introvert", label: "Introvert", emoji: "📖", desc: "Quiet time recharges me" },
  { value: "Ambivert", label: "Ambivert", emoji: "🎭", desc: "Mix of social & solo" },
  { value: "Extrovert", label: "Extrovert", emoji: "🎊", desc: "The more people, the merrier" },
];

const DRINKING_OPTIONS = [
  { value: "Never", emoji: "🚫" },
  { value: "Occasionally", emoji: "🥂" },
  { value: "Socially", emoji: "🍻" },
  { value: "Frequently", emoji: "🍷" },
];

const SMOKING_OPTIONS = [
  { value: "No", emoji: "🚭" },
  { value: "Occasionally", emoji: "💨" },
  { value: "Regularly", emoji: "🚬" },
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi",
  "Punjabi", "Gujarati", "Kannada", "Malayalam", "Odia",
  "Assamese", "Urdu", "Other",
];

const TRIP_BEHAVIOR_OPTIONS = [
  { value: "Follow schedule strictly", label: "Strict Planner", emoji: "📋", desc: "Every hour accounted for" },
  { value: "Mostly follow schedule", label: "Mostly Planned", emoji: "📝", desc: "Plan with room to breathe" },
  { value: "Flexible", label: "Flexible", emoji: "🌊", desc: "Some plans, some spontaneity" },
  { value: "Completely spontaneous", label: "Spontaneous", emoji: "🎲", desc: "No plans, just vibes" },
];

const IDEAL_TRIP_OPTIONS = [
  { value: "Adventure Packed", label: "Adventure Packed", emoji: "⚡", desc: "Every moment counts" },
  { value: "Relaxed", label: "Relaxed", emoji: "🌴", desc: "Slow travel, deep immersion" },
  { value: "Balanced", label: "Balanced", emoji: "⚖️", desc: "Mix of action and chill" },
];

const CLEANLINESS_LABELS = [
  { val: 1, label: "Chill", emoji: "😌" },
  { val: 2, label: "Casual", emoji: "🙂" },
  { val: 3, label: "Average", emoji: "😊" },
  { val: 4, label: "Clean", emoji: "✨" },
  { val: 5, label: "Spotless", emoji: "🧹" },
];

const STEP_ENCOURAGEMENT = [
  "Let's start! 🚀",
  "Great choice! 🎯",
  "Love your style! ✨",
  "You're a vibe! 🎶",
  "Halfway there! 🔥",
  "Keep going! 💪",
  "Almost done! 🏁",
  "So close! 🎉",
  "Last one! 🙌",
  "One more thing! 💰",
];

// ─── Types ───────────────────────────────────────────────────────────
interface WizardData {
  food_preference: string;
  travel_style: string;
  activity_preferences: string[];
  energy_level: string;
  social_personality: string;
  cleanliness_preference: number;
  drinking_preference: string;
  smoking_preference: string;
  languages: string[];
  trip_behavior: string;
  ideal_trip_type: string;
  budget_min: string;
  budget_max: string;
}

interface Props {
  onComplete: () => void;
  onClose?: () => void;
  editMode?: boolean;
  initialData?: Partial<WizardData> | null;
  initialBudget?: { budget_min: number; budget_max: number } | null;
  showBudgetStep?: boolean;
}

export default function CompatibilityWizard({
  onComplete,
  onClose,
  editMode = false,
  initialData,
  initialBudget,
  showBudgetStep = true,
}: Props) {
  const TOTAL_STEPS = showBudgetStep ? 10 : 9;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [, setSlideDir] = useState<"left" | "right">("left");

  const [data, setData] = useState<WizardData>({
    food_preference: "",
    travel_style: "",
    activity_preferences: [],
    energy_level: "",
    social_personality: "",
    cleanliness_preference: 3,
    drinking_preference: "",
    smoking_preference: "",
    languages: [],
    trip_behavior: "",
    ideal_trip_type: "",
    budget_min: "",
    budget_max: "",
  });

  // Pre-fill in edit mode
  useEffect(() => {
    if (initialData) {
      setData((prev) => ({
        ...prev,
        food_preference: initialData.food_preference || "",
        travel_style: initialData.travel_style || "",
        activity_preferences: initialData.activity_preferences || [],
        energy_level: initialData.energy_level || "",
        social_personality: initialData.social_personality || "",
        cleanliness_preference: initialData.cleanliness_preference || 3,
        drinking_preference: initialData.drinking_preference || "",
        smoking_preference: initialData.smoking_preference || "",
        languages: initialData.languages || [],
        trip_behavior: initialData.trip_behavior || "",
        ideal_trip_type: initialData.ideal_trip_type || "",
      }));
    }
    if (initialBudget) {
      setData((prev) => ({
        ...prev,
        budget_min: initialBudget.budget_min?.toString() || "",
        budget_max: initialBudget.budget_max?.toString() || "",
      }));
    }
  }, [initialData, initialBudget]);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return !!data.food_preference;
      case 1: return !!data.travel_style;
      case 2: return data.activity_preferences.length > 0;
      case 3: return !!data.energy_level;
      case 4: return !!data.social_personality;
      case 5: return data.cleanliness_preference >= 1 && data.cleanliness_preference <= 5;
      case 6: return !!data.drinking_preference && !!data.smoking_preference;
      case 7: return data.languages.length > 0;
      case 8: return !!data.trip_behavior && !!data.ideal_trip_type;
      case 9: {
        if (!showBudgetStep) return true;
        const min = parseInt(data.budget_min);
        const max = parseInt(data.budget_max);
        return !isNaN(min) && !isNaN(max) && min > 0 && max > 0 && min <= max;
      }
      default: return false;
    }
  }, [step, data, showBudgetStep]);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setSlideDir("left");
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setSlideDir("right");
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const method = editMode ? "PUT" : "POST";
      const profilePayload = {
        food_preference: data.food_preference,
        travel_style: data.travel_style,
        activity_preferences: data.activity_preferences,
        energy_level: data.energy_level,
        social_personality: data.social_personality,
        cleanliness_preference: data.cleanliness_preference,
        drinking_preference: data.drinking_preference,
        smoking_preference: data.smoking_preference,
        languages: data.languages,
        trip_behavior: data.trip_behavior,
        ideal_trip_type: data.ideal_trip_type,
        ...(showBudgetStep && data.budget_min && data.budget_max ? {
          budget_min: parseInt(data.budget_min),
          budget_max: parseInt(data.budget_max),
        } : {}),
      };

      const res = await fetch("/api/compatibility", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Something went wrong");
        setSaving(false);
        return;
      }

      // If budget is separate (edit mode without budget step), save budget separately
      if (!showBudgetStep && data.budget_min && data.budget_max) {
        await fetch("/api/compatibility/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budget_min: parseInt(data.budget_min),
            budget_max: parseInt(data.budget_max),
          }),
        });
      }

      onComplete();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (field: "activity_preferences" | "languages", value: string) => {
    setData((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS - 1;

  // ─── Card Component ──────────────────────────────────────────────
  const SelectCard = ({
    selected,
    onClick,
    emoji,
    label,
    desc,
    compact,
  }: {
    selected: boolean;
    onClick: () => void;
    emoji: string;
    label: string;
    desc?: string;
    compact?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-w-0 w-full overflow-hidden text-left rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
        compact ? "p-3.5" : "p-5"
      } ${
        selected
          ? "border-orange-500 bg-gradient-to-br from-orange-50 to-rose-50 shadow-md shadow-orange-500/10 scale-[1.02]"
          : "border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm hover:scale-[1.01]"
      }`}
    >
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="flex min-w-0 items-center gap-3">
        <span className={`${compact ? "text-xl" : "text-2xl"} shrink-0 group-hover:scale-110 transition-transform`}>{emoji}</span>
        <div>
          <p className={`font-bold ${selected ? "text-orange-700" : "text-slate-800"} ${compact ? "text-sm" : "text-base"}`}>
            {label}
          </p>
          {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
        </div>
      </div>
    </button>
  );

  // ─── Multi-select Chip ────────────────────────────────────────────
  const ToggleChip = ({
    selected,
    onClick,
    emoji,
    label,
  }: {
    selected: boolean;
    onClick: () => void;
    emoji?: string;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
        selected
          ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/10 scale-[1.03]"
          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:scale-[1.01]"
      }`}
    >
      {emoji && <span className="text-base">{emoji}</span>}
      {label}
      {selected && <Check className="w-3.5 h-3.5 text-orange-500" />}
    </button>
  );

  // ─── Step Renderer ─────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // Step 0: Food Preference
      case 0:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Food Preference</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">What&apos;s your go-to diet when traveling?</p>
            <div className="grid grid-cols-1 gap-2.5">
              {FOOD_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  selected={data.food_preference === opt.value}
                  onClick={() => setData({ ...data, food_preference: opt.value })}
                  emoji={opt.emoji}
                  label={opt.label}
                  compact
                />
              ))}
            </div>
          </div>
        );

      // Step 1: Travel Style
      case 1:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Travel Style</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">How do you like to roll?</p>
            <div className="grid grid-cols-1 gap-2.5">
              {TRAVEL_STYLE_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  selected={data.travel_style === opt.value}
                  onClick={() => setData({ ...data, travel_style: opt.value })}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>
        );

      // Step 2: Activities (multi-select)
      case 2:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Activity Preferences</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">Pick everything you love! (select multiple)</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <ToggleChip
                  key={opt.value}
                  selected={data.activity_preferences.includes(opt.value)}
                  onClick={() => toggleArrayItem("activity_preferences", opt.value)}
                  emoji={opt.emoji}
                  label={opt.value}
                />
              ))}
            </div>
            {data.activity_preferences.length > 0 && (
              <p className="text-xs text-orange-500 font-semibold mt-2">
                {data.activity_preferences.length} selected ✓
              </p>
            )}
          </div>
        );

      // Step 3: Energy Level
      case 3:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Energy Level</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">When are you at your best?</p>
            <div className="grid grid-cols-1 gap-2.5">
              {ENERGY_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  selected={data.energy_level === opt.value}
                  onClick={() => setData({ ...data, energy_level: opt.value })}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>
        );

      // Step 4: Social Personality
      case 4:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Social Personality</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">How do you recharge?</p>
            <div className="grid grid-cols-1 gap-2.5">
              {SOCIAL_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  selected={data.social_personality === opt.value}
                  onClick={() => setData({ ...data, social_personality: opt.value })}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>
        );

      // Step 5: Cleanliness
      case 5:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Cleanliness Level</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">How tidy do you like things?</p>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex justify-between mb-4">
                {CLEANLINESS_LABELS.map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setData({ ...data, cleanliness_preference: item.val })}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      data.cleanliness_preference === item.val
                        ? "scale-125"
                        : "opacity-50 hover:opacity-80 hover:scale-105"
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className={`text-[10px] font-bold ${
                      data.cleanliness_preference === item.val ? "text-orange-600" : "text-slate-500"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              {/* Slider track */}
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${((data.cleanliness_preference - 1) / 4) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={data.cleanliness_preference}
                onChange={(e) => setData({ ...data, cleanliness_preference: parseInt(e.target.value) })}
                className="w-full -mt-2 opacity-0 cursor-pointer h-6"
              />
            </div>
          </div>
        );

      // Step 6: Drinking & Smoking
      case 6:
        return (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wine className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">Drinking</h3>
              </div>
              <p className="text-sm text-slate-500 mb-3">Your drinking preference?</p>
              <div className="grid grid-cols-2 gap-2">
                {DRINKING_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    selected={data.drinking_preference === opt.value}
                    onClick={() => setData({ ...data, drinking_preference: opt.value })}
                    emoji={opt.emoji}
                    label={opt.value}
                    compact
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Cigarette className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">Smoking</h3>
              </div>
              <p className="text-sm text-slate-500 mb-3">Your smoking preference?</p>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                {SMOKING_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    selected={data.smoking_preference === opt.value}
                    onClick={() => setData({ ...data, smoking_preference: opt.value })}
                    emoji={opt.emoji}
                    label={opt.value}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        );

      // Step 7: Languages
      case 7:
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Languages Spoken</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">Which languages do you speak? (select multiple)</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <ToggleChip
                  key={lang}
                  selected={data.languages.includes(lang)}
                  onClick={() => toggleArrayItem("languages", lang)}
                  label={lang}
                />
              ))}
            </div>
            {data.languages.length > 0 && (
              <p className="text-xs text-orange-500 font-semibold mt-2">
                {data.languages.length} selected ✓
              </p>
            )}
          </div>
        );

      // Step 8: Trip Behavior & Ideal Trip
      case 8:
        return (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">During a Trip I Usually…</h3>
              </div>
              <p className="text-sm text-slate-500 mb-3">How do you approach planning?</p>
              <div className="grid grid-cols-1 gap-2">
                {TRIP_BEHAVIOR_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    selected={data.trip_behavior === opt.value}
                    onClick={() => setData({ ...data, trip_behavior: opt.value })}
                    emoji={opt.emoji}
                    label={opt.label}
                    desc={opt.desc}
                    compact
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">My Ideal Trip Is…</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-3">
                {IDEAL_TRIP_OPTIONS.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    selected={data.ideal_trip_type === opt.value}
                    onClick={() => setData({ ...data, ideal_trip_type: opt.value })}
                    emoji={opt.emoji}
                    label={opt.label}
                    desc={opt.desc}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        );

      // Step 9: Budget (only if showBudgetStep)
      case 9:
        if (!showBudgetStep) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-slate-900">Trip Budget Range</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">What&apos;s your typical per-trip budget?</p>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Minimum Budget (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  value={data.budget_min}
                  onChange={(e) => setData({ ...data, budget_min: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-slate-900 font-medium transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Maximum Budget (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  value={data.budget_max}
                  onChange={(e) => setData({ ...data, budget_max: e.target.value })}
                  placeholder="e.g. 15000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-slate-900 font-medium transition"
                />
              </div>
              {data.budget_min && data.budget_max && parseInt(data.budget_min) > parseInt(data.budget_max) && (
                <p className="text-xs text-rose-500 font-semibold">⚠️ Min budget cannot exceed max budget</p>
              )}
              {data.budget_min && data.budget_max && parseInt(data.budget_min) <= parseInt(data.budget_max) && parseInt(data.budget_min) > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    ₹{parseInt(data.budget_min).toLocaleString('en-IN')} – ₹{parseInt(data.budget_max).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 px-6 py-5 shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10 flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {editMode ? "Edit Your Travel DNA" : "Your Travel DNA"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {STEP_ENCOURAGEMENT[step] || "Let's go!"}
              </p>
            </div>
            {(editMode || onClose) && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="relative z-10">
            <div className="flex items-center justify-between text-[10px] text-white/80 font-bold mb-1.5">
              <span>Step {step + 1} of {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div
            key={step}
            className={`animate-slide-up`}
          >
            {renderStep()}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              step === 0
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || saving}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editMode ? "Save Changes" : "Complete Profile"}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-sm font-bold shadow-md shadow-orange-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

