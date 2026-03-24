import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Settings, X, Plus, Trash2, Save, LogOut } from 'lucide-react';
import { auth, db } from './firebase';
import { LabItem, PortfolioData, PressItem, Project, OpportunityForm, VolunteerEvent, useSiteStore } from './store';
import { Toast } from './components/Toast';

interface AdminPanelProps {
  onClose?: () => void;
}

type Tab = 'theme' | 'translations' | 'portfolio' | 'press' | 'lab' | 'collaborators' | 'contact' | 'volunteer' | 'opportunities';

const ADMIN_EMAIL = 'vnsbek@gmail.com';

function parseImages(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseExperiments(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split('::');
      return { name: (name || '').trim(), desc: rest.join('::').trim() };
    })
    .filter((item) => item.name || item.desc);
}

function experimentsToText(items: { name: string; desc: string }[]) {
  return items.map((item) => `${item.name}::${item.desc}`).join('\n');
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const store = useSiteStore();
  const [isOpen, setIsOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('portfolio');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedLang, setSelectedLang] = useState<'en' | 'ru' | 'az'>('en');
  const [selectedCategory, setSelectedCategory] = useState<keyof PortfolioData>('fashion');

  const [translationsDraft, setTranslationsDraft] = useState(store.translations);
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioData>(store.portfolioData);
  const [pressDraft, setPressDraft] = useState<PressItem[]>(store.pressData);
  const [labDraft, setLabDraft] = useState<LabItem[]>(store.labData);
  const [collaboratorsDraft, setCollaboratorsDraft] = useState<string[]>(store.collaborators || []);
  const [contactDraft, setContactDraft] = useState(store.contact);
  const [volunteerConfigDraft, setVolunteerConfigDraft] = useState(store.volunteerFormConfig);
  const [volunteerEventsDraft, setVolunteerEventsDraft] = useState<VolunteerEvent[]>(store.volunteerEvents);
  const [opportunitiesDraft, setOpportunitiesDraft] = useState<OpportunityForm[]>(store.opportunityForms || []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL && !!user.emailVerified;
      setIsAuthenticated(ok);
      if (!ok && user) {
        signOut(auth);
        setError('Unauthorized email address.');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubSite = onSnapshot(doc(db, 'settings', 'siteContent'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      store.setSiteContent(data as any);
      setTranslationsDraft(data.translations || store.translations);
      setPortfolioDraft(data.portfolioData || store.portfolioData);
      setPressDraft(data.pressData || store.pressData);
      setLabDraft(data.labData || store.labData);
      setCollaboratorsDraft(data.collaborators || store.collaborators || []);
      setContactDraft(data.contact || store.contact);
      if (data.theme) {
        // keep theme in sync too
      }
    });

    const unsubVolunteerConfig = onSnapshot(doc(db, 'settings', 'volunteerForm'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      store.updateVolunteerFormConfig(data);
      setVolunteerConfigDraft(data);
    });

    const unsubEvents = onSnapshot(collection(db, 'volunteerEvents'), (snap) => {
      const items = snap.docs
        .map((item) => ({ id: item.id, ...(item.data() as any) }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      store.setSiteContent({ volunteerEvents: items } as any);
      setVolunteerEventsDraft(items);
    });

    const unsubOpportunities = onSnapshot(collection(db, 'opportunities'), (snap) => {
      const items = snap.docs
        .map((item) => ({ id: item.id, ...(item.data() as any) }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      store.setOpportunityForms(items as any);
      setOpportunitiesDraft(items as any);
    });

    return () => {
      unsubSite();
      unsubVolunteerConfig();
      unsubEvents();
      unsubOpportunities();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sitePayload = useMemo(
    () => ({
      theme: store.theme,
      translations: translationsDraft,
      portfolioData: portfolioDraft,
      pressData: pressDraft,
      labData: labDraft,
      collaborators: collaboratorsDraft.filter(Boolean),
      contact: contactDraft,
    }),
    [store.theme, translationsDraft, portfolioDraft, pressDraft, labDraft, collaboratorsDraft, contactDraft]
  );

  const login = async () => {
    try {
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== ADMIN_EMAIL || !result.user.emailVerified) {
        await signOut(auth);
        setError('Unauthorized email address.');
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    }
  };

  const showSaved = (message = 'Saved') => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  const saveSiteSection = async (partial: any, successMessage = 'Saved') => {
    try {
      await setDoc(doc(db, 'settings', 'siteContent'), partial, { merge: true });
      store.setSiteContent(partial);
      showSaved(successMessage);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    }
  };

  const saveVolunteerConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'volunteerForm'), volunteerConfigDraft, { merge: true });
      store.updateVolunteerFormConfig(volunteerConfigDraft);
      showSaved('Volunteer form saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save volunteer form');
    }
  };

  const saveVolunteerEvent = async (event: VolunteerEvent) => {
    try {
      if (!event.id.startsWith('tmp_')) {
        await updateDoc(doc(db, 'volunteerEvents', event.id), {
          name: event.name,
          date: event.date,
          description: event.description || '',
          formUrl: event.formUrl || '',
        });
      } else {
        const { id, ...payload } = event;
        await addDoc(collection(db, 'volunteerEvents'), {
          ...payload,
          formUrl: payload.formUrl || '',
          createdAt: serverTimestamp(),
        });
        setVolunteerEventsDraft((prev) => prev.filter((item) => item.id !== id));
      }
      showSaved('Volunteer events saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save volunteer event');
    }
  };

  const deleteVolunteerEventById = async (id: string) => {
    try {
      if (id.startsWith('tmp_')) {
        setVolunteerEventsDraft((prev) => prev.filter((item) => item.id !== id));
      } else {
        await deleteDoc(doc(db, 'volunteerEvents', id));
      }
      showSaved('Volunteer event deleted');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete volunteer event');
    }
  };

  const saveOpportunity = async (item: OpportunityForm) => {
    try {
      if (!item.id.startsWith('tmp_')) {
        await updateDoc(doc(db, 'opportunities', item.id), {
          type: item.type,
          title: item.title,
          description: item.description || '',
          formUrl: item.formUrl || '',
        });
      } else {
        const { id, ...payload } = item;
        await addDoc(collection(db, 'opportunities'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setOpportunitiesDraft((prev) => prev.filter((entry) => entry.id !== id));
      }
      showSaved('Opportunity form saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save opportunity form');
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      if (id.startsWith('tmp_')) {
        setOpportunitiesDraft((prev) => prev.filter((entry) => entry.id !== id));
      } else {
        await deleteDoc(doc(db, 'opportunities', id));
      }
      showSaved('Opportunity deleted');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete opportunity');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'press', label: 'Press & Media' },
    { id: 'lab', label: 'Lab / Experiments' },
    { id: 'collaborators', label: 'Collaborators' },
    { id: 'contact', label: 'Contact' },
    { id: 'translations', label: 'Translations' },
    { id: 'theme', label: 'Theme' },
    { id: 'volunteer', label: 'Volunteer Events & Form' },
    { id: 'opportunities', label: 'Vacancies / Internship Forms' },
  ];

  return (
    <>
      <Toast message={toast} isVisible={!!toast} onClose={() => setToast('')} />
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#fe0000] text-white rounded-full flex items-center justify-center shadow-lg z-50 hover:scale-110 transition-transform"
      >
        <Settings size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="w-full h-full max-w-7xl mx-auto bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-[260px_1fr] overflow-hidden">
              <aside className="border-r border-[var(--color-border)] p-4 md:p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#fe0000]">Admin Panel</p>
                    <h2 className="font-head text-2xl uppercase">Coyora</h2>
                  </div>
                  <button onClick={() => { setIsOpen(false); onClose?.(); }} className="text-[var(--color-muted)] hover:text-[#fe0000]">
                    <X size={18} />
                  </button>
                </div>

                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <p className="font-mono text-xs text-[var(--color-muted)]">Sign in with the admin Google account.</p>
                    <button onClick={login} className="w-full px-4 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em]">Login with Google</button>
                    {error && <p className="text-xs text-[#fe0000] font-mono">{error}</p>}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {tabs.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setTab(item.id)}
                          className={`w-full text-left px-4 py-3 rounded border text-sm ${tab === item.id ? 'border-[#fe0000] text-white bg-[#fe0000]' : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => signOut(auth)} className="mt-6 w-full px-4 py-3 border border-[var(--color-border)] font-mono text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:border-[#fe0000] hover:text-[#fe0000]">
                      <LogOut size={14} /> Log out
                    </button>
                    {error && <p className="mt-4 text-xs text-[#fe0000] font-mono whitespace-pre-wrap">{error}</p>}
                  </>
                )}
              </aside>

              <main className="p-4 md:p-6 overflow-y-auto">
                {isAuthenticated && (
                  <>
                    {tab === 'theme' && (
                      <section className="space-y-6">
                        <h3 className="font-head text-3xl uppercase">Theme</h3>
                        <div className="flex gap-3">
                          <button onClick={() => store.setTheme('dark')} className={`px-4 py-3 border ${store.theme === 'dark' ? 'border-[#fe0000] text-[#fe0000]' : 'border-[var(--color-border)]'}`}>Dark</button>
                          <button onClick={() => store.setTheme('light')} className={`px-4 py-3 border ${store.theme === 'light' ? 'border-[#fe0000] text-[#fe0000]' : 'border-[var(--color-border)]'}`}>Light</button>
                        </div>
                        <button onClick={() => saveSiteSection({ theme: store.theme }, 'Theme saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'translations' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-head text-3xl uppercase">Translations</h3>
                          <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value as any)} className="border border-[var(--color-border)] bg-transparent px-3 py-2">
                            <option value="en">EN</option>
                            <option value="ru">RU</option>
                            <option value="az">AZ</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(translationsDraft[selectedLang] || {}).map(([key, value]) => (
                            <label key={key} className="block">
                              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">{key}</span>
                              <input value={String(value)} onChange={(e) => setTranslationsDraft((prev: any) => ({ ...prev, [selectedLang]: { ...prev[selectedLang], [key]: e.target.value } }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                            </label>
                          ))}
                        </div>
                        <button onClick={() => saveSiteSection({ translations: translationsDraft }, 'Translations saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'portfolio' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <h3 className="font-head text-3xl uppercase">Portfolio</h3>
                          <div className="flex gap-2 flex-wrap">
                            {(Object.keys(portfolioDraft) as (keyof PortfolioData)[]).map((category) => (
                              <button key={category} onClick={() => setSelectedCategory(category)} className={`px-3 py-2 border uppercase text-xs ${selectedCategory === category ? 'border-[#fe0000] text-[#fe0000]' : 'border-[var(--color-border)]'}`}>{category}</button>
                            ))}
                            <button onClick={() => setPortfolioDraft((prev) => ({ ...prev, [selectedCategory]: [...prev[selectedCategory], { name: 'New Project', images: [''], link: '', year: '', concept: '', process: '', credits: '' }] }))} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add</button>
                          </div>
                        </div>
                        <div className="space-y-6">
                          {portfolioDraft[selectedCategory].map((project, index) => (
                            <div key={`${selectedCategory}-${index}`} className="border border-[var(--color-border)] p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fe0000]">{selectedCategory} / {index + 1}</p>
                                <button onClick={() => setPortfolioDraft((prev) => ({ ...prev, [selectedCategory]: prev[selectedCategory].filter((_, i) => i !== index) }))} className="text-[var(--color-muted)] hover:text-[#fe0000]"><Trash2 size={16}/></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['name','year','link','concept','process','credits'].map((field) => (
                                  <label key={field} className={field === 'concept' || field === 'process' || field === 'credits' ? 'md:col-span-2' : ''}>
                                    <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">{field}</span>
                                    {field === 'concept' || field === 'process' || field === 'credits' ? (
                                      <textarea value={String((project as any)[field] || '')} rows={3} onChange={(e) => setPortfolioDraft((prev) => ({ ...prev, [selectedCategory]: prev[selectedCategory].map((item, i) => i === index ? { ...item, [field]: e.target.value } : item) }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                    ) : (
                                      <input value={String((project as any)[field] || '')} onChange={(e) => setPortfolioDraft((prev) => ({ ...prev, [selectedCategory]: prev[selectedCategory].map((item, i) => i === index ? { ...item, [field]: e.target.value } : item) }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                    )}
                                  </label>
                                ))}
                                <label className="md:col-span-2">
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Image links (one per line or comma-separated)</span>
                                  <textarea value={(project.images || []).join('\n')} rows={5} onChange={(e) => setPortfolioDraft((prev) => ({ ...prev, [selectedCategory]: prev[selectedCategory].map((item, i) => i === index ? { ...item, images: parseImages(e.target.value) } : item) }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => saveSiteSection({ portfolioData: portfolioDraft }, 'Portfolio saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'press' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-head text-3xl uppercase">Press & Media</h3>
                          <button onClick={() => setPressDraft((prev) => [...prev, { year: '', title: '', publication: '', link: '' }])} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add</button>
                        </div>
                        {pressDraft.map((item, index) => (
                          <div key={index} className="border border-[var(--color-border)] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['year','title','publication','link'].map((field) => (
                              <label key={field}>
                                <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">{field}</span>
                                <input value={String((item as any)[field] || '')} onChange={(e) => setPressDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, [field]: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                              </label>
                            ))}
                            <button onClick={() => setPressDraft((prev) => prev.filter((_, i) => i !== index))} className="justify-self-start text-[var(--color-muted)] hover:text-[#fe0000]"><Trash2 size={16}/></button>
                          </div>
                        ))}
                        <button onClick={() => saveSiteSection({ pressData: pressDraft }, 'Press saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'lab' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-head text-3xl uppercase">Lab / Experiments</h3>
                          <button onClick={() => setLabDraft((prev) => [...prev, { id: String(prev.length + 1).padStart(3, '0'), title: 'New Lab Item', image: '', description: '', experiments: [] }])} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add</button>
                        </div>
                        {labDraft.map((item, index) => (
                          <div key={item.id + index} className="border border-[var(--color-border)] p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fe0000]">Lab item {index + 1}</p>
                              <button onClick={() => setLabDraft((prev) => prev.filter((_, i) => i !== index))} className="text-[var(--color-muted)] hover:text-[#fe0000]"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {['id','title','image'].map((field) => (
                                <label key={field}>
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">{field}</span>
                                  <input value={String((item as any)[field] || '')} onChange={(e) => setLabDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, [field]: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                              ))}
                              <label className="md:col-span-2">
                                <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">description</span>
                                <textarea value={item.description} rows={3} onChange={(e) => setLabDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                              </label>
                              <label className="md:col-span-2">
                                <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">experiments (one per line: name::description)</span>
                                <textarea value={experimentsToText(item.experiments)} rows={5} onChange={(e) => setLabDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, experiments: parseExperiments(e.target.value) } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                              </label>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => saveSiteSection({ labData: labDraft }, 'Lab saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'collaborators' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-head text-3xl uppercase">Collaborators</h3>
                          <button onClick={() => setCollaboratorsDraft((prev) => [...prev, ''])} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add</button>
                        </div>
                        <div className="space-y-3">
                          {collaboratorsDraft.map((item, index) => (
                            <div key={index} className="flex gap-3 items-center">
                              <input value={item} onChange={(e) => setCollaboratorsDraft((prev) => prev.map((entry, i) => i === index ? e.target.value : entry))} className="flex-1 border border-[var(--color-border)] bg-transparent px-3 py-3" />
                              <button onClick={() => setCollaboratorsDraft((prev) => prev.filter((_, i) => i !== index))} className="text-[var(--color-muted)] hover:text-[#fe0000]"><Trash2 size={16}/></button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => saveSiteSection({ collaborators: collaboratorsDraft.filter(Boolean) }, 'Collaborators saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'contact' && (
                      <section className="space-y-6">
                        <h3 className="font-head text-3xl uppercase">Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(contactDraft).map(([key, value]) => (
                            <label key={key}>
                              <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">{key}</span>
                              <input value={String(value || '')} onChange={(e) => setContactDraft((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                            </label>
                          ))}
                        </div>
                        <button onClick={() => saveSiteSection({ contact: contactDraft }, 'Contact saved')} className="px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                      </section>
                    )}

                    {tab === 'volunteer' && (
                      <section className="space-y-6">
                        <h3 className="font-head text-3xl uppercase">Volunteer Events & Form</h3>
                        <div className="border border-[var(--color-border)] p-4 grid grid-cols-1 gap-4">
                          <label>
                            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Form title</span>
                            <input value={volunteerConfigDraft.title || ''} onChange={(e) => setVolunteerConfigDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                          </label>
                          <label>
                            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Default Google Form URL</span>
                            <input value={volunteerConfigDraft.url || ''} onChange={(e) => setVolunteerConfigDraft((prev) => ({ ...prev, url: e.target.value }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                          </label>
                          <label>
                            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Description</span>
                            <textarea value={volunteerConfigDraft.description || ''} rows={3} onChange={(e) => setVolunteerConfigDraft((prev) => ({ ...prev, description: e.target.value }))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                          </label>
                          <button onClick={saveVolunteerConfig} className="justify-self-start px-5 py-3 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Save size={14}/> Save</button>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-head text-2xl uppercase">Events</h4>
                          <button onClick={() => setVolunteerEventsDraft((prev) => [{ id: `tmp_${Date.now()}`, name: 'New Event', date: 'TBD', description: '', formUrl: volunteerConfigDraft.url || '' }, ...prev])} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add Event</button>
                        </div>
                        <div className="space-y-4">
                          {volunteerEventsDraft.map((event, index) => (
                            <div key={event.id} className="border border-[var(--color-border)] p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label>
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Name</span>
                                  <input value={event.name} onChange={(e) => setVolunteerEventsDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, name: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                                <label>
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Date</span>
                                  <input value={event.date} onChange={(e) => setVolunteerEventsDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, date: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                                <label className="md:col-span-2">
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Google Form URL</span>
                                  <input value={event.formUrl || ''} onChange={(e) => setVolunteerEventsDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, formUrl: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                                <label className="md:col-span-2">
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Description</span>
                                  <textarea value={event.description || ''} rows={3} onChange={(e) => setVolunteerEventsDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => saveVolunteerEvent(event)} className="px-4 py-2 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em]">Save</button>
                                <button onClick={() => deleteVolunteerEventById(event.id)} className="px-4 py-2 border border-[var(--color-border)] font-mono text-xs uppercase tracking-[0.2em] hover:border-[#fe0000] hover:text-[#fe0000]">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {tab === 'opportunities' && (
                      <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-head text-3xl uppercase">Vacancies / Internship Forms</h3>
                          <button onClick={() => setOpportunitiesDraft((prev) => [{ id: `tmp_${Date.now()}`, type: 'vacancy', title: 'New Opportunity', description: '', formUrl: '' }, ...prev])} className="px-3 py-2 bg-[#fe0000] text-white flex items-center gap-2 text-xs uppercase"><Plus size={14}/> Add Form</button>
                        </div>
                        <div className="space-y-4">
                          {opportunitiesDraft.map((item, index) => (
                            <div key={item.id} className="border border-[var(--color-border)] p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label>
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Type</span>
                                  <select value={item.type} onChange={(e) => setOpportunitiesDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, type: e.target.value as 'vacancy' | 'internship' } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3">
                                    <option value="vacancy">Vacancy</option>
                                    <option value="internship">Internship</option>
                                  </select>
                                </label>
                                <label>
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Title</span>
                                  <input value={item.title} onChange={(e) => setOpportunitiesDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, title: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                                <label className="md:col-span-2">
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Google Form URL</span>
                                  <input value={item.formUrl} onChange={(e) => setOpportunitiesDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, formUrl: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                                <label className="md:col-span-2">
                                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] mb-2 text-[var(--color-muted)]">Description</span>
                                  <textarea value={item.description} rows={3} onChange={(e) => setOpportunitiesDraft((prev) => prev.map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))} className="w-full border border-[var(--color-border)] bg-transparent px-3 py-3" />
                                </label>
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => saveOpportunity(item)} className="px-4 py-2 bg-[#fe0000] text-white font-mono text-xs uppercase tracking-[0.2em]">Save</button>
                                <button onClick={() => deleteOpportunity(item.id)} className="px-4 py-2 border border-[var(--color-border)] font-mono text-xs uppercase tracking-[0.2em] hover:border-[#fe0000] hover:text-[#fe0000]">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
