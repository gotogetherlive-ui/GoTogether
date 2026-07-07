"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Trash2, 
  MapPin, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Calendar, 
  Sparkles, 
  Link2,
  Camera,
  Compass,
  Shield,
  User,
  Briefcase,
  Utensils,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  phone_number?: string | null;
  age?: number | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
}


interface LinkedTrip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
}

interface Comment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

interface Story {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  location: string | null;
  trip_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  trip_title: string | null;
  trip_destination: string | null;
  is_liked: boolean;
}

interface ActiveUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_online: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profession: string | null;
  fooding_habit: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface StoriesClientProps {
  currentUser: SessionUser;
  isAdmin: boolean;
  userTrips: LinkedTrip[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const normalizedDateStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const date = new Date(normalizedDateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function SafeAvatar({ 
  avatarUrl, 
  name, 
  sizeClass = "w-10 h-10", 
  textClass = "text-sm",
  onClick 
}: { 
  avatarUrl: string | null | undefined; 
  name: string; 
  sizeClass?: string; 
  textClass?: string;
  onClick?: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name?.charAt(0).toUpperCase() || "U";

  return (
    <div 
      onClick={onClick}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-slate-700 shadow-inner overflow-hidden border border-slate-100 select-none ${onClick ? "cursor-pointer hover:scale-105 transition-all duration-200" : ""}`}
    >
      {avatarUrl && !imgFailed ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover animate-in fade-in duration-200"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={textClass}>{initial}</span>
      )}
    </div>
  );
}


export default function StoriesClient({ currentUser, isAdmin, userTrips }: StoriesClientProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [storiesBlocked, setStoriesBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  // Composer state
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Image Carousels active indexes
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [shareStory, setShareStory] = useState<Story | null>(null);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);
  const [realtimePulse, setRealtimePulse] = useState(false);

  const isProfileComplete = !!(
    currentUser.full_name?.trim() &&
    currentUser.phone_number?.trim() &&
    currentUser.age &&
    currentUser.gender &&
    currentUser.profession &&
    currentUser.fooding_habit
  ) || isAdmin;

  const fileInputRef = useRef<HTMLInputElement>(null);


  const fetchStories = async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const url = new URL("/api/stories", window.location.origin);
      if (!reset && cursor) {
        url.searchParams.set("cursor", cursor);
      }
      url.searchParams.set("limit", "8");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data = await res.json();

      setStoriesBlocked(!!data.storiesBlocked);

      if (data.storiesBlocked) {
        setStories([]);
        setActiveUsers([]);
        setHasMore(false);
        setCursor(null);
      } else {
        if (reset) {
          setStories(data.stories || []);
        } else {
          setStories((prev) => [...prev, ...(data.stories || [])]);
        }
        setActiveUsers(data.activeUsers || []);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchStories(true);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.EventSource) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const es = new EventSource("/api/stories/sse");

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "stories_changed") return;
        setRealtimePulse(true);
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          void fetchStories(true);
          setRealtimePulse(false);
        }, 450);
      } catch {
        // Ignore malformed realtime payloads.
      }
    };

    es.onerror = () => {
      es.close();
      if (refreshTimer) clearTimeout(refreshTimer);
      setRealtimePulse(false);
    };

    return () => {
      es.close();
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const storyId = window.location.hash.replace("#story-", "");
    if (!storyId) return;
    window.setTimeout(() => {
      document.getElementById(`story-${storyId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }, [loading, stories.length]);

  const getStoryShareUrl = (storyId: string) => {
    if (typeof window === "undefined") return `/stories#story-${storyId}`;
    return `${window.location.origin}/stories#story-${storyId}`;
  };

  const getStoryShareText = (story: Story) => {
    const excerpt = story.content.trim().replace(/\s+/g, " ").slice(0, 140);
    return `${story.author_name} shared a GoTogether travel story${story.location ? ` from ${story.location}` : ""}${excerpt ? `: ${excerpt}` : ""}`;
  };

  const copyStoryLink = async (story: Story) => {
    const url = getStoryShareUrl(story.id);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedStoryId(story.id);
      window.setTimeout(() => setCopiedStoryId((current) => (current === story.id ? null : current)), 1800);
    } catch {
      alert("Could not copy the story link. Please try again.");
    }
  };

  const handleShareStory = async (story: Story) => {
    const url = getStoryShareUrl(story.id);
    const text = getStoryShareText(story);
    if (navigator.share) {
      try {
        await navigator.share({ title: "GoTogether Travel Story", text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setShareStory(story);
  };

  const openShareTarget = (story: Story, target: "whatsapp" | "x" | "facebook") => {
    const url = encodeURIComponent(getStoryShareUrl(story.id));
    const text = encodeURIComponent(getStoryShareText(story));
    const targets = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    window.open(targets[target], "_blank", "noopener,noreferrer");
  };

  const fetchUserProfile = async (userId: string) => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/profile/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setSelectedProfile(data.profile);
    } catch (err) {
      console.error(err);
      alert("Failed to load user profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (storiesBlocked && !isAdmin) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      alert("You can upload a maximum of 5 images per story.");
      return;
    }
    setUploading(true);
    try {
      const newImageUrls = [...images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadToCloudinary(file, "gotogether/stories");
        newImageUrls.push(url);
      }
      setImages(newImageUrls);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload some images.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storiesBlocked && !isAdmin) return;
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          images,
          location,
          trip_id: selectedTripId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create story");
      }
      const data = await res.json();

      if (data.success && data.story) {
        setStories((prev) => [data.story, ...prev]);
        setContent("");
        setLocation("");
        setSelectedTripId("");
        setImages([]);
        setComposerExpanded(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to publish your story. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;

    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete story");
      setStories((prev) => prev.filter((story) => story.id !== storyId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete story.");
    }
  };

  const handleToggleLike = async (storyId: string) => {
    if (!isProfileComplete) {
      alert("Please complete your profile in the Dashboard to like stories.");
      return;
    }
    if (storiesBlocked && !isAdmin) {
      alert("Interactions are temporarily disabled.");
      return;
    }


    setStories((prev) =>
      prev.map((story) => {
        if (story.id === storyId) {
          const updatedLike = !story.is_liked;
          return {
            ...story,
            is_liked: updatedLike,
            likes_count: Math.max(0, story.likes_count + (updatedLike ? 1 : -1)),
          };
        }
        return story;
      })
    );

    try {
      const res = await fetch(`/api/stories/${storyId}/like`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to toggle like");
      }
      const data = await res.json();
      setStories((prev) =>
        prev.map((story) => {
          if (story.id === storyId) {
            return {
              ...story,
              is_liked: data.liked,
              likes_count: data.likesCount,
            };
          }
          return story;
        })
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to toggle like.");
      fetchStories(true);
    }
  };

  const handleToggleCommentsSection = async (storyId: string) => {
    const isExpanded = !expandedComments[storyId];
    setExpandedComments((prev) => ({ ...prev, [storyId]: isExpanded }));

    if (isExpanded && !comments[storyId]) {
      await fetchComments(storyId);
    }
  };

  const fetchComments = async (storyId: string) => {
    setLoadingComments((prev) => ({ ...prev, [storyId]: true }));
    try {
      const res = await fetch(`/api/stories/${storyId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments((prev) => ({ ...prev, [storyId]: data.comments || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  const handlePostComment = async (storyId: string) => {
    if (storiesBlocked && !isAdmin) {
      alert("Interactions are temporarily disabled.");
      return;
    }
    const commentText = commentInputs[storyId];
    if (!commentText || !commentText.trim()) return;

    setSubmittingComment((prev) => ({ ...prev, [storyId]: true }));
    try {
      const res = await fetch(`/api/stories/${storyId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to post comment");
      }
      const data = await res.json();

      if (data.success && data.comment) {
        setComments((prev) => ({
          ...prev,
          [storyId]: [...(prev[storyId] || []), data.comment],
        }));
        setCommentInputs((prev) => ({ ...prev, [storyId]: "" }));
        setStories((prev) =>
          prev.map((s) => (s.id === storyId ? { ...s, comments_count: s.comments_count + 1 } : s))
        );
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to post comment.");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  const handleDeleteComment = async (storyId: string, commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await fetch(`/api/stories/${storyId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comment");

      setComments((prev) => ({
        ...prev,
        [storyId]: prev[storyId].filter((c) => c.id !== commentId),
      }));

      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, comments_count: Math.max(0, s.comments_count - 1) } : s))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment.");
    }
  };

  const handleCarouselPrev = (storyId: string, length: number) => {
    setCarouselIndexes((prev) => {
      const current = prev[storyId] || 0;
      const nextIndex = current === 0 ? length - 1 : current - 1;
      return { ...prev, [storyId]: nextIndex };
    });
  };

  const handleCarouselNext = (storyId: string, length: number) => {
    setCarouselIndexes((prev) => {
      const current = prev[storyId] || 0;
      const nextIndex = current === length - 1 ? 0 : current + 1;
      return { ...prev, [storyId]: nextIndex };
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center gap-0.5 shadow-sm">
            👑 Admin
          </span>
        );
      case "business":
        return (
          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-full flex items-center gap-0.5 shadow-sm">
            🏢 Verified Host
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 md:px-0 pb-16">
      
      {/* Premium Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white rounded-3xl p-6 md:p-10 mb-8 relative overflow-hidden shadow-xl shadow-purple-900/20 border border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>GoTogether Social Feed</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Travel Stories
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-md">
            Share your beautiful trip moments, photos, and adventure logs with the community. Link past trips and discover travel buddies!
          </p>
        </div>
      </div>

      {realtimePulse && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 shadow-sm animate-in fade-in duration-200">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Fresh stories are syncing...
        </div>
      )}

      {/* Global Stories Freeze Banner (Admin system) */}
      {storiesBlocked && (
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white rounded-2xl p-6 text-center shadow-lg mb-8 border border-orange-400/30 flex flex-col items-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-amber-100" />
          </div>
          <h2 className="text-lg font-bold">Feed Temporarily Paused</h2>
          <p className="text-white/95 text-xs md:text-sm mt-1 max-w-md leading-relaxed font-medium">
            The travel stories social feed has been temporarily paused by the administrator. Posting, liking, commenting, and feed loading are temporarily restricted. Please check back later!
          </p>
        </div>
      )}

      {/* Stories Disabled State Cover */}
      {!storiesBlocked && (
        <>
          {/* Active Users Horizontal Bar (Instagram-style) */}
          {activeUsers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm shadow-slate-100 mb-6 overflow-hidden">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                Recently Active Travelers
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {activeUsers.map((u) => {
                  const online = u.is_online;
                  return (
                    <button
                      key={u.id}
                      onClick={() => fetchUserProfile(u.id)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
                    >
                      <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-all duration-300 shadow-sm">
                        <div className="p-0.5 bg-white rounded-full">
                          <SafeAvatar
                            avatarUrl={u.avatar_url}
                            name={u.full_name}
                            sizeClass="w-14 h-14"
                            textClass="text-lg"
                          />
                        </div>
                        {online && (
                          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-700 max-w-[72px] truncate group-hover:text-indigo-600 transition-colors">
                        {u.full_name?.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Story Composer / Incomplete Profile Warning */}
          {!isProfileComplete ? (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Profile Incomplete</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-semibold">
                    Complete your profile details in the Dashboard to unlock posting travel stories, liking, and commenting!
                  </p>
                </div>
              </div>
              <Link 
                href="/dashboard" 
                className="w-full md:w-auto text-center px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            /* Story Composer */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100 mb-8 overflow-hidden transition-all duration-300">
              <form onSubmit={handleCreateStory}>
                <div className="p-4 flex gap-3">
                  <SafeAvatar
                    avatarUrl={currentUser.avatar_url}
                    name={currentUser.full_name}
                    sizeClass="w-10 h-10"
                    textClass="text-sm"
                    onClick={() => fetchUserProfile(currentUser.id)}
                  />
                  
                  <div className="flex-1">
                    <textarea
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (!composerExpanded) setComposerExpanded(true);
                      }}
                      onFocus={() => setComposerExpanded(true)}
                      placeholder="Where did you explore? Share your adventure details..."
                      className="w-full min-h-[44px] max-h-48 py-2 border-0 outline-none text-slate-800 placeholder-slate-400 font-medium resize-none text-sm focus:ring-0"
                      style={{ height: composerExpanded ? "120px" : "44px", transition: "height 0.2s ease" }}
                    />
                  </div>
                </div>

                {composerExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 transition-all duration-200">
                    {images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-4">
                        {images.map((url, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden group shadow-sm border border-slate-200 bg-white">
                            <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {images.length < 5 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-slate-500 transition-colors bg-white/70"
                          >
                            <Plus className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">Add</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Add location (e.g. Manali, India)"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                        />
                      </div>

                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={selectedTripId}
                          onChange={(e) => setSelectedTripId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 appearance-none"
                        >
                          <option value="">Link to a trip (Optional)</option>
                          {userTrips.map((trip) => (
                            <option key={trip.id} value={trip.id}>
                              {trip.destination} ({trip.title.length > 25 ? `${trip.title.substring(0, 25)}...` : trip.title})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        {images.length === 0 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                            <span>Add Photos (Max 5)</span>
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setContent("");
                            setLocation("");
                            setSelectedTripId("");
                            setImages([]);
                            setComposerExpanded(false);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || uploading || !content.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Publish</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

        </>
      )}

      {/* Main Feed */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/6" />
                </div>
              </div>
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Compass className="w-8 h-8 text-indigo-500 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">No Travel Stories Yet</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto mb-6">
            {storiesBlocked 
              ? "The travel stories feed is temporarily paused by the administrator."
              : "Be the first to share your adventures, travel snaps, or details of your latest expedition!"
            }
          </p>
          {!storiesBlocked && (
            <button
              onClick={() => {
                setComposerExpanded(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 hover:shadow-lg transition-all"
            >
              Post Your First Story
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {stories.map((story) => {
            const activeCarouselIdx = carouselIndexes[story.id] || 0;
            const hasImages = story.images && story.images.length > 0;
            const canDelete = story.user_id === currentUser.id || isAdmin;

            return (
              <article 
                key={story.id}
                id={`story-${story.id}`}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100 overflow-hidden transition-all duration-300 animate-in fade-in scroll-mt-28"
              >
                {/* Header info */}
                <div className="p-4 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <SafeAvatar
                      avatarUrl={story.author_avatar}
                      name={story.author_name}
                      sizeClass="w-10 h-10"
                      textClass="text-sm"
                      onClick={() => fetchUserProfile(story.user_id)}
                    />

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={() => fetchUserProfile(story.user_id)}
                          className="text-sm font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                        >
                          {story.author_name}
                        </span>
                        {getRoleBadge(currentUser.id === story.user_id ? currentUser.role : "regular")}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                        {timeAgo(story.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShareStory(story)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200"
                      title="Share story"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {story.location && (
                  <div className="px-4 pb-2 -mt-1 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{story.location}</span>
                  </div>
                )}

                <div className="px-4 py-2 text-slate-700 text-sm font-medium whitespace-pre-line leading-relaxed">
                  {story.content}
                </div>

                {hasImages && (
                  <div className="relative w-full aspect-[4/3] bg-slate-950 flex items-center justify-center group border-y border-slate-100">
                    <img
                      src={story.images[activeCarouselIdx]}
                      alt="Adventure"
                      className="w-full h-full object-cover select-none"
                    />

                    {story.images.length > 1 && (
                      <>
                        <button
                          onClick={() => handleCarouselPrev(story.id, story.images.length)}
                          className="absolute left-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCarouselNext(story.id, story.images.length)}
                          className="absolute right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-full">
                          {story.images.map((_, dotIdx) => (
                            <span
                              key={dotIdx}
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                activeCarouselIdx === dotIdx ? "bg-white scale-125" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {story.trip_id && story.trip_title && (
                  <div className="mx-4 my-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3 group/trip hover:border-indigo-300 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 flex-shrink-0 group-hover/trip:scale-105 transition-transform duration-200">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Linked Trip</span>
                        <p className="text-xs font-bold text-slate-800 truncate">{story.trip_title}</p>
                        <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Destination: {story.trip_destination}</span>
                      </div>
                    </div>
                    <Link
                      href={`/trips/${story.trip_id}`}
                      className="text-[10px] font-bold text-indigo-600 border border-indigo-200 group-hover/trip:bg-indigo-600 group-hover/trip:text-white px-2.5 py-1 rounded-lg transition-all"
                    >
                      View Trip
                    </Link>
                  </div>
                )}

                {/* Interactions Row */}
                <div className="p-3 border-t border-slate-50 flex items-center gap-6">
                  <button
                    onClick={() => handleToggleLike(story.id)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 font-bold text-xs transition-colors group/like"
                  >
                    <div className={`p-1.5 rounded-lg group-hover/like:bg-rose-50 transition-colors ${story.is_liked ? "text-rose-500" : ""}`}>
                      <Heart 
                        className={`w-5 h-5 transition-transform duration-200 ${
                          story.is_liked ? "fill-rose-500 scale-125" : "group-hover/like:scale-110"
                        }`} 
                      />
                    </div>
                    <span>{story.likes_count} Likes</span>
                  </button>

                  <button
                    onClick={() => handleToggleCommentsSection(story.id)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-bold text-xs transition-colors group/comment"
                  >
                    <div className={`p-1.5 rounded-lg group-hover/comment:bg-indigo-50 transition-colors ${expandedComments[story.id] ? "text-indigo-600" : ""}`}>
                      <MessageCircle className="w-5 h-5 group-hover/comment:scale-110 transition-transform" />
                    </div>
                    <span>{story.comments_count} Comments</span>
                  </button>

                  <button
                    onClick={() => handleShareStory(story)}
                    className="ml-auto flex items-center gap-1.5 text-slate-500 hover:text-sky-600 font-bold text-xs transition-colors group/share"
                  >
                    <div className="p-1.5 rounded-lg group-hover/share:bg-sky-50 transition-colors">
                      <Share2 className="w-5 h-5 group-hover/share:scale-110 transition-transform" />
                    </div>
                    <span>Share</span>
                  </button>
                </div>

                {expandedComments[story.id] && (
                  <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-3">
                      {loadingComments[story.id] && (!comments[story.id] || comments[story.id].length === 0) ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                      ) : !comments[story.id] || comments[story.id].length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold text-center py-2">No comments yet. Be the first to say something!</p>
                      ) : (
                        comments[story.id].map((comment) => {
                          const canDeleteComment = comment.user_id === currentUser.id || isAdmin;
                          return (
                            <div key={comment.id} className="flex gap-2.5 items-start text-xs group/comment-item">
                              <SafeAvatar
                                avatarUrl={comment.author_avatar}
                                name={comment.author_name}
                                sizeClass="w-7 h-7"
                                textClass="text-[10px]"
                                onClick={() => fetchUserProfile(comment.user_id)}
                              />

                              <div className="bg-white border border-slate-100 p-2.5 rounded-2xl flex-1 shadow-sm">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span 
                                    onClick={() => fetchUserProfile(comment.user_id)}
                                    className="font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                  >
                                    {comment.author_name}
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-400">{timeAgo(comment.created_at)}</span>
                                </div>
                                <p className="text-slate-600 font-medium whitespace-pre-wrap">{comment.content}</p>
                              </div>

                              {canDeleteComment && (
                                <button
                                  onClick={() => handleDeleteComment(story.id, comment.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all self-center opacity-0 group-hover/comment-item:opacity-100"
                                  title="Delete Comment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                      <input
                        type="text"
                        disabled={!isProfileComplete || (storiesBlocked && !isAdmin)}
                        value={commentInputs[story.id] || ""}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [story.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePostComment(story.id);
                          }
                        }}
                        placeholder={
                          !isProfileComplete 
                            ? "Complete your profile to comment..."
                            : (storiesBlocked && !isAdmin ? "Interactions are frozen..." : "Add a comment...")
                        }
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() => handlePostComment(story.id)}
                        disabled={!isProfileComplete || (storiesBlocked && !isAdmin) || submittingComment[story.id] || !(commentInputs[story.id]?.trim())}
                        className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center flex-shrink-0"
                      >

                        {submittingComment[story.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {hasMore && !storiesBlocked && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchStories(false)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Loading more stories...</span>
              </>
            ) : (
              <span>Load More Stories</span>
            )}
          </button>
        </div>
      )}

      {shareStory && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="w-full md:max-w-md bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl border border-white/80 overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200">
            <div className="relative h-28 bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400">
              {shareStory.images?.[0] && (
                <img src={shareStory.images[0]} alt="Story preview" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70" />
              )}
              <button
                onClick={() => setShareStory(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                aria-label="Close share sheet"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute left-5 bottom-4 text-white">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Share Story</p>
                <h3 className="text-xl font-extrabold leading-tight">Send this moment</h3>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <SafeAvatar avatarUrl={shareStory.author_avatar} name={shareStory.author_name} sizeClass="w-10 h-10" textClass="text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-800 truncate">{shareStory.author_name}</p>
                    {shareStory.location && <span className="text-[10px] font-bold text-sky-600 truncate">{shareStory.location}</span>}
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-2">{shareStory.content}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => openShareTarget(shareStory, "whatsapp")} className="group flex flex-col items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-extrabold group-hover:scale-105 transition-transform">WA</span>
                  <span className="text-[10px] font-bold">WhatsApp</span>
                </button>
                <button onClick={() => openShareTarget(shareStory, "x")} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-800 hover:bg-slate-100 transition-colors">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white text-sm font-extrabold group-hover:scale-105 transition-transform">X</span>
                  <span className="text-[10px] font-bold">X</span>
                </button>
                <button onClick={() => openShareTarget(shareStory, "facebook")} className="group flex flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700 hover:bg-blue-100 transition-colors">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-extrabold group-hover:scale-105 transition-transform">f</span>
                  <span className="text-[10px] font-bold">Facebook</span>
                </button>
                <button onClick={() => copyStoryLink(shareStory)} className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 p-3 text-violet-700 hover:bg-violet-100 transition-colors">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white group-hover:scale-105 transition-transform">
                    {copiedStoryId === shareStory.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </span>
                  <span className="text-[10px] font-bold">{copiedStoryId === shareStory.id ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">{getStoryShareUrl(shareStory.id)}</span>
                <button onClick={() => copyStoryLink(shareStory)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-extrabold text-white hover:bg-slate-800 transition-colors">
                  {copiedStoryId === shareStory.id ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* User Profile Modal Overlay */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-100 animate-in scale-in duration-200">
            {/* Top Close Button */}
            <button 
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Cover Photo Decorator */}
            <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />

            {/* User Details Section */}
            <div className="px-6 pb-6 flex flex-col items-center -mt-12 relative z-10">
              {/* User Avatar Circle */}
              <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md flex items-center justify-center">
                <SafeAvatar
                  avatarUrl={selectedProfile.avatar_url}
                  name={selectedProfile.full_name}
                  sizeClass="w-full h-full"
                  textClass="text-3xl"
                />
              </div>

              {/* Basic Info */}
              <div className="mt-3 flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xl font-bold text-slate-800">{selectedProfile.full_name}</h3>
                  {getRoleBadge(selectedProfile.role)}
                </div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
                  @{selectedProfile.username}
                </span>
              </div>

              {/* Bio Block */}
              <p className="text-slate-500 text-xs font-semibold text-center mt-4 max-w-xs leading-relaxed italic">
                {selectedProfile.bio ? `"${selectedProfile.bio}"` : "No biography shared yet."}
              </p>

              {/* Divider */}
              <div className="h-px bg-slate-100 w-full my-5" />

              {/* Detailed Specs Grid */}
              <div className="w-full grid grid-cols-2 gap-3 text-left">
                {/* Age & Gender */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-orange-500 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Basic Info</span>
                    <span className="text-xs font-bold text-slate-700">
                      {selectedProfile.age ? `${selectedProfile.age}y` : "—"} · {selectedProfile.gender || "—"}
                    </span>
                  </div>
                </div>

                {/* Profession */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Profession</span>
                    <span className="text-xs font-bold text-slate-700 truncate block">
                      {selectedProfile.profession || "—"}
                    </span>
                  </div>
                </div>

                {/* Food Habits */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Food habit</span>
                    <span className="text-xs font-bold text-slate-700">
                      {selectedProfile.fooding_habit || "—"}
                    </span>
                  </div>
                </div>

                {/* Joined Date */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-purple-500 flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Member Since</span>
                    <span className="text-xs font-bold text-slate-700">
                      {selectedProfile.created_at 
                        ? new Date(selectedProfile.created_at.includes("T") ? selectedProfile.created_at : selectedProfile.created_at.replace(" ", "T") + "Z").toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) 
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <button
                onClick={() => setSelectedProfile(null)}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Loading spinner */}
      {loadingProfile && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-sm text-slate-700 border border-slate-100">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            <span>Opening Profile...</span>
          </div>
        </div>
      )}

    </div>
  );
}
