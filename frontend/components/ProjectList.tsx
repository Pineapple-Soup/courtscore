"use client";

import { useEffect } from "react";
import { ExternalLink, Inbox, Trash, Users, Videotape } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import SystemError from "@/components/SystemError";
import SystemLoading from "@/components/SystemLoading";

const ProjectList = () => {
  const router = useRouter();

  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const ids = useProjectStore((s) => s.ids);
  const byId = useProjectStore((s) => s.byId);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onClick = (id: string) => {
    setCurrentProject(id);
    router.push(`/projects/${id}`);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    await deleteProject(id);
  };

  if (loading) {
    return SystemLoading({ message: "Loading projects..." });
  }

  if (error) {
    return SystemError({ message: error });
  }

  if (!ids || ids.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-muted/10 text-muted-foreground'>
        <Inbox size={40} strokeWidth={1} />
        <p className='mt-4 text-xs font-bold uppercase tracking-widest'>
          No Projects Found
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {ids.map((id) => (
        <div
          key={id}
          onClick={() => onClick(id)}
          className='group flex flex-col bg-background border border-border rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-main hover:bg-secondary/5 hover:border-secondary/50 transition-all duration-300'>
          <div className='flex-1 flex flex-col justify-between p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              {/* Project Label */}
              <h4 className='text-sm font-bold truncate tracking-tight text-foreground uppercase group-hover:text-secondary transition-colors'>
                {byId[id].name || "Untitled Resource"}
              </h4>
              <ExternalLink
                size={20}
                className='text-muted-foreground group-hover:text-secondary transition-colors'
              />
            </div>

            {/* Project Description */}
            <p className='flex-1 text-sm text-muted-foreground mt-2 leading-relaxed'>
              {byId[id].description || "No description provided."}
              {byId[id].createdAt && (
                <span className='block mt-1 text-xxs text-muted-foreground/80'>
                  Created on {new Date(byId[id].createdAt).toLocaleDateString()}
                </span>
              )}
            </p>

            <div className='flex items-center justify-between pt-2 border-t border-border/50'>
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(byId[id].id);
                }}
                aria-label='Delete project'
                className='inline-flex items-center justify-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-2 text-xxs font-bold uppercase tracking-widest text-destructive shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground active:translate-y-0 active:scale-95'>
                <Trash size={14} strokeWidth={2.25} />
                <span>Delete</span>
              </button>

              {/* Badges */}
              <div className='flex items-center gap-2'>
                {/* Member Count Badge */}
                <div
                  className={`inline-flex min-w-12 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ring-1 ring-inset transition-colors ${byId[id].projectMembers && byId[id].projectMembers.length > 0 ? "bg-secondary/15 text-secondary ring-secondary/20" : "bg-primary/15 text-primary ring-primary/20"}`}>
                  <p className='leading-none'>
                    {byId[id].projectMembers
                      ? byId[id].projectMembers.length
                      : 0}
                  </p>
                  <Users size={14} />
                </div>
                {/* Video Count Badge */}
                <div
                  className={`inline-flex min-w-12 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ring-1 ring-inset transition-colors ${byId[id].projectVideos && byId[id].projectVideos.length > 0 ? "bg-secondary/15 text-secondary ring-secondary/20" : "bg-primary/15 text-primary ring-primary/20"}`}>
                  <p className='leading-none'>
                    {byId[id].projectVideos ? byId[id].projectVideos.length : 0}
                  </p>
                  <Videotape size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;
