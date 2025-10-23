"use client";

import { useEffect } from "react";
import { useVideoStore } from "@/store/useVideoStore";
import { ExternalLink } from "lucide-react";

const VideoList = () => {
  const videos = useVideoStore((s) => s.videos);
  const loading = useVideoStore((s) => s.loading);
  const error = useVideoStore((s) => s.error);
  const fetchVideos = useVideoStore((s) => s.fetchVideos);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  if (loading) return <div>Loading videos…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!videos || videos.length === 0) return <div>No videos found.</div>;

  return (
    <div className='grid grid-cols-4 gap-2'>
      {videos.map((v) => (
        <div
          key={v.id}
          className='flex flex-col gap-2 p-2 border border-neutral-300 rounded'>
          <div className='flex items-end justify-between p-2 aspect-video bg-neutral-200 rounded animate-pulse'>
            <div className='text-sm w-fit rounded-full p-1 border'>
              {/* Video Duration Placeholder */}
            </div>
            <div
              className={`text-sm w-fit rounded-full p-1 border ${
                v.status === "Not Started"
                  ? "bg-red-300 border-red-400"
                  : v.status === "In Progress"
                  ? "bg-green-300 border-green-400"
                  : ""
              }`}>
              {v.status}
            </div>
          </div>
          <h4>{v.id || "Untitled"}</h4>
          <div className='flex items-center justify-end'>
            <a
              className='flex gap-2 py-2 px-4 text-white bg-blue-500 hover:bg-blue-600 rounded cursor-pointer'
              href={`/annotate/${v.id}`}
              target='_blank'
              rel='noopener noreferrer'>
              <p>Annotate</p>
              <ExternalLink />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoList;
