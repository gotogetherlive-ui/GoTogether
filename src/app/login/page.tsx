"use client";

import Link from "next/link";
import { Compass, Eye, EyeOff, Loader2, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { Suspense, useState, useTransition, useEffect, useRef, useCallback } from "react";
import { signIn } from "@/app/actions/auth";
import { useSearchParams, useRouter } from "next/navigation";
import AnimatedButton from "@/components/AnimatedButton";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── OTP Input Component ─────────────────────────────────────────────────────
function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
}: {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  useEffect(() => {
    // Auto-focus first input on mount
    focusInput(0);
  }, [focusInput]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return; // only digits
    const chars = value.split("");
    chars[index] = digit.slice(-1); // take last typed char
    const newVal = chars.join("");
    onChange(newVal);
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        focusInput(index - 1);
        const chars = value.split("");
        chars[index - 1] = "";
        onChange(chars.join(""));
      } else {
        const chars = value.split("");
        chars[index] = "";
        onChange(chars.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted.padEnd(length, " ").slice(0, length));
    focusInput(Math.min(pasted.length, length - 1));
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] && value[i] !== " " ? value[i] : ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition-all duration-200 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:border-slate-300"
          style={{
            caretColor: "transparent",
          }}
        />
      ))}
    </div>
  );
}

// ─── OTP Verification Modal ─────────────────────────────────────────────────
function OtpVerificationModal({
  email,
  maskedEmail,
  onBack,
  onVerified,
}: {
  email: string;
  maskedEmail: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [otp, setOtp] = useState("      "); // 6 spaces
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    const cleanOtp = otp.replace(/\s/g, "");
    if (cleanOtp.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: cleanOtp }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Verification failed.");
        setIsVerifying(false);
        return;
      }

      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      const res = await fetch("/api/auth/email-otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to resend code.");
      } else {
        setResendSuccess(true);
        setResendCooldown(60);
        setOtp("      ");
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch {
      setError("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const cleanOtp = otp.replace(/\s/g, "");
    if (cleanOtp.length === 6 && !isVerifying) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-up"
      >
        {/* Header gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-400 via-rose-400 to-orange-500" />

        <div className="p-8">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to sign up
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center animate-pulse-scale"
            >
              <Mail className="w-9 h-9 text-orange-500" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              Check your email
            </h2>
            <p className="text-slate-500 text-sm">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-slate-700">
                {maskedEmail}
              </span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center animate-shake"
            >
              {error}
            </div>
          )}

          {/* Success */}
          {resendSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm text-center">
              ✓ New code sent successfully!
            </div>
          )}

          {/* OTP Input */}
          <div className="mb-6">
            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={isVerifying}
            />
          </div>

          {/* Verify Button */}
          <AnimatedButton
            onClick={handleVerify}
            disabled={isVerifying || otp.replace(/\s/g, "").length !== 6}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/30 text-sm flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Verify & Create Account
              </>
            )}
          </AnimatedButton>

          {/* Resend */}
          <div className="mt-5 text-center">
            <p className="text-sm text-slate-400 mb-1">
              Didn&apos;t receive the code?
            </p>
            {resendCooldown > 0 ? (
              <p className="text-sm text-slate-400">
                Resend in{" "}
                <span className="font-semibold text-orange-500 tabular-nums">
                  {resendCooldown}s
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-sm text-orange-500 font-semibold hover:text-orange-600 transition-colors disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpMaskedEmail, setOtpMaskedEmail] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Check for OAuth errors in URL
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      setError("Google sign-in failed. Please try again.");
    }
  }, [searchParams]);

  function handleGoogleSignIn() {
    window.location.assign("/api/auth/google");
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    if (isSignUp) {
      // Email OTP flow
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const fullName = formData.get("fullName") as string;

      if (!email || !password || !fullName) {
        setError("All fields are required.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }


      setIsSendingOtp(true);
      try {
        const res = await fetch("/api/auth/email-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || "Failed to send verification code.");
          setIsSendingOtp(false);
          return;
        }

        setOtpEmail(email);
        setOtpMaskedEmail(data.maskedEmail);
        setShowOtpModal(true);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSendingOtp(false);
      }
    } else {
      // Normal sign-in
      startTransition(async () => {
        const result = await signIn(formData);

        if (result?.error) {
          setError(result.error);
        }
        if (result?.success) {
          setSuccess(result.success);
        }
        if (result?.redirectTo) {
          router.replace(result.redirectTo);
          router.refresh();
        }
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* OTP Modal */}
      {showOtpModal && (
        <OtpVerificationModal
          email={otpEmail}
          maskedEmail={otpMaskedEmail}
          onBack={() => {
            setShowOtpModal(false);
            setOtpEmail("");
            setOtpMaskedEmail("");
          }}
          onVerified={() => {
            router.push("/");
          }}
        />
      )}

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative Circles */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-rose-500/10 blur-3xl" />

        <Link href="/" className="flex items-center gap-2 text-white relative z-10">
          <Compass className="w-8 h-8 text-orange-500" />
          <span className="text-2xl font-bold tracking-tight">GoTogether</span>
        </Link>

        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your next adventure<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
              starts here.
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Join thousands of verified travelers and organizers. Explore the world, together.
          </p>
        </div>

        <p className="text-slate-600 text-sm relative z-10">
          © {new Date().getFullYear()} GoTogether
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50/50">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-100/80 p-8 md:p-10 transform transition-all animate-slide-up">
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center gap-2 text-slate-900 lg:hidden mb-8">
            <Compass className="w-8 h-8 text-orange-500 animate-spin-slow" />
            <span className="text-2xl font-extrabold tracking-tight">GoTogether</span>
          </Link>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-slate-500 text-sm mb-8 font-medium">
            {isSignUp
              ? "Start your journey with GoTogether."
              : "Sign in to continue your adventures."}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-shake">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold">
              {success}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-orange-500/30 hover:bg-orange-50/5 text-slate-700 font-bold py-3.5 rounded-2xl transition-all shadow-sm hover:shadow-md text-sm mb-6 active:scale-98"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-4 bg-white text-slate-400 font-extrabold uppercase tracking-widest">
                or continue with email
              </span>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="premium-input"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="premium-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="premium-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || isSendingOtp}
              className="w-full mt-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {isPending || isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignUp ? "Sending Code..." : "Signing In..."}
                </>
              ) : (
                isSignUp ? "Continue — Verify Email" : "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 font-semibold">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-orange-500 font-bold hover:text-orange-600 transition-colors cursor-pointer"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}





