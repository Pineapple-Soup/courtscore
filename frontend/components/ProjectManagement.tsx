"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { AssignmentSummary } from "@/types/assignment";
import { Behavior } from "@/types/behavior";
import { useProjectStore } from "@/store/useProjectStore";
import BehaviorCreator from "@/components/BehaviorManager";
import MemberLinker from "@/components/MemberLinker";
import ProjectDetails from "@/components/ProjectDetails";
import SystemError from "@/components/SystemError";
import VideoLinker from "@/components/VideoLinker";
import api from "@/lib/api";

const ProjectManagement = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);

  const [name, setName] = useState(currentProject?.name ?? "");
  const [description, setDescription] = useState(
    currentProject?.description ?? "",
  );
  const [annotatorsPerVideo, setAnnotatorsPerVideo] = useState(
    currentProject?.annotatorsPerVideo ?? 1,
  );
  const [behaviors, setBehaviors] = useState<Behavior[]>(
    currentProject?.behaviors ?? [],
  );
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);

  useEffect(() => {
    if (currentProject?.id) {
      fetchProject().catch(() => {});
      const loadAssignments = async () => {
        try {
          const data = await api.get<AssignmentSummary[]>(
            `/api/v1/projects/${currentProject.id}/assignments`,
          );
          setAssignments(data);
        } catch (err) {
          console.error("Failed to load assignments:", err);
        }
      };
      loadAssignments();
    }
  }, [currentProject?.id, fetchProject]);

  const canSave = useMemo(() => {
    if (!currentProject || loading) return false;
    const trimmedName = name.trim();
    const changedName = trimmedName !== currentProject.name;
    const changedDescription =
      description.trim() !== currentProject.description;
    const changedAnnotators =
      annotatorsPerVideo !== currentProject.annotatorsPerVideo;
    const changedBehaviors =
      JSON.stringify(behaviors) !== JSON.stringify(currentProject.behaviors);
    return (
      (changedName ||
        changedDescription ||
        changedAnnotators ||
        changedBehaviors) &&
      trimmedName.length > 0 &&
      annotatorsPerVideo > 0
    );
  }, [
    annotatorsPerVideo,
    behaviors,
    currentProject,
    description,
    loading,
    name,
  ]);

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
      <div className='mb-8 rounded-lg border'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex w-full px-4 py-2 border-b bg-muted/30 justify-between items-center'>
            <div>
              <h2 className='font-bold uppercase tracking-wider'>Settings</h2>
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
        </div>

        <div className='grid grid-cols-1 gap-5 lg:grid-cols-2 p-4'>
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
            {assignments.length > 0 ? (
              <span className='h-2 w-2 rounded-full bg-primary' />
            ) : (
              <span className='h-2 w-2 rounded-full bg-secondary' />
            )}
          </div>
          <div className='p-4'>
            <MemberLinker locked={assignments.length > 0} />
          </div>
        </div>
        <div className='border rounded-xl bg-background shadow-main overflow-hidden'>
          <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
            <span className='font-bold uppercase tracking-wider'>
              Video Linker
            </span>
            {assignments.length > 0 ? (
              <span className='h-2 w-2 rounded-full bg-primary' />
            ) : (
              <span className='h-2 w-2 rounded-full bg-secondary' />
            )}
          </div>
          <div className='p-4'>
            <VideoLinker locked={assignments.length > 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagement;
