"use client";

import { useEffect, useState } from "react";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import VideoPlayer from "@/components/VideoPlayer";

const VideoHandler = () => {
  const currentAssignmentId = useAssignmentStore((s) => s.currentAssignmentId);
  const [videoSrc, setVideoSrc] = useState<string>("");

  useEffect(() => {
    if (!currentAssignmentId) return;
    const fetchAssignmentContext = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/assignments/${currentAssignmentId}/context`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch assignment context");
        }
        const data = await res.json();
        return data;
      } catch (err) {
        console.error(err);
        // Handle error (e.g. show notification)
      }
    };

    const getSignedURL = async (id: string) => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/videos/${id}/url`,
          {
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.signedUrl) {
          return data.signedUrl;
        } else {
          throw new Error("No signed URL returned");
        }
      } catch (err) {
        console.error("Error fetching signed URL:", err);
        // Handle error (e.g. show notification)
      }
    };

    fetchAssignmentContext().then((context) => {
      if (context?.video_id) {
        getSignedURL(context.video_id).then((url) => {
          if (url) {
            setVideoSrc(url);
          } else {
            console.error("Failed to get signed URL for video");
          }
        });
      } else {
        console.error("No video ID found in assignment context");
      }
    });
  }, [currentAssignmentId]);

  return (
    <div className='flex items-center justify-center aspect-video border rounded-lg bg-background shadow-main overflow-hidden'>
      {videoSrc ? <VideoPlayer src={videoSrc} /> : <div>Loading Video...</div>}
    </div>
  );
};

export default VideoHandler;
