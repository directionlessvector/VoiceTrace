import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput, BrutalSelect } from "@/components/shared/BrutalInput";
import { FloatingCoin } from "@/components/shared/FloatingCoin";
import { Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const langMap: Record<string, string> = {
  English: "en", Hindi: "hi", Tamil: "ta", Telugu: "te", Marathi: "mr",
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "", businessType: "", location: "", phone: "", language: "English", password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Name is required";
    if (!form.businessType) e.businessType = "Business type is required";
    if (!form.location) e.location = "Location is required";
    if (!form.phone) e.phone = "Phone is required";
    if (!form.password) e.password = "Password is required";
    if (form.password && form.password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Parse "City, State" from single location field
    const [city, ...stateParts] = form.location.split(",").map((s) => s.trim());
    const state = stateParts.join(", ") || undefined;

    setLoading(true);
    setApiError(null);
    try {
      await register({
        phone: form.phone,
        password: form.password,
        name: form.name,
        businessType: "retail", // all frontend business types map to retail enum
        languagePreference: langMap[form.language] ?? "en",
        city: city || undefined,
        state: state || undefined,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-background flex items-center justify-center p-4">

      {/* Massive Responsive Ambient Coins */}
      <FloatingCoin className="text-[120px] md:text-[320px] -top-[5%] md:-top-[15%] -left-[10%] md:-left-[5%]" delay={0.3} rotation={-30} shadowX={0.08} shadowY={0.15} />
      <FloatingCoin className="text-[90px] md:text-[230px] top-[40%] md:top-[45%] -left-[5%] md:left-[2%]" delay={1.6} rotation={15} shadowX={-0.12} shadowY={0.12} />
      <FloatingCoin className="text-[100px] md:text-[180px] -bottom-[5%] md:-bottom-[10%] left-[8%] md:left-[15%]" delay={0.9} rotation={-10} shadowX={-0.1} shadowY={0.15} />

      <FloatingCoin className="text-[90px] md:text-[160px] top-[8%] md:top-[12%] right-[5%] md:right-[15%]" delay={1.2} rotation={20} shadowX={0.06} shadowY={0.12} />
      <FloatingCoin className="text-[140px] md:text-[280px] top-[50%] md:top-[40%] -right-[15%] md:-right-[8%]" delay={2.7} rotation={-25} shadowX={-0.15} shadowY={0.1} />
      <FloatingCoin className="text-[110px] md:text-[240px] -bottom-[5%] md:-bottom-[12%] -right-[5%] md:right-[2%]" delay={0.5} rotation={5} shadowX={-0.08} shadowY={0.14} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center">
              <Mic size={28} className="text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Create Account</h1>
          <p className="text-muted-foreground font-medium mt-1">Start tracking your business with voice</p>
        </div>

        <div className="brutal-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <BrutalInput label="Full Name" placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} error={errors.name} />
            <BrutalSelect label="Business Type" value={form.businessType} onChange={(e) => update("businessType", e.target.value)} error={errors.businessType}>
              <option value="">Select type</option>
              <option value="grocery">Grocery Store</option>
              <option value="vegetable">Vegetable Shop</option>
              <option value="dairy">Dairy Store</option>
              <option value="kirana">Kirana Shop</option>
              <option value="general">General Store</option>
              <option value="other">Other</option>
            </BrutalSelect>
            <BrutalInput label="Location" placeholder="City, State" value={form.location} onChange={(e) => update("location", e.target.value)} error={errors.location} />
            <BrutalInput label="Phone Number" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} />
            <BrutalInput label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} error={errors.password} />
            <BrutalSelect label="Preferred Language" value={form.language} onChange={(e) => update("language", e.target.value)}>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Marathi">Marathi</option>
            </BrutalSelect>
            <BrutalButton type="submit" variant="primary" className="w-full" loading={loading}>
              Create Account
            </BrutalButton>

            {apiError && (
              <p className="text-sm font-bold text-destructive text-center">{apiError}</p>
            )}
          </form>
          <p className="text-center mt-4 text-sm font-medium text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-bold underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
