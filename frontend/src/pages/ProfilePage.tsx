import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput, BrutalSelect } from "@/components/shared/BrutalInput";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { currentUser } from "@/data/mockData";
import { Save, User } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...currentUser });
  const [saved, setSaved] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 1000);
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>

        <BrutalCard>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary rounded-sm brutal-border brutal-shadow flex items-center justify-center">
              <User size={32} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{form.name}</h2>
              <p className="text-sm text-muted-foreground font-medium">{form.businessType}</p>
            </div>
          </div>

          <div className="space-y-4">
            <BrutalInput label="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            <BrutalInput label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            <BrutalInput label="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            <BrutalInput label="Business Type" value={form.businessType} onChange={(e) => update("businessType", e.target.value)} />
            <BrutalInput label="Location" value={form.location} onChange={(e) => update("location", e.target.value)} />
            <BrutalSelect label="Language" value={form.language} onChange={(e) => update("language", e.target.value)}>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Marathi">Marathi</option>
            </BrutalSelect>

            <div className="flex items-center gap-3 pt-2">
              <BrutalButton variant="primary" onClick={handleSave} loading={saving}>
                <Save size={18} /> Save Changes
              </BrutalButton>
              {saved && <span className="text-sm font-bold text-success">✓ Saved successfully!</span>}
            </div>
          </div>
        </BrutalCard>
      </div>
    </AppLayout>
  );
}
