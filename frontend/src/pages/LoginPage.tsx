import { LoginForm } from '@/components/auth/LoginForm';
import { ParticleBackground } from '@/components/ui/ParticleBackground';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b101b]">
      <div className="absolute -top-24 left-[-10%] h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-[160px]" />
      <div className="absolute -bottom-28 right-[-5%] h-[34rem] w-[34rem] rounded-full bg-sky-500/20 blur-[180px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" />

      <ParticleBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-3xl border border-white/10 bg-[#0f1526]/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Secure access
              </p>
              <h2 className="font-display mt-3 text-2xl font-semibold text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to continue to your workspace.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center">
              <svg
                viewBox="0 0 120 120"
                className="h-14 w-14"
                aria-label="ChatTalk logo"
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
          </div>

          <div className="mt-6">
            <LoginForm />
          </div>
        </section>
      </div>
    </div>
  );
}
