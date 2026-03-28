import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput } from "@/components/shared/BrutalInput";
import { FloatingCoin } from "@/components/shared/FloatingCoin";
import { Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);
    try {
      await adminLogin(email, password);
      navigate("/admin");
    } catch (err: any) {
      setApiError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-background flex items-center justify-center p-4">

      {/* Massive Responsive Ambient Coins */}
      <FloatingCoin className="text-[120px] md:text-[320px] -top-[5%] md:-top-[15%] -left-[10%] md:-left-[5%]" delay={0.2} rotation={-30} shadowX={0.08} shadowY={0.15} />
      <FloatingCoin className="text-[90px] md:text-[230px] top-[40%] md:top-[45%] -left-[5%] md:left-[2%]" delay={1.4} rotation={15} shadowX={-0.12} shadowY={0.12} />
      <FloatingCoin className="text-[100px] md:text-[180px] -bottom-[5%] md:-bottom-[10%] left-[8%] md:left-[15%]" delay={0.7} rotation={-10} shadowX={-0.1} shadowY={0.15} />

      <FloatingCoin className="text-[90px] md:text-[160px] top-[8%] md:top-[12%] right-[5%] md:right-[15%]" delay={1.1} rotation={20} shadowX={0.06} shadowY={0.12} />
      <FloatingCoin className="text-[140px] md:text-[280px] top-[50%] md:top-[40%] -right-[15%] md:-right-[8%]" delay={2.5} rotation={-25} shadowX={-0.15} shadowY={0.1} />
      <FloatingCoin className="text-[110px] md:text-[240px] -bottom-[5%] md:-bottom-[12%] -right-[5%] md:right-[2%]" delay={0.4} rotation={5} shadowX={-0.08} shadowY={0.14} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center">
              <Mic size={28} className="text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Welcome Back</h1>
          <p className="text-muted-foreground font-medium mt-1">Login to your account</p>
        </div>

        <div className="brutal-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <BrutalInput
              label="Phone / Email"
              placeholder="Enter phone or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <BrutalInput
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <BrutalButton type="submit" variant="primary" className="w-full" loading={loading}>
              Login
            </BrutalButton>

            {apiError && (
              <p className="text-sm font-bold text-destructive text-center">{apiError}</p>
            )}
          </form>

          <p className="text-center mt-4 text-sm font-medium text-muted-foreground">
            <Link to="/signup" className="text-primary font-bold underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
