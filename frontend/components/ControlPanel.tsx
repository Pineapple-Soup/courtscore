"use client";

import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import ResetModal from "@/components/ResetModal";

const ControlPanel = () => {
  const clearInProgress = useAnnotationStore((s) => s.clearInProgress);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleReset = () => {
    clearInProgress();
    setIsResetModalOpen(false);
  };

  return (
    <div className='grid grid-rows-2 grid-cols-2 gap-4'>
      <button
        className='rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold cursor-pointer'
        aria-label='Reset'
        type='button'
        onClick={() => setIsResetModalOpen(true)}>
        Reset
      </button>
      <button
        className='rounded-lg bg-neutral-500 hover:bg-neutral-600 text-white font-semibold cursor-pointer'
        aria-label='Export'
        type='button'>
        Export
      </button>
      <button
        className='rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold cursor-pointer'
        aria-label='Save'
        type='button'>
        Save
      </button>
      <button
        className='rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold cursor-pointer'
        aria-label='Submit'
        type='button'>
        Submit
      </button>

      {isResetModalOpen && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setIsResetModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ControlPanel;
