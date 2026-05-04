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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className={`relative bg-dark-900 border border-dark-700 rounded-2xl w-full ${sizes[size]} transition-all`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
