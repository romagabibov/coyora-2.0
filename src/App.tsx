import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Instagram, Linkedin, Link2, Send, MessageCircle, X, ArrowUpRight, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import Lenis from 'lenis';
import { useSiteStore, PortfolioData, Project, OpportunityForm } from './store';
import AdminPanel from './AdminPanel';
import HeroTypingText from './HeroTypingText';
import ManifestoTypingText from './ManifestoTypingText';
import { LoadingScreen } from './LoadingScreen';
import { toggleMute, playHover, playClick } from './utils/audio';
import useEmblaCarousel from 'embla-carousel-react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { FORMSPREE_ENDPOINT } from './config_forms';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';

const CustomCursor = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest('a, button, [role="button"], .cursor-pointer'));
    };
    window.addEventListener('mousemove', updateMouse);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', updateMouse);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-1 h-1 rounded-full bg-[#fe0000] pointer-events-none z-[9999] hidden md:block"
        animate={{
          x: mousePos.x - 2,
          y: mousePos.y - 2,
          scale: isHovering ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 1000, damping: 40, mass: 0.1 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-4 h-4 rounded-full border border-[#fe0000]/50 pointer-events-none z-[9999] hidden md:block"
        animate={{
          x: mousePos.x - 8,
          y: mousePos.y - 8,
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? "rgba(254, 0, 0, 0.1)" : "transparent",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      />
    </>
  );
};

const SocialLink = ({ icon, href, label }: { icon: React.ReactNode, href: string, label: string }) => (
  <a href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[#fe0000] hover:border-[#fe0000] transition-all duration-300 group bg-[var(--color-surface)] hover:bg-[#fe0000]/10">
    {icon}
  </a>
);

import { VolunteerForm } from './components/VolunteerForm';
import { Toast } from './components/Toast';

export default function App() {
  const langs = ['en', 'ru', 'az'] as const;
  const [lang, setLang] = useState<typeof langs[number]>('en');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<keyof PortfolioData | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeLab, setActiveLab] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isVolunteerFormOpen, setIsVolunteerFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [emblaRef] = useEmblaCarousel({ dragFree: true });

  const [infoModal, setInfoModal] = useState<{title: string, content?: string, forms?: OpportunityForm[], type?: 'vacancy' | 'internship'} | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('admin');
  });

  const { theme, setTheme, translations, portfolioData, pressData, labData, contact, collaborators, opportunityForms } = useSiteStore();
  const t = translations[lang] || translations['en'];

  useEffect(() => {
    // Secret code listener
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      buffer += e.key.toUpperCase();
      if (buffer.length > 9) buffer = buffer.slice(-9);
      if (buffer === 'COYORA123') {
        setShowAdminPanel(true);
        buffer = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const unsubscribeSiteContent = onSnapshot(doc(db, 'settings', 'siteContent'), (snap) => {
      if (snap.exists()) {
        useSiteStore.getState().setSiteContent(snap.data() as any);
      }
    });

    const q = query(collection(db, 'volunteerEvents'), orderBy('createdAt', 'desc'));
    const unsubscribeEvents = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      useSiteStore.setState({ volunteerEvents: events });
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'volunteerEvents');
      } catch (e) {
        console.error("Failed to fetch volunteer events:", e);
      }
    });

    const unsubscribeFormConfig = onSnapshot(doc(db, 'settings', 'volunteerForm'), (docSnap) => {
      if (docSnap.exists()) {
        useSiteStore.setState({ volunteerFormConfig: docSnap.data() as any });
      }
    }, (error) => {
      console.error("Failed to fetch volunteer form config:", error);
    });

    const opportunitiesQuery = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
    const unsubscribeOpportunities = onSnapshot(opportunitiesQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      useSiteStore.setState({ opportunityForms: items });
    }, (error) => {
      console.error('Failed to fetch opportunities:', error);
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribeSiteContent();
      unsubscribeEvents();
      unsubscribeFormConfig();
      unsubscribeOpportunities();
    };
  }, []);

  const handleToggleSound = () => {
    const muted = toggleMute();
    setSoundEnabled(!muted);
  };

  const bgColor = theme === 'dark' ? '#050505' : '#f5f5f5';
  const textColor = theme === 'dark' ? '#f5f5f5' : '#050505';
  const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const mutedColor = theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const surfaceColor = theme === 'dark' ? '#0a0a0a' : '#ffffff';

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    if (isAboutOpen || activeSection || activeLab) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAboutOpen, activeSection, activeLab]);

  const toggleLang = () => setLang(prev => langs[(langs.indexOf(prev) + 1) % langs.length]);

  const servicesList = [
    { id: 'fashion' as const, title: t.s_fashion, desc: t.s_fashion_p },
    { id: 'event' as const, title: t.s_event, desc: t.s_event_p },
    { id: 'graphic' as const, title: t.s_graphic, desc: t.s_graphic_p },
    { id: 'web' as const, title: t.s_web, desc: t.s_web_p },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      const formData = new FormData(form);
      formData.append('_subject', 'Coyora website inquiry');
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed');
      setToastMessage(t.success_contact);
      setIsToastVisible(true);
      form.reset();
    } catch (error) {
      setToastMessage('Form submission failed.');
      setIsToastVisible(true);
    }
  };

  const handleSubscribeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(t.success_subscribe);
    setIsToastVisible(true);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <motion.div 
      style={{ 
        '--color-bg': bgColor, 
        '--color-text': textColor, 
        '--color-border': borderColor,
        '--color-muted': mutedColor,
        '--color-surface': surfaceColor,
        backgroundColor: bgColor,
        color: textColor
      } as any}
      className="relative min-h-screen font-sans selection:bg-[#fe0000] selection:text-white"
    >
      <Toast message={toastMessage} isVisible={isToastVisible} onClose={() => setIsToastVisible(false)} />
      {isLoading && <LoadingScreen onComplete={() => {}} />}
      <div className="bg-noise" />
      <CustomCursor />

      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}

      {/* Header */}
      <header className="fixed top-0 w-full p-6 md:p-8 flex justify-between items-center z-40 mix-blend-difference text-white">
        <div className="flex items-center gap-4">
          <img src="https://i.ibb.co/6cFB7Hqz/1.jpg" alt="COYORA Logo" className="h-5 w-auto object-contain" />
          <span className="font-head font-bold text-xs tracking-[0.4em] hidden sm:block uppercase text-white">COYORA</span>
        </div>
        
        <div className="text-[10px] font-mono text-white/60 hidden lg:flex items-center gap-4 tracking-[0.2em]">
          <span>SYS.VER.2.0.26</span>
          <span className="w-1 h-1 rounded-full bg-[#fe0000] animate-pulse" />
          <span className="text-[#fe0000]">ONLINE</span>
        </div>

        <nav className="flex gap-6 md:gap-8 items-center">
          <a href="#services" onMouseEnter={playHover} onClick={playClick} className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-[#fe0000] transition-colors font-mono hidden md:block">[{t.nav_design}]</a>
          <button onClick={() => { playClick(); setIsAboutOpen(true); }} onMouseEnter={playHover} className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-[#fe0000] transition-colors font-mono hidden md:block">[{t.nav_about}]</button>
          <a href="#lab" onMouseEnter={playHover} onClick={playClick} className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-[#fe0000] transition-colors font-mono hidden md:block">[LAB]</a>
          <a href="#press" onMouseEnter={playHover} onClick={playClick} className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-[#fe0000] transition-colors font-mono hidden md:block">[PRESS]</a>
          <a href="#contact" onMouseEnter={playHover} onClick={playClick} className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-[#fe0000] transition-colors font-mono hidden md:block">[{t.nav_contact}]</a>
          <button onClick={() => { playClick(); handleToggleSound(); }} onMouseEnter={playHover} className="text-[10px] uppercase tracking-[0.2em] text-white hover:text-[#fe0000] transition-colors ml-4 font-mono border border-white/20 hover:border-[#fe0000] px-3 py-1 rounded-none flex items-center gap-2">
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {t.sound}
          </button>
          <button onClick={() => { playClick(); setTheme(theme === 'dark' ? 'light' : 'dark'); }} onMouseEnter={playHover} className="text-[10px] uppercase tracking-[0.2em] text-white hover:text-[#fe0000] transition-colors ml-2 font-mono border border-white/20 hover:border-[#fe0000] px-3 py-1 rounded-none">
            {theme === 'dark' ? t.light : t.dark}
          </button>
          <button onClick={() => { playClick(); toggleLang(); }} onMouseEnter={playHover} className="text-[10px] uppercase tracking-[0.2em] text-white hover:text-[#fe0000] transition-colors ml-2 font-mono border border-white/20 hover:border-[#fe0000] px-3 py-1 rounded-none">
            {lang}
          </button>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section data-theme="dark" className="h-screen flex flex-col justify-center px-[4vw] md:px-[8vw] relative overflow-hidden">
          {/* Background Video */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#050505]/80 mix-blend-multiply z-10" />
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-30 grayscale"
            >
              <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Grid lines background for technical feel */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-20 z-0" />
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full flex flex-col items-center text-center mt-12">
            <div className="mb-8 px-4 py-1 border border-[#fe0000]/30 rounded-none bg-[#fe0000]/5 backdrop-blur-md">
              <span className="text-[#fe0000] font-mono text-[10px] tracking-[0.2em] uppercase">
                {t.studio} // EST. 2026
              </span>
            </div>
            <HeroTypingText />
            <p className="mt-12 font-mono text-xs md:text-sm text-[var(--color-muted)] tracking-[0.3em] uppercase max-w-xl mx-auto leading-relaxed">
              Bridging the gap between physical fashion and digital expression.
            </p>
          </motion.div>
        </section>

        {/* Marquee - Minimalist version */}
        <div className="py-4 border-y border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <div className="marquee-container">
            <div className="marquee-content font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              <span className="mx-8">WE BUILD DIGITAL & PHYSICAL EXPERIENCES</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">FASHION</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">EVENT</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">GRAPHIC</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">WEB</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">WE BUILD DIGITAL & PHYSICAL EXPERIENCES</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">FASHION</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">EVENT</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">GRAPHIC</span>
              <span className="mx-8 text-[#fe0000]">/</span>
              <span className="mx-8">WEB</span>
              <span className="mx-8 text-[#fe0000]">/</span>
            </div>
          </div>
        </div>

        {/* Services / Futuristic Minimalist Grid */}
        <section id="services" data-theme="light" className="py-[15vh] px-[4vw] md:px-[8vw]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-between items-end mb-12"
          >
            <h2 className="font-mono text-xs md:text-sm text-[var(--color-muted)] tracking-[0.3em] uppercase">
              {t.core_capabilities}
            </h2>
            <span className="font-mono text-[10px] text-[#fe0000] hidden sm:block">{t.select_module}</span>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 border-t border-l border-[var(--color-border)]">
            {servicesList.map((s, i) => (
              <motion.div 
                key={s.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.1 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={playHover}
                onClick={() => { playClick(); setActiveSection(s.id); setActiveProject(null); }}
                className="group p-8 md:p-12 flex flex-col justify-between min-h-[40vh] cursor-pointer bg-[var(--color-bg)] hover:bg-[#fe0000] transition-colors duration-500 relative overflow-hidden border-r border-b border-[var(--color-border)]"
              >
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-[var(--color-muted)] group-hover:text-black/50 font-mono text-xs tracking-widest transition-colors">0{i+1}</span>
                  <ArrowUpRight className="text-[var(--color-muted)] group-hover:text-black transition-colors duration-500 transform group-hover:translate-x-1 group-hover:-translate-y-1" size={24} strokeWidth={1.5} />
                </div>
                <div className="mt-20 relative z-10">
                  <h3 className="font-head text-2xl md:text-3xl uppercase text-[var(--color-text)] group-hover:text-black transition-colors mb-4 tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-[var(--color-muted)] group-hover:text-black/80 text-[10px] md:text-xs font-mono leading-relaxed tracking-wide transition-colors">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Playground / Lab Section */}
        <section id="lab" data-theme="dark" className="py-[15vh] px-[4vw] md:px-[8vw] border-t border-[var(--color-border)]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-between items-end mb-12"
          >
            <h2 className="font-mono text-xs md:text-sm text-[var(--color-muted)] tracking-[0.3em] uppercase">
              {t.lab_experiments}
            </h2>
            <span className="font-mono text-[10px] text-[#fe0000] hidden sm:block">{t.rd_division}</span>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-border)] border border-[var(--color-border)]">
            {labData.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.1 }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => { playClick(); setActiveLab(item.id); }}
                className="group relative aspect-square bg-[var(--color-bg)] overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-[#fe0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 mix-blend-overlay" />
                <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" loading="lazy" />
                <div className="absolute bottom-0 left-0 p-6 z-20 translate-y-0 opacity-100 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500">
                  <p className="font-mono text-[10px] text-[#fe0000] tracking-widest mb-2">EXP_{item.id}</p>
                  <h3 className="font-head text-xl uppercase text-white">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Press / Media Section */}
        <section id="press" className="py-[15vh] px-[4vw] md:px-[8vw] border-t border-[var(--color-border)]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-between items-end mb-12"
          >
            <h2 className="font-mono text-xs md:text-sm text-[var(--color-muted)] tracking-[0.3em] uppercase">
              {t.press_media}
            </h2>
            <span className="font-mono text-[10px] text-[#fe0000] hidden sm:block">{t.publications}</span>
          </motion.div>
          
          <div className="flex flex-col border-t border-[var(--color-border)]">
            {pressData.map((item, idx) => (
              <motion.a 
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group flex flex-col md:flex-row justify-between items-start md:items-center py-8 border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors px-4"
              >
                <div className="flex items-center gap-8 mb-4 md:mb-0">
                  <span className="font-mono text-xs text-[var(--color-muted)]">{item.year}</span>
                  <h3 className="font-head text-xl md:text-2xl uppercase group-hover:text-[#fe0000] transition-colors">{item.title}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs tracking-widest uppercase">{item.publication}</span>
                  <ArrowUpRight size={16} className="text-[var(--color-muted)] group-hover:text-[#fe0000] transition-colors transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Manifesto Section */}
        <section id="manifesto" className="py-[20vh] px-[4vw] md:px-[8vw] border-t border-[var(--color-border)] flex items-center justify-center bg-[var(--color-bg)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-10" />
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto text-center relative z-10"
          >
            <h2 className="font-mono text-[10px] text-[#fe0000] tracking-[0.3em] uppercase mb-12">{t.manifesto}</h2>
            <ManifestoTypingText />
          </motion.div>
        </section>

        {/* Collaborators Section */}
        <section id="collaborators" className="py-[10vh] border-t border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <div className="flex justify-between items-end mb-12 px-[4vw] md:px-[8vw]">
            <h2 className="font-mono text-xs md:text-sm text-[var(--color-muted)] tracking-[0.3em] uppercase">
              {t.collaborators}
            </h2>
          </div>
          <div className="marquee-container py-8 border-y border-[var(--color-border)]">
            <div className="marquee-content font-head text-4xl md:text-6xl uppercase tracking-tighter text-[var(--color-text)]">
              {[...(collaborators?.length ? collaborators : ['Azerbaijan Fashion Week','MBFW AZERBAIJAN','Big Model Agency','Debet Safety','VCONT']), ...(collaborators?.length ? collaborators : ['Azerbaijan Fashion Week','MBFW AZERBAIJAN','Big Model Agency','Debet Safety','VCONT'])].map((name, index) => (
                <React.Fragment key={name + index}>
                  <span className="mx-12">{name}</span>
                  <span className="mx-12 text-[#fe0000]">/</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-[15vh] px-[4vw] md:px-[8vw] border-t border-[var(--color-border)] relative overflow-hidden bg-[var(--color-bg)]">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center"
          >
            <div className="w-px h-24 bg-gradient-to-b from-transparent to-[#fe0000] mb-12" />
            <h2 className="font-mono text-xs md:text-sm tracking-[0.3em] text-[#fe0000] uppercase mb-8">
              {t.initiate_sequence}
            </h2>
            <h3 className="font-head text-4xl md:text-6xl uppercase mb-12 max-w-3xl leading-tight text-[var(--color-text)]">
              {t.lets_talk}
            </h3>
            
            <a 
              href={`mailto:${contact.email}`} 
              className="group relative font-head text-[6vw] md:text-[4vw] leading-none text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors duration-500 block mb-16 tracking-tighter"
            >
              {contact.email}
              <div className="absolute -bottom-4 left-0 w-0 h-px bg-[#fe0000] group-hover:w-full transition-all duration-700" />
            </a>

            {/* Contact Form */}
            <form onSubmit={handleContactSubmit} className="w-full max-w-2xl text-left mb-24 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" name="name" placeholder={t.name} required className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
                <input type="text" name="company" placeholder={t.company} className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
                <input type="email" name="email" placeholder="EMAIL" required className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
                <input type="tel" name="phone" placeholder="PHONE" required className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <select name="project_type" className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors appearance-none text-[var(--color-text)]">
                  <option value="" className="text-[var(--color-muted)]">{t.project_type}</option>
                  <option value="fashion" className="text-[var(--color-bg)] bg-[var(--color-text)]">FASHION</option>
                  <option value="event" className="text-[var(--color-bg)] bg-[var(--color-text)]">EVENT</option>
                  <option value="web" className="text-[var(--color-bg)] bg-[var(--color-text)]">WEB</option>
                  <option value="graphic" className="text-[var(--color-bg)] bg-[var(--color-text)]">GRAPHIC</option>
                </select>
                <select name="budget" className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors appearance-none text-[var(--color-text)]">
                  <option value="" className="text-[var(--color-muted)]">{t.budget}</option>
                  <option value="small" className="text-[var(--color-bg)] bg-[var(--color-text)]">&lt; $5k</option>
                  <option value="medium" className="text-[var(--color-bg)] bg-[var(--color-text)]">$5k - $15k</option>
                  <option value="large" className="text-[var(--color-bg)] bg-[var(--color-text)]">&gt; $15k</option>
                </select>
              </div>
              <textarea name="message" placeholder={t.message} required rows={4} className="bg-transparent border-b border-[var(--color-border)] py-4 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors resize-none text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
              <button type="submit" className="self-start px-8 py-4 bg-[#fe0000] text-white font-mono text-xs tracking-[0.2em] uppercase hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] transition-colors duration-500">
                {t.send_inquiry}
              </button>
            </form>

            {/* Newsletter */}
            <div className="w-full max-w-md mx-auto mb-24">
              <h4 className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-muted)] uppercase mb-6 text-center">{t.subscribe_void}</h4>
              <form className="flex gap-4" onSubmit={handleSubscribeSubmit}>
                <input type="email" placeholder={t.enter_email} required className="flex-1 bg-transparent border-b border-[var(--color-border)] py-2 font-mono text-xs tracking-widest focus:outline-none focus:border-[#fe0000] transition-colors text-[var(--color-text)] placeholder:text-[var(--color-muted)]" />
                <button type="submit" className="px-6 py-2 bg-[#fe0000] text-white font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] transition-colors">{t.join}</button>
              </form>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-12 border-t border-[var(--color-border)] w-full">
              <SocialLink icon={<Instagram size={20} strokeWidth={1.5}/>} label="Instagram" href={contact.instagram} />
              <SocialLink icon={<Linkedin size={20} strokeWidth={1.5}/>} label="LinkedIn" href={contact.linkedin} />
              <SocialLink icon={<Link2 size={20} strokeWidth={1.5}/>} label="Website" href={contact.website} />
              <SocialLink icon={<Send size={20} strokeWidth={1.5}/>} label="Telegram" href={contact.telegram} />
              <SocialLink icon={<MessageCircle size={20} strokeWidth={1.5}/>} label="WhatsApp" href={contact.whatsapp} />
            </div>

            <div className="mt-32 w-full text-[10px] text-[var(--color-muted)] tracking-[0.2em] font-mono uppercase flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                <div className="flex flex-row gap-4 items-center">
                  <span>COYORA © 2026</span>
                  <span className="text-[#fe0000]">/</span>
                  <span>BAKU</span>
                  <span className="text-[#fe0000]">/</span>
                  <span>{t.working_worldwide}</span>
                </div>
                <div className="hidden md:block w-8"></div>
                <div className="flex flex-row gap-4 items-center mt-4 md:mt-0">
                  <span className="hidden md:inline text-[#fe0000]">/</span>
                  <button onClick={() => { playClick(); setInfoModal({ title: t.vacancies, content: t.vacancies_info, type: 'vacancy', forms: opportunityForms.filter((item) => item.type === 'vacancy') }); }} className="hover:text-[#fe0000] transition-colors">{t.vacancies}</button>
                  <span className="text-[#fe0000]">/</span>
                  <button onClick={() => { playClick(); setInfoModal({ title: t.internship, content: t.internship_info, type: 'internship', forms: opportunityForms.filter((item) => item.type === 'internship') }); }} className="hover:text-[#fe0000] transition-colors">{t.internship}</button>
                  <span className="text-[#fe0000]">/</span>
                  <button onClick={() => { playClick(); setIsVolunteerFormOpen(true); }} className="hover:text-[#fe0000] transition-colors">{t.volunteer}</button>
                </div>
              </div>
              
              <a 
                href="https://maps.app.goo.gl/iCTwuq7bN54SEUXn6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex flex-col items-center md:items-end gap-3 hover:text-[var(--color-text)] transition-colors mt-8 md:mt-0"
              >
                <div className="w-48 h-24 md:w-64 md:h-32 bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden relative">
                  <div className="absolute inset-0 bg-[#fe0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 mix-blend-overlay" />
                  <iframe 
                    src="https://maps.google.com/maps?q=40.37931731088697,49.878500417756605&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                    className="w-full h-full border-none grayscale opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    title="Location Map"
                  />
                </div>
                <span className="flex items-center gap-2">
                  40.3793° N, 49.8785° E <ArrowUpRight size={10} className="text-[#fe0000]" />
                </span>
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-[var(--color-bg)] z-50 overflow-y-auto"
          >
            {/* Technical grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
            
            <div className="min-h-screen p-6 md:p-12 flex flex-col relative z-10">
              <div className="flex justify-between items-center mb-16 border-b border-[var(--color-border)] pb-6">
                <span className="font-mono text-[10px] text-[#fe0000] tracking-[0.3em] uppercase">SYS.INFO // {t.nav_about}</span>
                <button onClick={() => setIsAboutOpen(false)} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--color-muted)] hover:text-[#fe0000] transition-colors group">
                  {t.close}
                </button>
              </div>

              <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
                <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-center">
                  <div className="w-full md:w-2/5 relative group">
                    <div className="absolute -inset-4 border border-[#fe0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="aspect-[3/4] bg-[var(--color-surface)] overflow-hidden border border-[var(--color-border)] relative">
                      <div className="absolute inset-0 bg-[#fe0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 mix-blend-overlay" />
                      <img src="https://i.ibb.co/pvwdGxYx/ADY05299.jpg" alt="Ramazan Habibov" className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                    </div>
                    {/* Technical corner markers */}
                    <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-[#fe0000] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-[#fe0000] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="w-full md:w-3/5">
                    <h2 className="font-head text-4xl md:text-6xl uppercase mb-8 tracking-tighter text-[var(--color-text)]">{t.about_title}<span className="text-[#fe0000]">.</span></h2>
                    <div className="w-12 h-px bg-[#fe0000] mb-8" />
                    <p className="text-sm md:text-base leading-relaxed font-mono text-[var(--color-muted)] tracking-wide mb-12">
                      {t.about_text}
                    </p>

                    {/* Timeline */}
                    <div className="border-t border-[var(--color-border)] pt-12">
                      <div>
                        <h3 className="font-mono text-[10px] tracking-[0.3em] text-[#fe0000] uppercase mb-6">{t.timeline}</h3>
                        <ul className="space-y-4 font-mono text-xs text-[var(--color-muted)]">
                          <li className="flex gap-4"><span className="text-[var(--color-text)]">2026</span> <span>Coyora Studio launch</span></li>
                          <li className="flex gap-4"><span className="text-[var(--color-text)]">2025</span> <span>Azerbaijan Fashion Week</span></li>
                          <li className="flex gap-4"><span className="text-[var(--color-text)]">2024</span> <span>Grand Prix Azerbaijan Fashion Forwards</span></li>
                          <li className="flex gap-4"><span className="text-[var(--color-text)]">2022</span> <span>Azerbaijan Fashion Week management</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lab Modal */}
      <AnimatePresence>
        {activeLab && (
          <motion.div
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-[var(--color-bg)] z-50 overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
            
            <div className="min-h-screen p-6 md:p-12 flex flex-col relative z-10">
              <div className="flex justify-between items-center mb-16 border-b border-[var(--color-border)] pb-6">
                <span className="font-mono text-[10px] text-[#fe0000] tracking-[0.3em] uppercase">
                  LAB // EXP_{activeLab}
                </span>
                <button onClick={() => setActiveLab(null)} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--color-muted)] hover:text-[#fe0000] transition-colors">
                  {t.close}
                </button>
              </div>

              <div className="max-w-7xl mx-auto w-full">
                {labData.filter(l => l.id === activeLab).map(lab => (
                  <motion.div key={lab.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="flex flex-col md:flex-row gap-12 mb-16">
                      <div className="w-full md:w-1/2">
                        <div className="aspect-square bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden relative group">
                          <div className="absolute inset-0 bg-[#fe0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 mix-blend-overlay" />
                          <img src={lab.image} alt={lab.title} className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                        </div>
                      </div>
                      <div className="w-full md:w-1/2 flex flex-col justify-center">
                        <h2 className="font-head text-4xl md:text-6xl uppercase mb-8 tracking-tighter text-[var(--color-text)]">{lab.title}<span className="text-[#fe0000]">.</span></h2>
                        <div className="w-12 h-px bg-[#fe0000] mb-8" />
                        <p className="text-sm md:text-base leading-relaxed font-mono text-[var(--color-muted)] tracking-wide mb-12">
                          {lab.description}
                        </p>
                        
                        <div className="border-t border-[var(--color-border)] pt-12">
                          <h3 className="font-mono text-[10px] tracking-[0.3em] text-[#fe0000] uppercase mb-6">{t.experiments}</h3>
                          <div className="space-y-8">
                            {lab.experiments.map((exp, idx) => (
                              <div key={idx} className="border-l-2 border-[#fe0000] pl-4">
                                <h4 className="font-head text-xl uppercase text-[var(--color-text)] mb-2">{exp.name}</h4>
                                <p className="font-mono text-xs text-[var(--color-muted)] leading-relaxed">{exp.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio Modal */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-[var(--color-bg)] z-50 overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
            
            <div className="min-h-screen p-6 md:p-12 flex flex-col relative z-10">
              <div className="flex justify-between items-center mb-16 border-b border-[var(--color-border)] pb-6">
                <div className="flex items-center gap-6">
                  <span className="font-mono text-[10px] text-[#fe0000] tracking-[0.3em] uppercase">
                    DIR // {activeSection.toUpperCase()}
                  </span>
                  {activeProject && (
                    <button onClick={() => setActiveProject(null)} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                      <ArrowLeft size={12} /> [ {t.back_to_projects} ]
                    </button>
                  )}
                </div>
                
                <button onClick={() => { setActiveSection(null); setActiveProject(null); }} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--color-muted)] hover:text-[#fe0000] transition-colors">
                  {t.close}
                </button>
              </div>

              <div className="max-w-7xl mx-auto w-full">
                {!activeProject ? (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                      <h2 className="font-head text-5xl md:text-7xl uppercase tracking-tighter text-[var(--color-text)]">
                        {activeSection.replace('_', ' ')}<span className="text-[#fe0000]">.</span>
                      </h2>
                      
                      {/* Category Filter */}
                      <div className="flex flex-wrap gap-4 font-mono text-[10px] tracking-[0.2em] uppercase">
                        {Object.keys(portfolioData).map((category) => (
                          <button
                            key={category}
                            onClick={() => { playClick(); setActiveSection(category); }}
                            onMouseEnter={playHover}
                            className={`transition-colors duration-300 ${activeSection === category ? 'text-[#fe0000] border-b border-[#fe0000]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
                          >
                            [ {category.replace('_', ' ')} ]
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={activeSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col border-t border-[var(--color-border)]"
                      >
                        {portfolioData[activeSection].length > 0 ? (
                          portfolioData[activeSection].map((proj, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: false, amount: 0.2 }}
                              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => { playClick(); setActiveProject(proj); }}
                              onMouseEnter={playHover}
                              className="py-8 md:py-12 border-b border-[var(--color-border)] flex justify-between items-center cursor-pointer group hover:bg-[#fe0000] px-6 -mx-6 transition-colors duration-500"
                            >
                              <div className="flex items-center gap-8">
                                <span className="font-mono text-[10px] text-[var(--color-muted)] group-hover:text-black/50 transition-colors">0{idx+1}</span>
                                <span className="font-head text-2xl md:text-4xl uppercase text-[var(--color-muted)] group-hover:text-[var(--color-bg)] transition-colors tracking-tight">{proj.name}</span>
                              </div>
                              <ArrowUpRight className="text-[var(--color-muted)] group-hover:text-black transition-colors duration-500 transform group-hover:translate-x-2 group-hover:-translate-y-2" size={24} strokeWidth={1.5} />
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-[#fe0000] text-xs font-mono tracking-widest uppercase mt-12">[ {t.coming_soon} ]</p>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                      <div>
                        <h3 className="font-head text-3xl md:text-5xl tracking-tighter text-[var(--color-text)] mb-4">{activeProject.name}</h3>
                        <div className="flex gap-4 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-muted)]">
                          {activeProject.year && <span>{activeProject.year}</span>}
                          {activeProject.year && <span className="text-[#fe0000]">/</span>}
                          <span>{activeSection}</span>
                        </div>
                      </div>
                      {activeProject.link && (
                        <a 
                          href={activeProject.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 px-6 py-3 bg-[#fe0000] text-white font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] transition-colors duration-500 group"
                        >
                          {t.visit_site} <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </a>
                      )}
                    </div>

                    {(activeProject.concept || activeProject.process || activeProject.credits) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 border-t border-[var(--color-border)] pt-12">
                        {activeProject.concept && (
                          <div>
                            <h4 className="font-mono text-[10px] tracking-[0.3em] text-[#fe0000] uppercase mb-4">[ CONCEPT ]</h4>
                            <p className="font-mono text-xs text-[var(--color-muted)] leading-relaxed">{activeProject.concept}</p>
                          </div>
                        )}
                        {activeProject.process && (
                          <div>
                            <h4 className="font-mono text-[10px] tracking-[0.3em] text-[#fe0000] uppercase mb-4">[ PROCESS ]</h4>
                            <p className="font-mono text-xs text-[var(--color-muted)] leading-relaxed">{activeProject.process}</p>
                          </div>
                        )}
                        {activeProject.credits && (
                          <div>
                            <h4 className="font-mono text-[10px] tracking-[0.3em] text-[#fe0000] uppercase mb-4">[ CREDITS ]</h4>
                            <p className="font-mono text-xs text-[var(--color-muted)] leading-relaxed whitespace-pre-line">{activeProject.credits}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeProject.images && activeSection !== 'web' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {activeProject.images.map((img, idx) => (
                          <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                            <div className="mb-3">
                              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#fe0000] mb-2">Frame {String(idx + 1).padStart(2, '0')}</p>
                              <p className="font-head text-lg uppercase tracking-tight text-[var(--color-text)]">{activeProject.name}</p>
                              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] mt-1">{activeProject.year || activeSection}</p>
                            </div>
                            <div className="aspect-square overflow-hidden bg-[var(--color-bg)] relative group">
                              <div className="absolute inset-0 bg-[#fe0000]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none mix-blend-overlay" />
                              <img src={img} alt={activeProject.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" loading="lazy" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeSection === 'web' && activeProject.link && (
                      <div className="w-full aspect-video bg-[var(--color-border)] border border-[var(--color-border)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#fe0000]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none mix-blend-overlay" />
                        <iframe 
                          src={activeProject.link} 
                          className="w-full h-full border-none grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
                          title={activeProject.name}
                          loading="lazy"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {infoModal && (
          <motion.div
            data-lenis-prevent="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[var(--color-bg)] z-50 overflow-y-auto flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 md:p-12 max-w-2xl w-full relative z-10">
              <div className="flex justify-between items-center mb-8 border-b border-[var(--color-border)] pb-4">
                <span className="font-mono text-[10px] text-[#fe0000] tracking-[0.3em] uppercase">
                  SYS.INFO // {infoModal.title}
                </span>
                <button onClick={() => setInfoModal(null)} className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-[var(--color-muted)] hover:text-[#fe0000] transition-colors">
                  [ CLOSE ]
                </button>
              </div>
              <h2 className="font-head text-3xl md:text-5xl uppercase mb-8 tracking-tighter text-[var(--color-text)]">
                {infoModal.title}<span className="text-[#fe0000]">.</span>
              </h2>
              <p className="font-mono text-sm text-[var(--color-muted)] leading-relaxed">
                {infoModal.content}
              </p>
              {infoModal.forms && infoModal.forms.length > 0 && (
                <div className="mt-8 space-y-4">
                  {infoModal.forms.map((item) => (
                    <a key={item.id} href={item.formUrl} target="_blank" rel="noopener noreferrer" className="block border border-[var(--color-border)] p-4 hover:border-[#fe0000] hover:bg-[#fe0000]/5 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#fe0000] mb-2">{item.type}</p>
                          <h3 className="font-head text-2xl uppercase tracking-tight text-[var(--color-text)]">{item.title}</h3>
                          {item.description && <p className="font-mono text-xs text-[var(--color-muted)] mt-2">{item.description}</p>}
                        </div>
                        <ArrowUpRight size={18} className="text-[#fe0000]" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVolunteerFormOpen && (
          <VolunteerForm onClose={() => setIsVolunteerFormOpen(false)} lang={lang} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
