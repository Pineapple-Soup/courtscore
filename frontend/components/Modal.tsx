import React, { useEffect } from "react";
import { X } from "lucide-react";
import ReactDOM from "react-dom";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal = ({ title, children, onClose }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className='fixed inset-0 bg-black/75 flex items-center justify-center'
      onClick={onClose}>
      <div
        className='bg-white p-4 rounded-2xl w-96'
        onClick={(e) => e.stopPropagation()}>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <button onClick={onClose} className='cursor-pointer'>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
