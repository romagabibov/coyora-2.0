import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

export default function ManifestoTypingText() {
  const fullText = 'We reject the ordinary.\nWe build the void between\nphysical reality & digital illusion.';
  const [text, setText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const hasTyped = useRef(false);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (!isInView || hasTyped.current) return;
    hasTyped.current = true;
    let cancelled = false;

    (async () => {
      for (let i = 1; i <= fullText.length; i += 1) {
        if (cancelled) return;
        setText(fullText.slice(0, i));
        await new Promise((resolve) => setTimeout(resolve, 32 + Math.random() * 40));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isInView]);

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <p className="font-head text-3xl md:text-5xl lg:text-7xl uppercase leading-[1.1] tracking-tighter text-transparent whitespace-pre-line select-none">
        {fullText}
      </p>
      <p className="absolute inset-0 font-head text-3xl md:text-5xl lg:text-7xl uppercase leading-[1.1] tracking-tighter text-[var(--color-text)] whitespace-pre-line">
        {text}
        <span
          className="inline-block w-4 h-8 md:w-6 md:h-12 lg:w-8 lg:h-16 bg-[#fe0000] ml-2 align-middle"
          style={{ opacity: showCursor ? 1 : 0 }}
        />
      </p>
    </div>
  );
}
