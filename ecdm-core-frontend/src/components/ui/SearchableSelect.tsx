import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = React.useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      opt.subLabel?.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-within:ring-[3px] focus-within:ring-[hsl(var(--primary))]/10 focus-within:border-[hsl(var(--primary))]/50 cursor-pointer',
          open && 'border-[hsl(var(--primary))]/50 ring-[3px] ring-[hsl(var(--primary))]/10'
        )}
      >
        <span className={cn('block truncate', !selectedOption && 'text-[hsl(var(--muted-foreground))]')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200 modern-glass-card">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]/30">
            <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              autoFocus
              type="text"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder="Filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {loading ? (
              <div className="py-2 px-3 text-sm text-[hsl(var(--muted-foreground))] animate-pulse">Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-2 px-3 text-sm text-[hsl(var(--muted-foreground))]">No results found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-[hsl(var(--accent))]',
                    value === opt.id && 'bg-[hsl(var(--accent))]'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-[hsl(var(--muted-foreground))]">{opt.subLabel}</span>}
                  </div>
                  {value === opt.id && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

