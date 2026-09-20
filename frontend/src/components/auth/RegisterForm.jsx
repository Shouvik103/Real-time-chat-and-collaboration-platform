import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { EnvelopeIcon, LockClosedIcon, UserIcon, ArrowLeftIcon, KeyIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/hooks/useAuth";

export function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP verification

  // Step 1 State
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Step 2 State
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Cooldown countdown effect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const validatePassword = (pass) => {
    if (!pass || pass.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (pass.length > 128) {
      return "Password must be at most 128 characters";
    }
    const hasLower = /[a-z]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[\W_]/.test(pass);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      return "Must contain uppercase, lowercase, number, and a special character or symbol (e.g. ! @ # $ - _)";
    }
    return "";
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (passwordError) {
      setPasswordError(validatePassword(val));
    }
    if (confirm) {
      if (val === confirm) {
        setConfirmError("");
      } else {
        setConfirmError("Passwords do not match");
      }
    }
  };

  const handleConfirmChange = (val) => {
    setConfirm(val);
    if (password && val !== password) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  };

  // Step 1: Validate inputs and request OTP
  const handleProceedToOtp = async (e) => {
    e.preventDefault();

    // 1. Validate Display Name
    if (!displayName || displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }

    // 2. Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    // 3. Validate Password complexity before sending OTP email
    const passErr = validatePassword(password);
    if (passErr) {
      setPasswordError(passErr);
      toast.error(passErr);
      return;
    }
    setPasswordError("");

    // 4. Validate Confirm Password match
    if (password !== confirm) {
      setConfirmError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    setConfirmError("");

    // ONLY send OTP if password and all fields are verified valid
    setIsSendingOtp(true);
    try {
      const res = await authApi.sendOtp({ email: email.trim() });
      toast.success(res.data?.data?.message || "Verification code sent to your email!");
      setStep(2);
      setCountdown(res.data?.data?.cooldownSeconds || 60);
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to send verification code";
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsSendingOtp(true);
    try {
      const res = await authApi.sendOtp({ email: email.trim() });
      toast.success("New verification code sent!");
      setCountdown(res.data?.data?.cooldownSeconds || 60);
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to resend code";
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Submit all details + OTP
  const handleVerifyAndRegister = (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    register({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      otp: otp.trim(),
    });
  };

  return (
    <div className="space-y-4">
      {step === 1 ? (
        // ── STEP 1: Account Details ─────────────────────────────────────────
        <form onSubmit={handleProceedToOtp} className="space-y-4">
          <Input
            id="register-displayName"
            name="displayName"
            label="Display Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            leftAddon={<UserIcon className="h-4 w-4" />}
          />

          <Input
            id="register-email"
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leftAddon={<EnvelopeIcon className="h-4 w-4" />}
          />

          <Input
            id="register-password"
            name="password"
            label="Password"
            type="password"
            placeholder="At least 8 characters (supports Google suggestions)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onInput={(e) => handlePasswordChange(e.target.value)}
            required
            error={passwordError}
            leftAddon={<LockClosedIcon className="h-4 w-4" />}
          />

          <Input
            id="register-confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => handleConfirmChange(e.target.value)}
            onInput={(e) => handleConfirmChange(e.target.value)}
            required
            error={confirmError}
            leftAddon={<LockClosedIcon className="h-4 w-4" />}
          />

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#008B8B] text-white hover:bg-[#007373] transition-all duration-300 font-medium text-sm"
            loading={isSendingOtp}
          >
            Continue to Verification
          </Button>

          {/* OAuth option — authentic Google account verification */}
          <div className="relative flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
              or continue with
            </span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <div className="flex items-center justify-center">
            <a
              href={`${import.meta.env.VITE_API_URL || ""}/api/auth/google`}
              className="flex items-center justify-center gap-2.5 h-10 px-8 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all duration-200 w-full max-w-[220px]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </a>
          </div>

          <p className="text-center text-sm text-slate-400 pt-1">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-300 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        // ── STEP 2: OTP Verification ────────────────────────────────────────
        <form onSubmit={handleVerifyAndRegister} className="space-y-4">
          <div className="text-center pb-1">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#008B8B]/20 text-[#008B8B] mb-2 border border-[#008B8B]/30">
              <KeyIcon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Verify Your Email</h3>
            <p className="text-xs text-slate-400 mt-1">
              We sent a 6-digit code to <span className="text-emerald-300 font-medium">{email}</span>
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 block text-center">
              Enter 6-Digit Code
            </label>
            <input
              id="register-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full h-13 text-center tracking-[0.6em] text-2xl font-mono font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300/40 transition-all"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#008B8B] text-white hover:bg-[#007373] transition-all duration-300 font-medium text-sm"
            loading={isRegistering}
            disabled={otp.length !== 6}
          >
            Verify & Create Account
          </Button>

          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Change email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={countdown > 0 || isSendingOtp}
              className={`font-medium transition-colors ${
                countdown > 0
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-emerald-300 hover:underline cursor-pointer"
              }`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
            Check your spam folder if you don't see the email in your inbox.
          </p>
        </form>
      )}
    </div>
  );
}
