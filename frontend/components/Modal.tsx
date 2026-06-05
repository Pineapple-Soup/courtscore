import ReactDOM from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal = ({ title, children, onClose }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className='fixed inset-0 bg-muted/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      onClick={onClose}
      role='dialog'
      aria-modal='true'>
      <div
        className='bg-background text-foreground p-6 rounded-lg w-full max-w-md border border-border shadow-main'
        onClick={(e) => e.stopPropagation()}>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-xl font-bold tracking-tight'>{title}</h1>
          <button
            onClick={onClose}
            aria-label='Close'
            className='p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/10 transition'>
            <X />
          </button>
        </div>
        <div className='text-sm text-muted-foreground'>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
