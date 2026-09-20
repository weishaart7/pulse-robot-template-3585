import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface AppleSpotlightProps {
  isOpen: boolean;
  handleClose: () => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function AppleSpotlight({
  isOpen,
  handleClose,
  value,
  onChange,
  placeholder = 'Rechercher...',
  children,
}: AppleSpotlightProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" />

      <div
        onClick={event => event.stopPropagation()}
        className="relative w-full max-w-xl mx-4 rounded-2xl border bg-popover shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="max-h-80 overflow-y-auto p-2">{children}</div>}
      </div>
    </div>
  );
}
