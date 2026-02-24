import type { ReactNode } from "react";

type PanelProps = {
  icon?: ReactNode;
  title?: string;
  button?: ReactNode;
  children?: ReactNode;
};

const Panel = ({ icon, title, button, children }: PanelProps) => {
  return (
    <div className='flex flex-col h-full'>
      <div className='p-6 border-b border-border bg-muted/20 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-secondary text-secondary-foreground rounded-lg shadow-main'>
            {icon}
          </div>
          <div>
            <h2 className='text-md font-bold uppercase tracking-widest'>
              {title}
            </h2>
          </div>
        </div>
        {button}
      </div>

      <div className='p-4 flex-1'>{children}</div>
    </div>
  );
};

export default Panel;
