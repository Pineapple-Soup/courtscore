import BehaviorToggles from "@/components/BehaviorToggles";
import ControlPanel from "@/components/ControlPanel";
import Timeline from "@/components/Timeline";
import VideoHandler from "@/components/VideoHandler";

const AnnotationWorkspace = () => {
  return (
    <div className='p-4 md:p-8 space-y-8'>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        <div className='lg:col-span-9'>
          <VideoHandler />
        </div>
        <div className='lg:col-span-3 flex flex-col gap-8'>
          <BehaviorToggles />
          <ControlPanel />
        </div>
      </div>
      <div className='col-start-1 col-span-full'>
        <Timeline />
      </div>
    </div>
  );
};

export default AnnotationWorkspace;
