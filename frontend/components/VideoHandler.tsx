"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import VideoPlayer from "@/components/VideoPlayer";

const VideoHandler = () => {
  const pathname = usePathname();
  const videoId = useAnnotationStore((state) => state.videoId);
  const setVideoId = useAnnotationStore((state) => state.setVideoId);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname?.match(/\/annotate\/([a-f0-9\-]{36})/);
    if (match && match[1]) {
      setVideoId(match[1]);
    }
  }, [pathname, setVideoId]);

  const getSignedURL = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/videos/${id}/url`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data) {
        setVideoSrc(data["signed_url"]);
      }
    } catch {
      console.log("error");
    }
  };

  useEffect(() => {
    if (videoId) {
      getSignedURL(videoId);
    }
  }, [videoId]);

  return (
    <div className='flex items-center justify-center aspect-video border-4 border-neutral-400 rounded-2xl'>
      {videoSrc ? <VideoPlayer src={videoSrc} /> : <div>Loading Video...</div>}
    </div>
  );
};

export default VideoHandler;
