import React, { useState, useEffect } from 'react';

export default function HeroTypingText() {
  const [text, setText] = useState('');
  const [isSelecting, setIsSelecting] = useState<'ALL' | 'PART' | null>(null);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const runSequence = async () => {
      while (isMounted) {
        // 1. Type COYORA
        setText('');
        setIsSelecting(null);
        const fullText = 'COYORA';
        for (let i = 1; i <= fullText.length; i++) {
          if (!isMounted) return;
          setText(fullText.slice(0, i));
          await sleep(150 + Math.random() * 100);
        }
        
        await sleep(3000);
        if (!isMounted) return;

        // 2. Select "ORA"
        setIsSelecting('PART');
        await sleep(1000);
        if (!isMounted) return;

        // 3. Delete "ORA"
        setIsSelecting(null);
        setText('COY');
        await sleep(500);
        if (!isMounted) return;

        // 4. Type "ORA" back
        const rest = 'ORA';
        for (let i = 1; i <= rest.length; i++) {
          if (!isMounted) return;
          setText('COY' + rest.slice(0, i));
          await sleep(150 + Math.random() * 100);
        }

        await sleep(4000);
        if (!isMounted) return;
        
        // 5. Select all
        setIsSelecting('ALL');
        await sleep(800);
        if (!isMounted) return;
        
        // 6. Delete all
        setIsSelecting(null);
        setText('');
        await sleep(800);
      }
    };

    runSequence();

    return () => {
      isMounted = false;
      clearInterval(cursorInterval);
    };
  }, []);

  const renderText = () => {
    if (isSelecting === 'ALL') {
      return <span className="bg-[#fe0000] text-white">{text}</span>;
    }
    if (isSelecting === 'PART' && text === 'COYORA') {
      return (
        <>
          <span>COY</span>
          <span className="bg-[#fe0000] text-white">ORA</span>
        </>
      );
    }
    return <span>{text}</span>;
  };

  return (
    <div className="h-[18vw] md:h-[15vw] flex items-center justify-center">
      <h1 className="font-head text-[18vw] md:text-[15vw] font-bold uppercase leading-[0.75] tracking-tighter mix-blend-difference text-white flex items-center justify-center">
        {renderText()}
        <span 
          className="inline-block w-[1.25vw] h-[14vw] md:w-[0.85vw] md:h-[11vw] bg-[#fe0000] ml-2" 
          style={{ opacity: showCursor && !isSelecting ? 1 : 0 }} 
        />
      </h1>
    </div>
  );
}
