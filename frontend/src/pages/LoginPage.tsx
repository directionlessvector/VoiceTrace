import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput } from "@/components/shared/BrutalInput";
import { Mic } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!phone) e.phone = "Phone/Email is required";
    if (mode === "password" && !password) e.password = "Password is required";
    if (mode === "otp" && otpSent && !otp) e.otp = "OTP is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === "otp" && !otpSent) {
      setLoading(true);
      setTimeout(() => { setOtpSent(true); setLoading(false); }, 1000);
      return;
    }

    setLoading(true);
    setTimeout(() => { setLoading(false); navigate("/dashboard"); }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center">
              <Mic size={28} className="text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Welcome Back</h1>
          <p className="text-muted-foreground font-medium mt-1">Login to your VoiceTrace account</p>
        </div>

        <div className="brutal-card p-6">
          {/* Mode Toggle */}
          <div className="flex mb-6 brutal-border overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("password"); setOtpSent(false); }}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors ${mode === "password" ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMode("otp")}
              className={`flex-1 py-2.5 text-sm font-bold border-l-[3px] border-foreground transition-colors ${mode === "otp" ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              OTP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <BrutalInput
              label="Phone / Email"
              placeholder="Enter phone or email"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />

            {mode === "password" && (
              <BrutalInput
                label="Password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
            )}

            {mode === "otp" && otpSent && (
              <BrutalInput
                label="Enter OTP"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={errors.otp}
                maxLength={6}
              />
            )}

            <BrutalButton type="submit" variant="primary" className="w-full" loading={loading}>
              {mode === "otp" && !otpSent ? "Send OTP" : "Login"}
            </BrutalButton>
          </form>

          <p className="text-center mt-4 text-sm font-medium text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-bold underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
