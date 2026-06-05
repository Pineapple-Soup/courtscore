import { AlertCircle } from "lucide-react";

const SystemError = ({ message }: { message: string }) => {
  return (
    <div className='flex items-center gap-3 p-6 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive'>
      <AlertCircle size={20} />
      <p className='text-sm font-bold uppercase tracking-tight'>
        System Error: {message}
      </p>
    </div>
  );
};

export default SystemError;
