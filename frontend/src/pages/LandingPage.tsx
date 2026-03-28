import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, BookOpen, TrendingUp, LineChart, Lightbulb, FileText, Shield } from "lucide-react";

export default function LandingPage() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full bg-white text-foreground">
      
      {/* Hero Section */}
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* Neo-brutalism Market Stalls (Kept unchanged as requested) */}
        <img 
          src="/neo_stall_left.png" 
          alt="" 
          className="absolute left-[-5%] top-1/2 -translate-y-1/2 h-[90vh] object-contain pointer-events-none z-0 mix-blend-multiply" 
        />
        <img 
          src="/neo_stall_right.png" 
          alt="" 
          className="absolute right-[-5%] top-1/2 -translate-y-1/2 h-[90vh] object-contain pointer-events-none z-0 mix-blend-multiply" 
        />

        {/* Top Navbar */}
        <nav className="absolute top-0 left-0 right-0 p-3 md:p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-1.5 md:gap-2 font-black text-sm sm:text-lg md:text-2xl tracking-tighter text-[#222] bg-white px-2 md:px-3 py-1 md:py-1.5 border-[2px] md:border-[3px] border-[#222] shadow-[2px_2px_0px_#222] md:shadow-[4px_4px_0px_#222]">
            <Mic className="w-4 h-4 md:w-6 md:h-6 text-[#2563eb]" />
            Vyapar Saathi
          </div>
          <div className="flex gap-2 md:gap-4 shrink-0">
            <Link to="/login">
              <button className="px-3 md:px-6 py-1.5 md:py-2.5 bg-white text-[#2563eb] border-[2px] md:border-[3px] border-[#222] shadow-[2px_2px_0px_#222] md:shadow-[4px_4px_0px_#222] font-bold text-xs md:text-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-y-[2px] hover:shadow-[4px_4px_0px_#222] md:hover:shadow-[6px_6px_0px_#222]">
                Login
              </button>
            </Link>
            <Link to="/signup">
              <button className="px-3 md:px-6 py-1.5 md:py-2.5 bg-[#2563eb] text-white border-[2px] md:border-[3px] border-[#222] shadow-[2px_2px_0px_#222] md:shadow-[4px_4px_0px_#222] font-bold text-xs md:text-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-y-[2px] hover:shadow-[4px_4px_0px_#222] md:hover:shadow-[6px_6px_0px_#222]">
                Sign Up
              </button>
            </Link>
          </div>
        </nav>

        {/* Main Focus: Cinematic Book Animation */}
        <main className="relative z-10 w-[95%] sm:w-[90%] md:w-[60%] max-w-3xl mx-auto flex items-center justify-center mt-20 h-[300px] sm:h-[400px] md:h-[450px]" style={{ perspective: '2000px' }}>
          
          {/* Book Container */}
          <div 
            className="relative w-full h-full flex transition-transform duration-[3000ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[10px_15px_30px_rgba(0,0,0,0.5)] md:shadow-[20px_30px_50px_rgba(0,0,0,0.5)] rounded-sm"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isOpen ? 'rotateX(5deg) rotateY(0deg) scale(1)' : 'rotateX(25deg) rotateY(-10deg) scale(0.9)',
            }}
          >
            {/* Left Page (Back Cover acting as left page) */}
            <div 
              className="w-1/2 h-full bg-[#fdfbf6] border-[2px] sm:border-[3px] md:border-[4px] border-[#222] border-r-[1px] md:border-r-[2px] rounded-l-md relative overflow-hidden flex flex-col items-center justify-center transition-transform duration-[2500ms] ease-out origin-right"
              style={{ 
                transform: isOpen ? 'rotateY(0deg)' : 'rotateY(10deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Lines */}
              <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 33px, rgba(0,0,0,0.1) 33px, rgba(0,0,0,0.1) 34px)', backgroundPosition: '0 40px' }} />
              {/* Spine shading */}
              <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-0" />
              
              <div className={`transition-opacity duration-[2000ms] delay-[1200ms] flex flex-col items-center justify-center z-10 w-full h-full ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                <h2 className="text-2xl sm:text-5xl md:text-[4.5rem] leading-none font-black text-[#222] tracking-tight mb-3 md:mb-[2.5rem]">Vyapar</h2>
                <p className="font-handwritten text-sm sm:text-2xl md:text-4xl text-[#c2410c] opacity-90 -rotate-[3deg]">
                  व्यापार के साथ भी
                </p>
              </div>
            </div>

            {/* Right Page (Inside of Front Cover) */}
            <div 
              className="w-1/2 h-full bg-[#fdfbf6] border-[2px] sm:border-[3px] md:border-[4px] border-[#222] border-l-[1px] md:border-l-[2px] rounded-r-md relative overflow-hidden flex flex-col items-center justify-center transition-transform duration-[3000ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left"
              style={{ 
                transform: isOpen ? 'rotateY(0deg)' : 'rotateY(-179deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Front Cover surface - faces user when rotateY is approx -180 */}
              <div 
                className="absolute inset-0 bg-[#e11d48] border-[2px] md:border-[4px] border-[#222] rounded-r-md flex items-center justify-center z-20"
                style={{ 
                  transform: 'rotateY(180deg) translateZ(1px)',
                  backfaceVisibility: 'hidden' 
                }}
              >
                 <div className="w-[85%] h-[92%] border-[2px] md:border-[4px] border-[#222] flex flex-col items-center justify-center bg-[#be123c] shadow-[inset_0px_0px_10px_rgba(0,0,0,0.3)] md:shadow-[inset_0px_0px_20px_rgba(0,0,0,0.3)]">
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-[#F9F4E8] tracking-widest uppercase border-y-[2px] md:border-y-[4px] border-[#F9F4E8] py-2 px-4 md:py-3 md:px-8">
                      Khaata
                    </h1>
                 </div>
              </div>

              {/* Right Page Contents */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#fdfbf6] z-10"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 33px, rgba(0,0,0,0.1) 33px, rgba(0,0,0,0.1) 34px)', backgroundPosition: '0 40px' }} />
                <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-0" />
                
                {/* Ribbon Bookmark */}
                <div className="absolute top-0 right-[15%] md:right-[20%] w-6 sm:w-8 md:w-12 h-20 sm:h-28 md:h-36 bg-[#e11d48] border-[2px] md:border-[4px] border-t-0 border-[#222] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] md:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] z-0 flex items-end justify-center pb-2">
                  <div className="w-full h-3 md:h-6 bg-[#be123c] opacity-50"></div>
                </div>

                <div className={`transition-opacity duration-[2000ms] delay-[1200ms] flex flex-col items-center justify-center z-10 w-full h-full pt-[1rem] md:pt-[2rem] ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                  <h2 className="text-2xl sm:text-5xl md:text-[4.5rem] leading-none font-black text-[#222] tracking-tight mb-3 md:mb-[2.5rem]">Saathi</h2>
                  <p className="font-handwritten text-sm sm:text-2xl md:text-4xl text-[#c2410c] opacity-90 -rotate-[3deg]">
                    व्यापार के बाद भी
                  </p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* How It Works Section */}
      <div className="w-full bg-[#fdfbf6] py-24 border-t-[4px] border-[#222]">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-16 text-[#222]">How It Works</h2>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1. Speak', desc: 'Record your daily sales and expenses in your own language.', icon: <Mic strokeWidth={2.5} size={32} /> },
            { step: '2. Track', desc: 'VoiceTrace converts your voice into organized financial entries.', icon: <BookOpen strokeWidth={2.5} size={32} /> },
            { step: '3. Grow', desc: 'Get insights and suggestions to boost your business.', icon: <TrendingUp strokeWidth={2.5} size={32} /> }
          ].map((item, i) => (
            <div key={i} className="bg-white border-[4px] border-[#222] p-8 shadow-[8px_8px_0px_#222] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#2563eb] border-[4px] border-[#222] flex items-center justify-center text-white mb-6 shadow-[4px_4px_0px_#222]">
                {item.icon}
              </div>
              <h3 className="text-2xl font-black mb-4">{item.step}</h3>
              <p className="text-[#555] font-semibold text-lg">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full bg-white py-24 border-y-[4px] border-[#222]">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-16 text-[#222]">Features</h2>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Voice-First Entry', desc: 'No typing needed. Just speak naturally and we handle the rest.', icon: <Mic strokeWidth={2.5} size={28} /> },
            { title: 'Smart Ledger', desc: 'Automatic categorization of sales and expenses with confidence scores.', icon: <BookOpen strokeWidth={2.5} size={28} /> },
            { title: 'Business Insights', desc: 'Weekly trends, top sellers, and expense tracking at a glance.', icon: <LineChart strokeWidth={2.5} size={28} /> },
            { title: 'Stock Suggestions', desc: 'AI-powered recommendations on what to stock based on sales patterns.', icon: <Lightbulb strokeWidth={2.5} size={28} /> },
            { title: 'Reports', desc: 'Generate weekly and monthly summaries ready for download.', icon: <FileText strokeWidth={2.5} size={28} /> },
            { title: 'Admin Panel', desc: 'Manage vendors, track activity, and monitor business health.', icon: <Shield strokeWidth={2.5} size={28} /> }
          ].map((feature, i) => (
            <div key={i} className="bg-white border-[4px] border-[#222] p-8 shadow-[8px_8px_0px_#222] border-t-[12px] border-t-[#2563eb] flex flex-col">
              <div className="w-12 h-12 border-[3px] border-[#222] flex items-center justify-center text-[#2563eb] mb-6 bg-[#fdfbf6] shadow-[4px_4px_0px_#222]">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black mb-3">{feature.title}</h3>
              <p className="text-[#555] font-semibold">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="w-full bg-[#2563eb] text-white py-24 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-sm">Ready to Simplify Your Business?</h2>
        <p className="text-xl font-bold opacity-90 max-w-2xl mx-auto drop-shadow-sm">
          Join thousands of vendors who track their business with just their voice.
        </p>
      </footer>

    </div>
  );
}
