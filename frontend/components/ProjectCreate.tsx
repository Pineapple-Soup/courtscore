"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Behavior } from "@/types/behavior";
import { useProjectStore } from "@/store/useProjectStore";
import BehaviorManager from "@/components/BehaviorManager";
import Modal from "@/components/Modal";
import ProjectDetails from "@/components/ProjectDetails";
import SystemError from "@/components/SystemError";

const ProjectCreate = () => {
  const [useModal, setUseModal] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [annotators, setAnnotators] = useState<number>(2);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);

  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const createProject = useProjectStore((s) => s.createProject);

  const resetForm = () => {
    setName("");
    setDescription("");
    setBehaviors([]);
    setAnnotators(2);
  };

  const onCreate = async () => {
    if (!name.trim() || annotators < 1 || loading) {
      return;
    }

    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        annotatorsPerVideo: annotators,
        behaviors: behaviors,
      });
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setUseModal(false);
    }
  };

  return (
    <>
      <div>
        <button
          type='button'
          onClick={() => setUseModal(true)}
          className='flex gap-2 items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-main cursor-pointer hover:brightness-110 transition-all disabled:opacity-50'>
          <Plus size={14} />
          Create Project
        </button>
      </div>

      {useModal && (
        <Modal title='Create New Project' onClose={() => setUseModal(false)}>
          <div className='flex flex-col items-center justify-center text-center space-y-4'>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate();
              }}
              className='w-full max-w-md mx-auto space-y-4 text-left'>
              <ProjectDetails
                name={name}
                description={description}
                annotatorsPerVideo={annotators}
                setName={setName}
                setDescription={setDescription}
                setAnnotatorsPerVideo={setAnnotators}
              />

              <BehaviorManager
                behaviors={behaviors}
                setBehaviors={setBehaviors}
              />

              {error && <SystemError message={error} />}

              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setUseModal(false)}
                  className='px-4 py-2 rounded-lg bg-muted text-sm'
                  disabled={loading}>
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 rounded-lg bg-primary text-sm text-primary-foreground font-bold'
                  disabled={loading}>
                  {loading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
            <p></p>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ProjectCreate;
