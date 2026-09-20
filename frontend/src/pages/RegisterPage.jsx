import { RegisterForm } from "@/components/auth/RegisterForm";
import { SunsetBackground } from "@/components/ui/SunsetBackground";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#10172d] flex items-center justify-center md:justify-end px-4 sm:px-8 md:px-14 lg:px-24 xl:px-32">
      <SunsetBackground />
      <div className="relative z-10 my-auto flex min-h-screen w-full max-w-[450px] items-center justify-center py-8">
        <section
          id="register-card"
          className="w-full rounded-[30px] border border-white/10 border-t-white/20 bg-[#0b101b]/85 p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center">
                <svg
                  viewBox="0 0 120 120"
                  className="h-12 w-12"
                  aria-label="InsTalk logo"
                >
                  <defs>
                    <linearGradient id="chatTalkGreen" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
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
              <h1 className="font-display text-4xl font-bold tracking-tight text-white">
                InsTalk
              </h1>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Create an account to get started.
            </p>
          </div>
          <div className="mt-6">
            <RegisterForm />
          </div>
        </section>
      </div>
    </div>
  );
}
