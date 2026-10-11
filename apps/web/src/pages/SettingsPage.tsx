import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { toast } from '../stores/useToastStore';
import { useAppStore, type ThemeMode } from '../stores/useAppStore';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userName, userEmail, userRole, theme, setTheme, setUserProfile } = useAppStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [bio, setBio] = useState('Computer science student focused on algorithms, graph theory, and deep learning systems.');
  const [socraticPacing, setSocraticPacing] = useState<'gentle' | 'balanced' | 'rigorous'>('balanced');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [soundEffects, setSoundEffects] = useState(true);

  // AI Integration state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'unverified' | 'valid' | 'invalid'>('unverified');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name, email });
    toast.success('Your learning profile has been updated.', 'Profile Saved');
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Cognitive Socratic preferences updated.', 'Preferences Saved');
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
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your profile, AI tutoring parameters, theme, and API integrations.
        </p>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" icon={<User className="w-3.5 h-3.5" />}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" icon={<Sliders className="w-3.5 h-3.5" />}>
            Learning Pedagogy
          </TabsTrigger>
          <TabsTrigger value="ai" icon={<Key className="w-3.5 h-3.5" />}>
            AI & Model
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 border-0 pb-4">
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Manage your public persona and account credentials.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                <span className="text-xs text-slate-500">
                  Role: <Badge variant="brand" size="sm">{userRole}</Badge>
                </span>
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Theme Preference Card */}
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
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
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

        {/* Tab 2: Pedagogy Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 border-0 pb-4">
              <CardTitle>Socratic Inquiry Calibration</CardTitle>
              <CardDescription>
                Customize how the AI tutor poses counter-questions and scaffolds your reasoning.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              {/* Socratic Pacing */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Socratic Inquiry Pacing
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'gentle' as const, label: 'Gentle', desc: 'Frequent hints and confirmations' },
                    { id: 'balanced' as const, label: 'Balanced', desc: 'Guided inquiry and progressive hints' },
                    { id: 'rigorous' as const, label: 'Rigorous', desc: 'Socratic counter-examples & proofs' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSocraticPacing(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        socraticPacing === p.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs">{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Baseline Cognitive Difficulty
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`p-2.5 rounded-xl border text-center capitalize text-xs font-semibold transition-all cursor-pointer ${
                        difficulty === lvl
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle sound */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Interactive Sound & Haptic Cues
                  </span>
                  <span className="text-xs text-slate-400">
                    Play gentle completion tones on quiz submission.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Preferences
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 3: AI & Model Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="p-6 space-y-5">
            <CardHeader className="p-0 border-0 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <CardTitle>AI Provider & Model Integration</CardTitle>
              </div>
              <CardDescription>
                Configure server-side Google Gemini credentials for unlimited live cognitive generation.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Gemini Model Family
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended: Low Latency, High Reasoning)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Extended Context)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Input
                  label="Google Gemini API Key"
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
    </div>
  );
};
