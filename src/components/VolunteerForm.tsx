import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft } from 'lucide-react';
import { useSiteStore } from '../store';

export function VolunteerForm({ onClose, lang }: { onClose: () => void; lang: string }) {
  const { volunteerFormConfig, volunteerEvents, translations } = useSiteStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const selectedEvent = volunteerEvents.find((e) => e.id === selectedEventId);
  const iframeUrl = selectedEvent?.formUrl || volunteerFormConfig?.url;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-[var(--color-bg)] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-none border border-[var(--color-border)] relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[var(--color-muted)] hover:text-[#fe0000] transition-colors z-10 bg-[var(--color-bg)] p-2 rounded-full shadow-md"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-12 flex-1 flex flex-col">
          <div className="mb-8 pr-12">
            <h2 className="text-3xl md:text-5xl font-head uppercase mb-4">{volunteerFormConfig?.title || 'Volunteer Application'}</h2>
            <p className="font-mono text-sm text-[var(--color-muted)] max-w-2xl">{volunteerFormConfig?.description || 'Please fill out the form below to apply.'}</p>
          </div>

          <div className="flex-1 w-full min-h-[600px] bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] relative">
            <AnimatePresence mode="wait">
              {!selectedEventId ? (
                <motion.div
                  key="event-selection"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute inset-0 p-8 overflow-y-auto"
                >
                  <h3 className="font-mono text-sm tracking-[0.2em] text-[#fe0000] uppercase mb-8">{t.select_event}</h3>

                  {volunteerEvents.length === 0 ? (
                    <div className="text-[var(--color-muted)] font-mono text-sm">{t.no_events}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {volunteerEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          className="text-left p-6 border border-[var(--color-border)] rounded-lg hover:border-[#fe0000] hover:bg-[#fe0000]/5 transition-colors group"
                        >
                          <h4 className="font-bold text-lg mb-2 group-hover:text-[#fe0000] transition-colors">{event.name}</h4>
                          <div className="text-xs font-mono text-[var(--color-muted)] mb-4">{event.date}</div>
                          <p className="text-sm text-[var(--color-muted)] line-clamp-3">{event.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                    <button onClick={() => setSelectedEventId(null)} className="flex items-center gap-2 text-xs font-mono text-[var(--color-muted)] hover:text-[#fe0000] transition-colors">
                      <ArrowLeft size={14} /> Back to Events
                    </button>
                    <span className="text-xs font-mono text-[#fe0000] uppercase tracking-wider">{selectedEvent?.name}</span>
                  </div>

                  <div className="flex-1 w-full h-full bg-white">
                    {iframeUrl ? (
                      <iframe
                        src={iframeUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        marginHeight={0}
                        marginWidth={0}
                        title="Volunteer Form"
                        className="w-full h-full"
                      >
                        Loading…
                      </iframe>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)] font-mono p-8 text-center bg-[var(--color-bg)]">
                        {t.form_not_configured}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
