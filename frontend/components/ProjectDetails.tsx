interface ProjectDetailProps {
  name: string;
  description: string;
  annotatorsPerVideo: number;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setAnnotatorsPerVideo: (value: number) => void;
}

const ProjectDetails = ({
  name,
  description,
  annotatorsPerVideo,
  setName,
  setDescription,
  setAnnotatorsPerVideo,
}: ProjectDetailProps) => {
  return (
    <div className='space-y-4'>
      <div>
        <label className='mb-2 block text-xs font-bold uppercase tracking-widest'>
          Project Title
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-full rounded-md border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring'
          placeholder='Project title'
        />
      </div>

      <div>
        <label className='mb-2 block text-xs font-bold uppercase tracking-widest'>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='min-h-28 w-full rounded-md border border-border px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring'
          placeholder='Project description'
        />
      </div>

      <div>
        <label className='mb-2 block text-xs font-bold uppercase tracking-widest'>
          Annotators per Video
        </label>
        <input
          type='number'
          min={1}
          value={annotatorsPerVideo}
          onChange={(e) =>
            setAnnotatorsPerVideo(Math.max(1, Number(e.target.value)))
          }
          className='w-28 rounded-md border border-border px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring'
        />
      </div>
    </div>
  );
};

export default ProjectDetails;
