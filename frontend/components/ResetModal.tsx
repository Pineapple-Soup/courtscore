import Modal from "@/components/Modal";

interface ResetModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetModal = ({ onConfirm, onCancel }: ResetModalProps) => {
  return (
    <Modal title='Reset Confirmation' onClose={onCancel}>
      <p>
        Are you sure you want to reset all segments? This action cannot be
        undone.
      </p>
      <div className='mt-4 flex justify-end gap-2'>
        <button
          className='p-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 cursor-pointer'
          onClick={onCancel}>
          Cancel
        </button>
        <button
          className='p-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer'
          onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
};

export default ResetModal;
