"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useVideoStore } from "@/store/useVideoStore";
import { Video } from "@/types/video";
import SystemError from "@/components/SystemError";

export default function VideoLinker({ locked }: { locked: boolean }) {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchVideos = useVideoStore((s) => s.searchVideos);

  const currentProject = useProjectStore((s) => s.currentProject);
  const linkProjectVideo = useProjectStore((s) => s.linkProjectVideo);
  const unlinkProjectVideo = useProjectStore((s) => s.unlinkProjectVideo);
  const fetchProject = useProjectStore((s) => s.fetchProject);

  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchVideos(query, {
          limit: 10,
          unlinkedOnly: true,
          projectId: currentProject?.id,
          signal: controller.signal,
        });
        if (cancelled) return;
        setVideos(res.items);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        console.error(err);
        setError("Failed to search videos");
        setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, searchVideos, currentProject]);

  const handleLink = async (video: Video) => {
    if (locked) {
      alert("Project is locked. Cannot link videos.");
      return;
    }
    try {
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      await linkProjectVideo(video.id);
      await fetchProject();
      setQuery("");
      setVideos([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to link video");
    }
  };

  const handleUnlink = async (video: Video) => {
    if (locked) {
      alert("Project is locked. Cannot unlink videos.");
      return;
    }
    try {
      setVideos((prev) => [...prev, video]);
      await unlinkProjectVideo(video.id);
      await fetchProject();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to unlink video");
    }
  };

  return (
    <div className='space-y-4'>
      <div className='relative'>
        <input
          placeholder='Search videos by label'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='w-full px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring'
        />
        {loading && (
          <Loader2 className='animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
        )}
      </div>

      {error && <SystemError message={error} />}

      {videos.length > 0 && (
        <div className='border rounded-md max-h-64 overflow-y-auto'>
          {videos.map((video) => (
            <div
              key={video.id}
              className='flex items-center justify-between p-3 border-b last:border-b-0'>
              <div>
                <p className='font-semibold'>{video.label}</p>
                <p className='text-sm text-muted-foreground'>{video.src}</p>
              </div>
              <button
                onClick={() => handleLink(video)}
                className='p-1.5 rounded-full bg-primary text-primary-foreground hover:brightness-110 transition-all'>
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='space-y-2'>
        <h3 className='text-lg font-medium'>Linked Videos</h3>
        {currentProject?.projectVideos?.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No videos linked yet.</p>
        ) : (
          <div className='border rounded-md'>
            {currentProject?.projectVideos?.map((projectVideo) => (
              <div
                key={projectVideo.id}
                className='flex items-center justify-between p-3 border-b last:border-b-0'>
                <div>
                  <p className='font-semibold'>
                    {projectVideo.video?.label ?? "(unlabeled video)"}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {projectVideo.video?.description ??
                      "No description provided."}
                  </p>
                  <p className='text-sm text-muted-foreground mt-1 font-mono'>
                    {projectVideo.video?.src}
                  </p>
                </div>
                <button
                  onClick={() => handleUnlink(projectVideo.video)}
                  className='p-1.5 rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-all disabled:opacity-50'>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
