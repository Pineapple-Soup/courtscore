import { Loader2 } from "lucide-react";

const SystemLoading = ({ message }: { message?: string }) => {
  return (
    <div className='flex flex-col items-center justify-center py-20 gap-3'>
      <Loader2 className='animate-spin text-secondary' size={32} />
      <p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
        {message}
      </p>
    </div>
  );
};

export default SystemLoading;
