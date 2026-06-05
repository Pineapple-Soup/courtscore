"use client";

import { useEffect } from "react";
import { ExternalLink, Folder, Inbox, Trash } from "lucide-react";
import { useVideoStore } from "@/store/useVideoStore";
import SystemLoading from "@/components/SystemLoading";
import SystemError from "@/components/SystemError";
import { Video } from "@/types/video";

const VideoList = () => {
  const { fetchVideos, deleteVideo, videos, loading, error } = useVideoStore();

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const onDelete = async (video: Video) => {
    if (video.linkCount > 0) {
      alert("Cannot delete video that is linked to a project.");
      return;
    }
    if (loading) return;
    if (!confirm("Are you sure you want to delete this video?")) return;
    await deleteVideo(video.id);
  };

  // Loading State
  if (loading) {
    return SystemLoading({ message: "Syncing videos..." });
  }

  // Error State
  if (error) {
    return SystemError({ message: error });
  }

  // Empty State
  if (!videos || videos.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-muted/10 text-muted-foreground'>
        <Inbox size={40} strokeWidth={1} />
        <p className='mt-4 text-xs font-bold uppercase tracking-widest'>
          No Videos Found
        </p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6'>
      {videos.map((v) => (
        <div
          key={v.id}
          className='group flex flex-col bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-main hover:bg-secondary/5 hover:border-secondary/50 transition-all duration-300'>
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              {/* Video Label */}
              <h4 className='text-sm font-bold truncate tracking-tight text-foreground uppercase group-hover:text-secondary transition-colors'>
                {v.label || "Untitled Resource"}
              </h4>
              <ExternalLink
                size={20}
                className='text-muted-foreground group-hover:text-secondary transition-colors'
              />
            </div>

            {/* Video Description */}
            <p className='flex-1 text-sm text-muted-foreground mt-2 leading-relaxed'>
              {v.description || "No description provided."}
              <span className='block mt-1 text-xxs text-muted-foreground/80'>
                Created on: {new Date(v.createdAt).toLocaleDateString()}
              </span>
            </p>

            <div className='flex items-center justify-between pt-2 border-t border-border/50'>
              {/* Delete Button */}
              <button
                onClick={() => onDelete(v)}
                className='inline-flex items-center justify-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-2 text-xxs font-bold uppercase tracking-widest text-destructive shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground active:translate-y-0 active:scale-95'>
                <Trash size={14} />
                <span>Delete</span>
              </button>

              {/* Linked Status Badge */}
              <div
                className={`inline-flex min-w-12 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ring-1 ring-inset transition-colors ${v.linkCount > 0 ? "bg-secondary/15 text-secondary ring-secondary/20" : "bg-primary/15 text-primary ring-primary/20"}`}>
                <p className='leading-none'>{v.linkCount}</p>
                <Folder size={14} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoList;
