'use client';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute bottom-full right-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-[13px] rounded-[12px] p-3 shadow-lg z-50">
          {text}
          <div className="absolute top-full right-4 -mt-1">
            <div className="border-4 border-transparent border-t-[var(--color-bg-secondary)]"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
