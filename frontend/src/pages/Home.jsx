import ChatWidget from '../components/ChatWidget';
import campusPhoto from '../assets/campus.jpg';

// Fonts: add these once in index.html <head> (or @import at the top of index.css):
// <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">

const FEATURES = [
  {
    label: 'Fees & registration, answered straight',
    detail: "Ask about balances, deadlines or requirements and get a direct answer — no digging through the portal's menus."
  },
  {
    label: 'Knows your college, not just the FAQ',
    detail: 'Understands which college and course you belong to, so answers are specific to you, not a generic help page.'
  },
  {
    label: 'Remembers where you left off',
    detail: "Come back mid-registration or mid-question — it picks up the thread instead of starting over."
  }
];

const STATS = [
  { value: '1922', label: 'Founded' },
  { value: '35,000+', label: 'Students' },
  { value: '10', label: 'Constituent colleges' },
  { value: 'Kampala', label: 'Main campus' }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0C0F] text-[#F3F1EA] flex flex-col">
      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_1fr] gap-10 items-start flex-1 w-full">
        {/* LEFT — chat, the thing people actually came to use */}
        <div className="order-2 lg:order-1">
          <ChatWidget embedded dark />
          <p className="text-sm text-[#9AA0AC] mt-4 font-[Manrope,sans-serif]">
            Start typing anytime — you'll only be asked to log in when you send your first message.
          </p>
        </div>

        {/* RIGHT — same footprint as the chat panel: h-[28rem] card, scrolls
            internally instead of stretching the page when content runs long */}
        <div className="order-1 lg:order-2 relative">
          <div className="h-[28rem] overflow-y-auto rounded-lg border border-white/10 bg-[#0F1013] pl-6 pr-4 py-6 relative">
            {/* Signature element: a beam of light down the left edge — echoes the
                torch on Makerere's crest, standing in for "guidance" through the page */}
            <div
              className="absolute left-0 top-6 bottom-6 w-px bg-gradient-to-b from-[#E3A63E] via-[#E3A63E]/40 to-transparent"
              aria-hidden="true"
            />

            <span className="font-[JetBrains_Mono,monospace] text-xs tracking-[0.2em] text-[#E3A63E] uppercase">
              Makerere · Agentic guide
            </span>

            <h1 className="font-[Fraunces,serif] font-semibold text-4xl leading-[1.05] mt-3">
              Your portal,
              <br />
              explained.
            </h1>

            <p className="text-[#C7CBD3] mt-4 max-w-md font-[Manrope,sans-serif] leading-relaxed text-sm">
              Mak AI reads the student portal so you don't have to — fees, registration,
              results, timetables, resolved in one conversation instead of ten tabs.
            </p>

            {/* Features — not numbered, since there's no real sequence here */}
            <div className="mt-6 space-y-4">
              {FEATURES.map((f) => (
                <div key={f.label} className="border-l border-white/10 pl-4">
                  <h3 className="font-[Manrope,sans-serif] font-medium text-sm text-[#F3F1EA]">{f.label}</h3>
                  <p className="text-xs text-[#9AA0AC] mt-1 font-[Manrope,sans-serif]">{f.detail}</p>
                </div>
              ))}
            </div>

            {/* Campus photo — replace src with a real photo you have rights to use,
                e.g. Makerere's own media kit or a credited Wikimedia Commons shot */}
            <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
              <img
                src={campusPhoto}
                alt="Makerere University's Main Building on Makerere Hill, Kampala"
                className="w-full h-28 object-cover grayscale-[30%]"
              />
            </div>

            {/* Real Makerere facts, not invented stats */}
            <div className="mt-6 grid grid-cols-4 gap-3 font-[JetBrains_Mono,monospace]">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-[#E3A63E] text-base">{s.value}</div>
                  <div className="text-[9px] text-[#9AA0AC] uppercase tracking-wide mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#6B7280] mt-6 font-[Manrope,sans-serif] italic pb-1">
              "We Build for the Future" — Makerere University motto
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/10 mt-4">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 font-[Manrope,sans-serif] text-xs text-[#6B7280]">
          <span>© {new Date().getFullYear()} Mak AI. All rights reserved.</span>
          <span>
            Built by <span className="text-[#E3A63E]">@techKabala</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
