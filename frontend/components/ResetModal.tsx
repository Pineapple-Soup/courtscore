import Modal from "@/components/Modal";

interface ResetModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetModal = ({ onConfirm, onCancel }: ResetModalProps) => {
  return (
    <Modal title='Reset Confirmation' onClose={onCancel}>
      <div className='space-y-6 text-center p-4'>
        <div className='mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-3xl border border-destructive/50 font-bold'>
          !
        </div>
        <div className='space-y-1'>
          <h3 className='font-bold uppercase tracking-tight text-foreground'>
            Reset All Segments
          </h3>
          <p className='text-sm text-muted-foreground max-w-xs mx-auto'>
            Are you sure you want to delete all annotation segments? This action
            cannot be undone.
          </p>
        </div>
        <div className='flex justify-end gap-3 pt-4 border-t border-border'>
          <button
            className='px-3 py-2 text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors'
            onClick={onCancel}>
            Cancel
          </button>
          <button
            className='px-5 py-2 bg-destructive/10 border border-destructive/50 text-destructive text-xs font-bold uppercase tracking-widest rounded hover:bg-destructive hover:text-destructive-foreground transition-all'
            onClick={onConfirm}>
            Confirm Reset
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResetModal;
