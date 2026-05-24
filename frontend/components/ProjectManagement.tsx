"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Behavior } from "@/types/behavior";
import { useProjectStore } from "@/store/useProjectStore";
import Link from "next/link";
import BehaviorCreator from "@/components/BehaviorManager";
import MemberLinker from "@/components/MemberLinker";
import ProjectDetails from "@/components/ProjectDetails";
import SystemError from "@/components/SystemError";
import VideoLinker from "@/components/VideoLinker";

const ProjectManagement = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [annotatorsPerVideo, setAnnotatorsPerVideo] = useState(1);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);

  useEffect(() => {
    setName(currentProject?.name ?? "");
    setDescription(currentProject?.description ?? "");
    setAnnotatorsPerVideo(currentProject?.annotatorsPerVideo ?? 1);
    setBehaviors(currentProject?.behaviors ?? []);
  }, [currentProject]);

  useEffect(() => {
    if (currentProject?.id) {
      fetchProject().catch(() => {});
    }
  }, [currentProject?.id, fetchProject]);

  const canSave = useMemo(() => {
    if (!currentProject) return false;
    const trimmedName = name.trim();
    return trimmedName.length > 0 && annotatorsPerVideo >= 1 && !loading;
  }, [annotatorsPerVideo, currentProject, loading, name]);

  const handleSave = async () => {
    if (!currentProject || !canSave) return;

    await updateProject({
      name: name.trim(),
      description: description.trim(),
      annotatorsPerVideo,
      behaviors,
    });
  };

  return (
    <div className='container mx-auto p-4 md:p-6'>
      <div className='mb-6'>
        <nav className='flex items-center text-sm text-muted-foreground'>
          <Link href='/dashboard' className='hover:text-primary'>
            Projects
          </Link>
          <ChevronRight size={18} />
          <span className='font-semibold text-secondary'>
            {currentProject?.name ?? "Loading..."}
          </span>
        </nav>
        <h1 className='text-2xl font-bold mt-2'>Project Management</h1>
      </div>

      <div className='mb-8 rounded-lg border bg-card p-6'>
        <div className='flex items-center justify-between gap-4 mb-6'>
          <div>
            <h2 className='text-xl font-semibold'>Project Details</h2>
            <p className='text-sm text-muted-foreground'>
              Update the project metadata and behavior set for this project.
            </p>
          </div>
          <button
            type='button'
            onClick={handleSave}
            disabled={!canSave}
            className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-main transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'>
            <Save size={14} />
            Save Changes
          </button>
        </div>

        <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
          <div>
            <ProjectDetails
              name={name}
              description={description}
              annotatorsPerVideo={annotatorsPerVideo}
              setName={setName}
              setDescription={setDescription}
              setAnnotatorsPerVideo={setAnnotatorsPerVideo}
            />
          </div>

          <div>
            <BehaviorCreator
              behaviors={behaviors}
              setBehaviors={setBehaviors}
            />
          </div>
        </div>

        {error && (
          <div className='mt-4'>
            <SystemError message={error} />
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='border rounded-xl bg-background shadow-main overflow-hidden'>
          <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
            <span className='font-bold uppercase tracking-wider'>
              Member Linker
            </span>
          </div>
          <div className='p-4'>
            <MemberLinker />
          </div>
        </div>
        <div className='border rounded-xl bg-background shadow-main overflow-hidden'>
          <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
            <span className='font-bold uppercase tracking-wider'>
              Video Linker
            </span>
          </div>
          <div className='p-4'>
            <VideoLinker />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagement;
