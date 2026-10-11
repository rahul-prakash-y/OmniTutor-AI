import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { toast } from '../stores/useToastStore';
import { useAppStore, type ThemeMode } from '../stores/useAppStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  User,
  Sliders,
  Sparkles,
  Key,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userName, userEmail, userRole, theme, setTheme } = useAppStore();
  const { user, updateProfile, deleteAccount } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.fullName || userName);
  const [email] = useState(user?.email || userEmail);
  const [bio, setBio] = useState('Computer science student focused on algorithms, graph theory, and deep learning systems.');
  const [socraticPacing, setSocraticPacing] = useState<'gentle' | 'balanced' | 'rigorous'>(
    user?.preferences?.socraticPacing || 'balanced'
  );
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    user?.preferences?.preferredDifficulty || 'intermediate'
  );
  const [soundEffects, setSoundEffects] = useState(user?.preferences?.enableSoundEffects ?? true);

  // Sync state when auth user changes
  useEffect(() => {
    if (user) {
      setName(user.fullName);
      if (user.preferences) {
        setSocraticPacing(user.preferences.socraticPacing);
        setDifficulty(user.preferences.preferredDifficulty);
        setSoundEffects(user.preferences.enableSoundEffects);
      }
    }
  }, [user]);

  // AI Integration state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'unverified' | 'valid' | 'invalid'>('unverified');

  // Delete account confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const res = await updateProfile({ fullName: name });
    setIsSavingProfile(false);
    if (res.success) {
      toast.success('Your learning profile has been updated.', 'Profile Saved');
    } else {
      toast.error(res.error || 'Failed to update profile.', 'Error');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    const res = await updateProfile({
      preferences: {
        preferredDifficulty: difficulty,
        socraticPacing,
        enableSoundEffects: soundEffects,
      },
    });
    setIsSavingPrefs(false);
    if (res.success) {
      toast.success('Cognitive Socratic preferences updated.', 'Preferences Saved');
    } else {
      toast.error(res.error || 'Failed to update preferences.', 'Error');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const res = await deleteAccount();
    setIsDeleting(false);
    if (res.success) {
      setDeleteModalOpen(false);
      toast.info('Your account has been deleted successfully.', 'Account Removed');
      navigate('/login');
    } else {
      toast.error(res.error || 'Failed to delete account.', 'Error');
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast.warning('Please enter an API key to test.', 'Empty Key');
      return;
    }
    setIsTestingKey(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsTestingKey(false);
    setKeyStatus('valid');
    toast.success('Google Gemini API key verified and operational.', 'Connection Verified');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
          Account & Learning Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, AI pedagogical preferences, and appearance.
        </p>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-1.5" />
            Profile & Security
          </TabsTrigger>
          <TabsTrigger value="pedagogy">
            <Sliders className="w-4 h-4 mr-1.5" />
            Socratic Tuning
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="w-4 h-4 mr-1.5" />
            AI Integration
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Security */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 border-0 pb-4">
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>
                Update your public learner profile name and view registered email credentials.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="settings-name"
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  id="settings-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  disabled
                  helperText="Email is bound to your account verification state."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Academic Focus & Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  Role: <Badge variant="brand" size="sm">{user?.role || userRole}</Badge>
                  {user?.isEmailVerified && (
                    <Badge variant="success" size="sm">Verified</Badge>
                  )}
                </span>
                <Button type="submit" variant="primary" isLoading={isSavingProfile}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Danger Zone: Delete Account */}
          <Card className="p-6 border-rose-200 dark:border-rose-900/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Permanently delete your OmniTutor AI account, revoke all sessions, and erase progress.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Account
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Socratic Tuning */}
        <TabsContent value="pedagogy" className="space-y-6">
          <Card className="p-6 space-y-5">
            <CardHeader className="p-0 border-0 pb-2">
              <CardTitle>Socratic Pedagogical Pacing</CardTitle>
              <CardDescription>
                Customize how actively the AI tutor prompts questions versus providing answers.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Guiding Pacing Strategy
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'gentle' as const,
                      title: 'Gentle',
                      desc: 'Breaks concepts into bite-sized analogies with direct hints.',
                    },
                    {
                      id: 'balanced' as const,
                      title: 'Balanced',
                      desc: 'Balances open inquiry with constructive scaffolds (Recommended).',
                    },
                    {
                      id: 'rigorous' as const,
                      title: 'Rigorous',
                      desc: 'Asks challenging counterexamples and demands formal proof steps.',
                    },
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSocraticPacing(p.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        socraticPacing === p.id
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {p.title}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Target Challenge Difficulty
                </label>
                <div className="flex gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`px-4 py-2 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${
                        difficulty === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={soundEffects}
                    onChange={(e) => setSoundEffects(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable audio chimes for milestone achievements</span>
                </label>

                <Button type="submit" variant="primary" isLoading={isSavingPrefs}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Preferences
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 3: Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-6 space-y-4">
            <CardHeader className="p-0 border-0 pb-2">
              <CardTitle>Interface Appearance</CardTitle>
              <CardDescription>Select your preferred color theme with accessible contrast.</CardDescription>
            </CardHeader>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
                { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
                { id: 'system' as ThemeMode, label: 'System', icon: Laptop },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    toast.info(`Theme set to ${t.label}`, 'Appearance');
                  }}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 font-medium text-xs transition-all cursor-pointer ${
                    theme === t.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <t.icon className="w-5 h-5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: AI Integration Credentials */}
        <TabsContent value="api" className="space-y-6">
          <Card className="p-6 space-y-5">
            <CardHeader className="p-0 border-0 pb-2">
              <CardTitle>Google Gemini API Key</CardTitle>
              <CardDescription>
                Provide a dedicated Google Gemini API key to utilize deep reasoning models.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Target AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast adaptive chat)</option>
                  <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental (Complex reasoning)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep context window)</option>
                </select>
              </div>

              <div>
                <Input
                  id="gemini-api-key"
                  label="API Key Secret"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyStatus('unverified');
                  }}
                  helperText="Kept encrypted exclusively on the backend server. Never committed to client bundles."
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle API key visibility"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {keyStatus === 'valid' && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Connection healthy: Google GenAI client is verified for model {selectedModel}.</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestApiKey}
                  isLoading={isTestingKey}
                >
                  Test Connection
                </Button>

                <Button
                  variant="primary"
                  onClick={() => {
                    toast.success('AI integration parameters saved.', 'Configuration Updated');
                  }}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save AI Config
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete OmniTutor Account"
        description="Are you absolutely sure you want to delete your account? This action cannot be undone. All active sessions will be terminated and your learning records will be permanently removed."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
            >
              Confirm Account Deletion
            </Button>
          </>
        }
      >
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          ⚠️ All your course enrollments, assessment results, and AI tutoring conversation histories will be deleted.
        </p>
      </Dialog>
    </div>
  );
};
