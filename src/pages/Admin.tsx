import React, { useState, useEffect } from 'react';
import { Shield, Users, Calendar, Trophy, Link2, Mail, RotateCcw, Plus, Trash2, Save, Eye, EyeOff, Settings, ChevronDown, ChevronUp, LogOut, MapPin, Star } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';
import type { Leader, RegistrationConfig, FooterConfig } from '../contexts/SiteDataContext';
import type { Event, Achievement } from '../data/content';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// ── Password Gate (Firebase Auth) ──────────────────────────────────

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      setError('Firebase is not configured in .env');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dominant flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-3xl shadow-xl border border-subtle p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent to-accent-muted"></div>
          
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 btn-on-accent mt-2 shadow-lg shadow-accent/20">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-muted text-sm mb-8">Secure access via Firebase Authentication.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin Email"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-secondary border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                autoFocus
              />
            </div>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 py-3 rounded-xl bg-secondary border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all pr-12"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors" title={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}
            
            <button type="submit" disabled={loading} className="w-full py-3 bg-accent text-white font-bold rounded-xl btn-on-accent hover:bg-accent-muted transition-colors shadow-md disabled:opacity-50 mt-2">
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-muted mt-8 opacity-70">
          First time? Create your admin user in the Firebase Console Authentication tab.
        </p>
      </div>
    </div>
  );
}

// ── Section Wrapper ────────────────────────────────────────────────

function Section({ title, icon: Icon, children, onReset }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-subtle shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center btn-on-accent">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-primary">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4">
          {children}
          <div className="pt-4 border-t border-subtle">
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="text-sm text-muted hover:text-red-500 flex items-center gap-1.5 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-500 font-medium">Are you sure?</span>
                <button onClick={() => { onReset(); setConfirmReset(false); }} className="text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors">Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} className="text-sm text-muted hover:text-primary transition-colors">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Input Helpers ──────────────────────────────────────────────────

const inputClasses = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-subtle text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-sm";
const labelClasses = "block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5";
const btnPrimary = "px-4 py-2 bg-accent text-white font-semibold rounded-xl btn-on-accent hover:bg-accent-muted transition-colors text-sm shadow-sm flex items-center gap-1.5";
const btnDanger = "p-2 rounded-xl text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors";

// ── Leaders Editor ─────────────────────────────────────────────────

function LeadersEditor() {
  const { leaders, updateLeaders, resetSection } = useSiteData();
  const [items, setItems] = useState<Leader[]>(leaders);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(leaders); }, [leaders]);

  const save = async () => {
    await updateLeaders(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditIdx(null);
  };

  const addNew = () => {
    setItems([...items, { name: '', role: '', image: '', bio: '', socials: {} }]);
    setEditIdx(items.length);
  };

  const remove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, field: string, value: any) => {
    const copy = [...items];
    if (field.startsWith('socials.')) {
      const socialKey = field.split('.')[1];
      copy[idx] = { ...copy[idx], socials: { ...copy[idx].socials, [socialKey]: value } };
    } else {
      copy[idx] = { ...copy[idx], [field]: value };
    }
    setItems(copy);
  };

  return (
    <Section title="Club Leaders" icon={Users} onReset={() => resetSection('leaders')}>
      <div className="space-y-3">
        {items.map((leader, idx) => (
          <div key={idx} className="bg-secondary/50 rounded-xl border border-subtle p-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} className="text-sm font-semibold text-primary hover:text-accent transition-colors flex items-center gap-2">
                {leader.image && (
                  <img src={`${import.meta.env.BASE_URL}${leader.image.startsWith('/') ? leader.image.slice(1) : leader.image}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                )}
                {leader.name || '(New Leader)'}
                <span className="text-xs text-muted font-normal">— {leader.role || 'No role'}</span>
              </button>
              <button onClick={() => remove(idx)} className={btnDanger} title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {editIdx === idx && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle">
                <div>
                  <label className={labelClasses}>Name</label>
                  <input className={inputClasses} value={leader.name} onChange={(e) => update(idx, 'name', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelClasses}>Role</label>
                  <input className={inputClasses} value={leader.role} onChange={(e) => update(idx, 'role', e.target.value)} placeholder="e.g. President" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Image Path</label>
                  <input className={inputClasses} value={leader.image} onChange={(e) => update(idx, 'image', e.target.value)} placeholder="/team-assets/Name.JPG" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Bio</label>
                  <textarea className={inputClasses + ' resize-none h-20'} value={leader.bio} onChange={(e) => update(idx, 'bio', e.target.value)} placeholder="Brief biography..." />
                </div>
                <div>
                  <label className={labelClasses}>LinkedIn URL</label>
                  <input className={inputClasses} value={leader.socials.linkedin || ''} onChange={(e) => update(idx, 'socials.linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className={labelClasses}>Email</label>
                  <input className={inputClasses} value={leader.socials.mail || ''} onChange={(e) => update(idx, 'socials.mail', e.target.value)} placeholder="mailto:name@email.com" />
                </div>
                <div>
                  <label className={labelClasses}>GitHub URL</label>
                  <input className={inputClasses} value={leader.socials.github || ''} onChange={(e) => update(idx, 'socials.github', e.target.value)} placeholder="https://github.com/..." />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={addNew} className={btnPrimary}><Plus className="w-4 h-4" /> Add Leader</button>
        <button onClick={save} className={btnPrimary}>
          <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </Section>
  );
}

// ── Star Members Editor ────────────────────────────────────────────

function StarMembersEditor() {
  const { starMembers, updateStarMembers, resetSection } = useSiteData();
  const [items, setItems] = useState<Leader[]>(starMembers);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(starMembers); }, [starMembers]);

  const save = async () => {
    await updateStarMembers(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditIdx(null);
  };

  const addNew = () => {
    setItems([...items, { name: '', role: '', image: '', bio: '', socials: {} }]);
    setEditIdx(items.length);
  };

  const remove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, field: string, value: any) => {
    const copy = [...items];
    if (field.startsWith('socials.')) {
      const socialKey = field.split('.')[1];
      copy[idx] = { ...copy[idx], socials: { ...copy[idx].socials, [socialKey]: value } };
    } else {
      copy[idx] = { ...copy[idx], [field]: value };
    }
    setItems(copy);
  };

  return (
    <Section title="Star Members" icon={Star} onReset={() => resetSection('starMembers')}>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-muted italic">No star members currently. Adding one will visibly add a new section on the Team page!</div>
        )}
        {items.map((leader, idx) => (
          <div key={idx} className="bg-secondary/50 rounded-xl border border-subtle p-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} className="text-sm font-semibold text-primary hover:text-accent transition-colors flex items-center gap-2">
                {leader.image && (
                  <img src={`${import.meta.env.BASE_URL}${leader.image.startsWith('/') ? leader.image.slice(1) : leader.image}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                )}
                {leader.name || '(New Star Member)'}
                <span className="text-xs text-muted font-normal">— {leader.role || 'No role'}</span>
              </button>
              <button onClick={() => remove(idx)} className={btnDanger} title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {editIdx === idx && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle">
                <div>
                  <label className={labelClasses}>Name</label>
                  <input className={inputClasses} value={leader.name} onChange={(e) => update(idx, 'name', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelClasses}>Role</label>
                  <input className={inputClasses} value={leader.role} onChange={(e) => update(idx, 'role', e.target.value)} placeholder="e.g. Best Innovator" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Image Path</label>
                  <input className={inputClasses} value={leader.image} onChange={(e) => update(idx, 'image', e.target.value)} placeholder="/team-assets/Name.JPG" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Reason for Star Status</label>
                  <textarea className={inputClasses + ' resize-none h-20'} value={leader.bio} onChange={(e) => update(idx, 'bio', e.target.value)} placeholder="Why are they a star member?..." />
                </div>
                <div>
                  <label className={labelClasses}>LinkedIn URL</label>
                  <input className={inputClasses} value={leader.socials.linkedin || ''} onChange={(e) => update(idx, 'socials.linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className={labelClasses}>GitHub URL</label>
                  <input className={inputClasses} value={leader.socials.github || ''} onChange={(e) => update(idx, 'socials.github', e.target.value)} placeholder="https://github.com/..." />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={addNew} className={btnPrimary}><Plus className="w-4 h-4" /> Add Star Member</button>
        <button onClick={save} className={btnPrimary}>
          <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </Section>
  );
}

// ── Events Editor ──────────────────────────────────────────────────

function EventsEditor() {
  const { events, updateEvents, resetSection } = useSiteData();
  const [items, setItems] = useState<Event[]>(events);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(events); }, [events]);

  const save = async () => {
    await updateEvents(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditIdx(null);
  };

  const addNew = () => {
    const newId = items.length > 0 ? Math.max(...items.map(e => e.id)) + 1 : 1;
    setItems([...items, { id: newId, title: '', description: '', date: '', time: '', location: '', image: '', status: 'Upcoming' }]);
    setEditIdx(items.length);
  };

  const remove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  return (
    <Section title="Events" icon={Calendar} onReset={() => resetSection('events')}>
      <div className="space-y-3">
        {items.map((event, idx) => (
          <div key={idx} className="bg-secondary/50 rounded-xl border border-subtle p-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} className="text-sm font-semibold text-primary hover:text-accent transition-colors">
                {event.title || '(New Event)'} <span className="text-xs text-muted font-normal">— {event.date || 'No date'} · {event.status}</span>
              </button>
              <button onClick={() => remove(idx)} className={btnDanger} title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {editIdx === idx && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle">
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Title</label>
                  <input className={inputClasses} value={event.title} onChange={(e) => update(idx, 'title', e.target.value)} placeholder="Event title" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Description</label>
                  <textarea className={inputClasses + ' resize-none h-24'} value={event.description} onChange={(e) => update(idx, 'description', e.target.value)} placeholder="Event description..." />
                </div>
                <div>
                  <label className={labelClasses}>Date (YYYY-MM-DD)</label>
                  <input type="date" className={inputClasses} value={event.date} onChange={(e) => update(idx, 'date', e.target.value)} />
                </div>
                <div>
                  <label className={labelClasses}>Time</label>
                  <input className={inputClasses} value={event.time} onChange={(e) => update(idx, 'time', e.target.value)} placeholder="2:00 PM - 4:00 PM" />
                </div>
                <div>
                  <label className={labelClasses}>Location</label>
                  <input className={inputClasses} value={event.location} onChange={(e) => update(idx, 'location', e.target.value)} placeholder="Venue name" />
                </div>
                <div>
                  <label className={labelClasses}>Status</label>
                  <select title="Event Status" className={inputClasses} value={event.status} onChange={(e) => update(idx, 'status', e.target.value as any)}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Past">Past</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Image URL / Path</label>
                  <input className={inputClasses} value={event.image} onChange={(e) => update(idx, 'image', e.target.value)} placeholder="/Events/image.jpg or https://..." />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`noreg-${idx}`} checked={!!event.noRegistration} onChange={(e) => update(idx, 'noRegistration', e.target.checked)} className="rounded accent-(--color-accent)" />
                  <label htmlFor={`noreg-${idx}`} className="text-sm text-secondary">No registration required</label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={addNew} className={btnPrimary}><Plus className="w-4 h-4" /> Add Event</button>
        <button onClick={save} className={btnPrimary}>
          <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </Section>
  );
}

// ── Achievements Editor ────────────────────────────────────────────

function AchievementsEditor() {
  const { achievements, updateAchievements, resetSection } = useSiteData();
  const [items, setItems] = useState<Achievement[]>(achievements);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setItems(achievements); }, [achievements]);

  const save = async () => {
    await updateAchievements(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditIdx(null);
  };

  const addNew = () => {
    const newId = items.length > 0 ? Math.max(...items.map(a => a.id)) + 1 : 1;
    setItems([...items, { id: newId, title: '', description: '', date: '', image: '', category: '' }]);
    setEditIdx(items.length);
  };

  const remove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  return (
    <Section title="Achievements" icon={Trophy} onReset={() => resetSection('achievements')}>
      <div className="space-y-3">
        {items.map((ach, idx) => (
          <div key={idx} className="bg-secondary/50 rounded-xl border border-subtle p-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} className="text-sm font-semibold text-primary hover:text-accent transition-colors">
                {ach.title || '(New Achievement)'} <span className="text-xs text-muted font-normal">— {ach.category || 'No category'}</span>
              </button>
              <button onClick={() => remove(idx)} className={btnDanger} title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {editIdx === idx && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle">
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Title</label>
                  <input className={inputClasses} value={ach.title} onChange={(e) => update(idx, 'title', e.target.value)} placeholder="Achievement title" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Description</label>
                  <textarea className={inputClasses + ' resize-none h-24'} value={ach.description} onChange={(e) => update(idx, 'description', e.target.value)} placeholder="Achievement description..." />
                </div>
                <div>
                  <label className={labelClasses}>Date (YYYY-MM-DD)</label>
                  <input type="date" className={inputClasses} value={ach.date || ''} onChange={(e) => update(idx, 'date', e.target.value)} />
                </div>
                <div>
                  <label className={labelClasses}>Category</label>
                  <input className={inputClasses} value={ach.category} onChange={(e) => update(idx, 'category', e.target.value)} placeholder="e.g. Competition, Award" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Image URL / Path</label>
                  <input className={inputClasses} value={ach.image} onChange={(e) => update(idx, 'image', e.target.value)} placeholder="/Achievements/image.jpg or https://..." />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={addNew} className={btnPrimary}><Plus className="w-4 h-4" /> Add Achievement</button>
        <button onClick={save} className={btnPrimary}>
          <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </Section>
  );
}

// ── Registration Editor ────────────────────────────────────────────

function RegistrationEditor() {
  const { registration, updateRegistration, resetSection } = useSiteData();
  const [config, setConfig] = useState<RegistrationConfig>(registration);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setConfig(registration); }, [registration]);

  const save = async () => {
    await updateRegistration(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Section title="Registration" icon={Link2} onReset={() => resetSection('registration')}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isOpen}
              title="Toggle Registration"
              onChange={(e) => setConfig({ ...config, isOpen: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--color-accent)"></div>
          </label>
          <span className="text-sm font-semibold text-primary">
            Registration is {config.isOpen ? <span className="text-green-500">OPEN</span> : <span className="text-red-500">CLOSED</span>}
          </span>
        </div>
        <div>
          <label className={labelClasses}>Google Form Link</label>
          <input className={inputClasses} value={config.link} onChange={(e) => setConfig({ ...config, link: e.target.value })} placeholder="https://docs.google.com/forms/..." />
        </div>
      </div>
      <button onClick={save} className={btnPrimary + ' mt-3'}>
        <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
      </button>
    </Section>
  );
}

// ── Footer Editor ──────────────────────────────────────────────────

function FooterEditor() {
  const { footer, updateFooter, resetSection } = useSiteData();
  const [config, setConfig] = useState<FooterConfig>(footer);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setConfig(footer); }, [footer]);

  const save = async () => {
    await updateFooter(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Section title="Footer Contact Info" icon={MapPin} onReset={() => resetSection('footer')}>
      <div className="space-y-4">
        <div>
          <label className={labelClasses}>Contact Email</label>
          <input className={inputClasses} value={config.email} onChange={(e) => setConfig({ ...config, email: e.target.value })} placeholder="erise.club@gmail.com" />
        </div>
        <div>
          <label className={labelClasses}>Address</label>
          <textarea className={inputClasses + ' resize-none h-20'} value={config.address} onChange={(e) => setConfig({ ...config, address: e.target.value })} placeholder="School address..." />
        </div>
      </div>
      <button onClick={save} className={btnPrimary + ' mt-3'}>
        <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
      </button>
    </Section>
  );
}

// ── Home Editor ────────────────────────────────────────────────────

function HomeEditor() {
  const { home, updateHome, resetSection } = useSiteData();
  const [config, setConfig] = useState(home);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setConfig(home); }, [home]);

  const save = async () => {
    await updateHome(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Section title="Home Page Content" icon={Settings} onReset={() => resetSection('home')}>
      <div className="space-y-6">
        {/* Hero */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Hero Section</h3>
          <div>
            <label className={labelClasses}>Hero Title</label>
            <textarea className={inputClasses + ' h-20'} value={config.hero.title} onChange={(e) => setConfig({ ...config, hero: { ...config.hero, title: e.target.value } })} />
          </div>
          <div>
            <label className={labelClasses}>Hero Subtitle</label>
            <textarea className={inputClasses + ' h-24'} value={config.hero.subtitle} onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subtitle: e.target.value } })} />
          </div>
          <div>
            <label className={labelClasses}>Logo Style</label>
            <select className={inputClasses} value={config.hero.logoVariant} onChange={(e) => setConfig({ ...config, hero: { ...config.hero, logoVariant: e.target.value as any } })}>
              <option value="full">Full Logo (Large)</option>
              <option value="icon">Icon Only</option>
            </select>
          </div>
        </div>

        {/* About */}
        <div className="space-y-3 pt-4 border-t border-subtle">
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Mission & Vision</h3>
          <div>
            <label className={labelClasses}>About Title</label>
            <input className={inputClasses} value={config.about.title} onChange={(e) => setConfig({ ...config, about: { ...config.about, title: e.target.value } })} />
          </div>
          <div>
            <label className={labelClasses}>About Description</label>
            <textarea className={inputClasses + ' h-24'} value={config.about.description} onChange={(e) => setConfig({ ...config, about: { ...config.about, description: e.target.value } })} />
          </div>
        </div>

        {/* Impact */}
        <div className="space-y-3 pt-4 border-t border-subtle">
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest">Impact Pillars</h3>
          <div>
            <label className={labelClasses}>Environmental Sustainability</label>
            <textarea className={inputClasses} value={config.impact.sustainability} onChange={(e) => setConfig({ ...config, impact: { ...config.impact, sustainability: e.target.value } })} />
          </div>
          <div>
            <label className={labelClasses}>Renewable Energy</label>
            <textarea className={inputClasses} value={config.impact.renewable} onChange={(e) => setConfig({ ...config, impact: { ...config.impact, renewable: e.target.value } })} />
          </div>
          <div>
            <label className={labelClasses}>Global Impact</label>
            <textarea className={inputClasses} value={config.impact.global} onChange={(e) => setConfig({ ...config, impact: { ...config.impact, global: e.target.value } })} />
          </div>
        </div>
      </div>
      <button onClick={save} className={btnPrimary + ' mt-6'}>
        <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
      </button>
    </Section>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────

export function Admin() {
  const { user } = useSiteData();

  const handleLogout = () => {
    signOut(auth);
  };

  // If user state isn't initialized yet
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-dominant flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no user is logged in
  if (user === null) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-dominant py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center btn-on-accent shadow-lg">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-primary">Admin Dashboard</h1>
              <p className="text-muted text-sm flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-green-500" /> Authorized as {user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted hover:text-red-500 transition-colors bg-surface border border-subtle px-4 py-2 rounded-xl">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <HomeEditor />
          <LeadersEditor />
          <StarMembersEditor />
          <EventsEditor />
          <AchievementsEditor />
          <RegistrationEditor />
          <FooterEditor />
        </div>

        <div className="mt-10 text-center text-xs text-muted">
          All changes are immediately pushed securely to Firebase Firestore and synced live across the site.
        </div>
      </div>
    </div>
  );
}
