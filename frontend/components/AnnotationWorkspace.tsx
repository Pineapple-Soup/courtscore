import BehaviorToggles from "@/components/BehaviorToggles";
import ControlPanel from "@/components/ControlPanel";
import Timeline from "@/components/Timeline";
import VideoHandler from "@/components/VideoHandler";

const AnnotationWorkspace = () => {
  return (
    <div className='grid grid-cols-4 gap-2 p-4'>
      <div className='col-start-1 col-span-3'>
        <VideoHandler />
      </div>
      <div className='col-start-4 flex flex-col justify-between'>
        <BehaviorToggles />
        <ControlPanel />
      </div>
      <div className='col-start-1 col-span-full'>
        <Timeline />
      </div>
    </div>
  );
};

export default AnnotationWorkspace;
