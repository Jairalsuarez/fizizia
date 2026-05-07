import { useEffect, useRef } from 'react';

export function Modal({ isOpen, open, onClose, title, children, size = 'md' }) {
  const modalRef = useRef(null);
  const isModalOpen = isOpen ?? open ?? false;

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen, onClose]);

  if (!isModalOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain p-3 sm:p-4" onClick={onClose}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'modalFadeIn 160ms ease-out both' }}
      />
      <div className="relative flex min-h-full items-start justify-center py-4 sm:items-center sm:py-6">
      <div
        ref={modalRef}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${sizes[size]} flex-col overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl shadow-black/30 sm:max-h-[calc(100dvh-3rem)]`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalEnter 190ms cubic-bezier(.2,.8,.2,1) both' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-dark-700 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 hover:bg-dark-800 hover:text-white transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
