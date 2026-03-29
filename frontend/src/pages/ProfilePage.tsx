import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput, BrutalSelect } from "@/components/shared/BrutalInput";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { getCurrentUserProfile, updateCurrentUserProfile, uploadCurrentUserProfileImage } from "@/lib/usersApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { Save, User, Upload } from "lucide-react";

type ProfileForm = {
  name: string;
  phone: string;
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  languagePreference: string;
  profileImageUrl: string;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    businessName: "",
    businessType: "",
    city: "",
    state: "",
    languagePreference: "en",
    profileImageUrl: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const profile = await getCurrentUserProfile();
        setForm({
          name: profile.name ?? "",
          phone: profile.phone ?? "",
          businessName: profile.businessName ?? "",
          businessType: profile.businessType ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          languagePreference: profile.languagePreference ?? "en",
          profileImageUrl: profile.profileImageUrl ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field: keyof ProfileForm, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await updateCurrentUserProfile({
        name: form.name.trim(),
        businessName: form.businessName.trim() || null,
        businessType: form.businessType.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        languagePreference: form.languagePreference.trim() || "en",
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      const result = await uploadCurrentUserProfileImage(file);
      setForm((prev) => ({ ...prev, profileImageUrl: result.imageUrl }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile image");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 w-full">
        <h1 className="text-2xl md:text-3xl font-bold">{t("page.profile")}</h1>

        {error && (
          <BrutalCard className="border-destructive">
            <p className="text-destructive font-semibold">{error}</p>
          </BrutalCard>
        )}

        <BrutalCard className="w-full">
          <div className="flex items-center gap-4 mb-6">
            {form.profileImageUrl ? (
              <img
                src={form.profileImageUrl}
                alt="Profile"
                className="w-16 h-16 rounded-sm brutal-border brutal-shadow object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center">
                <User size={32} className="text-primary-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{form.name}</h2>
              <p className="text-sm text-muted-foreground font-medium">{form.businessType || "Business"}</p>
            </div>
            <div className="ml-auto">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
              <BrutalButton
                variant="outline"
                loading={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} /> Upload Photo
              </BrutalButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrutalInput label="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            <BrutalInput label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} disabled />
            <BrutalInput label="Business Name" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
            <BrutalInput label="Business Type" value={form.businessType} onChange={(e) => update("businessType", e.target.value)} />
            <BrutalInput label="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
            <BrutalInput label="State" value={form.state} onChange={(e) => update("state", e.target.value)} />
            <BrutalSelect label="Language" value={form.languagePreference} onChange={(e) => update("languagePreference", e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="mr">Marathi</option>
            </BrutalSelect>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <BrutalButton variant="primary" onClick={handleSave} loading={saving}>
              <Save size={18} /> Save Changes
            </BrutalButton>
            {saved && <span className="text-sm font-bold text-success">Saved successfully</span>}
          </div>
        </BrutalCard>
      </div>
    </AppLayout>
  );
}
