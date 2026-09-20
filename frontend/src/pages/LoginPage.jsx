import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SunsetBackground } from "@/components/ui/SunsetBackground";
import { CardStarBorderOrbit } from "@/components/ui/CardStarBorderOrbit";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const cardRef = useRef(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Strictly prevent any scrolling on the login page
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#10172d] select-none">
      <SunsetBackground>
        {/* Coordinate frame matching the 1536x1024 sunset artwork */}
        <div className="pointer-events-auto absolute left-1/2 md:left-[58.9%] top-[18%] md:top-[18%] -translate-x-1/2 z-20 w-[90%] md:w-[27.2%] min-w-[320px] max-w-[420px]">
          <section
            ref={cardRef}
            id="login-card"
            className="relative w-full rounded-[28px] border border-white/10 border-t-white/20 bg-[#10172d]/85 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20"
          >
            {/* Synchronized orbiting star around the card perimeter */}
            <CardStarBorderOrbit cardRef={cardRef} />
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center">
                  <svg
                    viewBox="0 0 120 120"
                    className="h-10 w-10"
                    aria-label="InsTalk logo"
                  >
                    <defs>
                      <linearGradient id="chatTalkGreen" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    {/* Back bubble outline */}
                    <g transform="translate(10 -4)">
                      <path
                        d="M70 22c16.6 0 30 12.6 30 28 0 9.5-5.2 17.9-13.4 22.9v11.4l-12.2-6.8c-1.4.2-2.9.3-4.4.3-16.6 0-30-12.6-30-28S53.4 22 70 22z"
                        fill="none"
                        stroke="url(#chatTalkGreen)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                    </g>
                    {/* Front bubble + inner details */}
                    <g transform="translate(-6 4)">
                      <path
                        d="M46 32c-16.6 0-30 12.6-30 28 0 9.5 5.2 17.9 13.4 22.9v11.4l12.2-6.8c1.4.2 2.9.3 4.4.3 16.6 0 30-12.6 30-28S62.6 32 46 32z"
                        fill="none"
                        stroke="url(#chatTalkGreen)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="46" cy="60" r="22" fill="#a7f3d0" opacity="0.9" />
                      <circle cx="38" cy="60" r="3.6" fill="#0b101b" />
                      <circle cx="46" cy="60" r="3.6" fill="#0b101b" />
                      <circle cx="54" cy="60" r="3.6" fill="#0b101b" />
                    </g>
                  </svg>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  InsTalk
                </h1>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                Sign in to continue to your workspace.
              </p>
            </div>
            <div className="mt-5 sm:mt-6">
              <LoginForm />
            </div>
          </section>
        </div>
      </SunsetBackground>
    </div>
  );
}
