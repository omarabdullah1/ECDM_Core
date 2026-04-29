'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ 
  children, 
  asChild 
}: { 
  children: React.ReactNode; 
  asChild?: boolean;
}) {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be used within Dialog');

  const handleClick = () => context.onOpenChange(true);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return <button onClick={handleClick}>{children}</button>;
}

export function DialogContent({ 
  className, 
  children, 
  onClose 
}: DialogContentProps) {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogContent must be used within Dialog');

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!context.open || !mounted) return null;

  const handleClose = () => {
    onClose?.();
    context.onOpenChange(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300 pointer-events-auto" 
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Dialog Card (Centered) */}
      <div
        className={cn(
          'relative w-full sm:max-w-xl max-h-[90vh] flex flex-col',
          'bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 overflow-hidden pointer-events-auto',
          'rounded-3xl border border-gray-200 min-h-0',
          className
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - now always on top of the card stack */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 z-50 rounded-full bg-gray-100 p-2 text-gray-500 transition-all hover:bg-gray-200 hover:text-black focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn('flex-none px-8 py-6 border-b border-gray-100 bg-white/50', className)}>
      {children}
    </div>
  );
}

export function DialogBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('text-xl font-bold leading-none tracking-tight text-[#111111]', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-[hsl(var(--muted-foreground))]', className)}>
      {children}
    </p>
  );
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn('flex-none px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3', className)}>
      {children}
    </div>
  );
}

export function DialogClose({ 
  children, 
  asChild 
}: { 
  children: React.ReactNode; 
  asChild?: boolean;
}) {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogClose must be used within Dialog');

  const handleClick = () => context.onOpenChange(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return <button onClick={handleClick}>{children}</button>;
}

