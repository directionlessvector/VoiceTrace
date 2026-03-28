import { Link } from "react-router-dom";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { Mic, BookOpen, TrendingUp, Lightbulb, FileText, Shield, ArrowRight } from "lucide-react";

const steps = [
  { icon: Mic, title: "Speak", desc: "Record your daily sales and expenses in your own language." },
  { icon: BookOpen, title: "Track", desc: "VoiceTrace converts your voice into organized financial entries." },
  { icon: TrendingUp, title: "Grow", desc: "Get insights and suggestions to boost your business." },
];

const features = [
  { icon: Mic, title: "Voice-First Entry", desc: "No typing needed. Just speak naturally and we handle the rest." },
  { icon: BookOpen, title: "Smart Ledger", desc: "Automatic categorization of sales and expenses with confidence scores." },
  { icon: TrendingUp, title: "Business Insights", desc: "Weekly trends, top sellers, and expense tracking at a glance." },
  { icon: Lightbulb, title: "Stock Suggestions", desc: "AI-powered recommendations on what to stock based on sales patterns." },
  { icon: FileText, title: "Reports", desc: "Generate weekly and monthly summaries ready for download." },
  { icon: Shield, title: "Admin Panel", desc: "Manage vendors, track activity, and monitor business health." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b-[3px] border-foreground bg-card px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-sm brutal-border flex items-center justify-center">
            <Mic size={22} className="text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">VoiceTrace</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login">
            <BrutalButton variant="outline" size="sm">Login</BrutalButton>
          </Link>
          <Link to="/signup">
            <BrutalButton variant="primary" size="sm">Sign Up</BrutalButton>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 md:px-8 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Track Your Business<br />
              <span className="text-primary">With Your Voice</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground font-medium max-w-md">
              The simplest way for small business owners to manage sales, expenses, and inventory — just by speaking.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/signup">
                <BrutalButton variant="primary" size="lg">
                  Start Free <ArrowRight size={20} />
                </BrutalButton>
              </Link>
            </div>
          </div>
          <div className="brutal-card p-8 bg-accent/30 flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-primary rounded-full brutal-border brutal-shadow-lg flex items-center justify-center">
                <Mic size={48} className="text-primary-foreground" />
              </div>
              <p className="text-lg font-bold">"Aaj maine 10 kilo chawal becha 500 mein..."</p>
              <p className="text-sm text-muted-foreground font-medium">→ ₹500 sale recorded automatically</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-4 md:px-8 py-16 bg-muted border-y-[3px] border-foreground">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <BrutalCard key={i} className="text-center">
                <div className="w-16 h-16 mx-auto bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center mb-4">
                  <step.icon size={32} className="text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  <span className="text-primary mr-1">{i + 1}.</span>{step.title}
                </h3>
                <p className="text-muted-foreground font-medium">{step.desc}</p>
              </BrutalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 md:px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <BrutalCard key={i} highlight="primary">
              <div className="w-12 h-12 bg-primary/10 rounded-sm brutal-border flex items-center justify-center mb-3">
                <f.icon size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground font-medium">{f.desc}</p>
            </BrutalCard>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 md:px-8 py-16 bg-primary border-t-[3px] border-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to Simplify Your Business?</h2>
          <p className="text-primary-foreground/80 font-medium mb-8">Join thousands of vendors who track their business with just their voice.</p>
          <Link to="/signup">
            <BrutalButton variant="outline" size="lg">
              Start Now <ArrowRight size={20} />
            </BrutalButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-6 border-t-[3px] border-foreground text-center">
        <p className="text-sm font-bold text-muted-foreground">© 2026 VoiceTrace. Built for small business owners.</p>
      </footer>
    </div>
  );
}
