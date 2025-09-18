"use client";

import { useEffect, useRef } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { VideoPlayerProps } from "@/types/video";

const VideoPlayer = (video: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const setCurrentTime = useAnnotationStore((s) => s.setCurrentTime);
  const setPlaying = useAnnotationStore((s) => s.setPlaying);
  const setDuration = useAnnotationStore((s) => s.setDuration);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMetadataLoad = () => {
      setDuration(video.duration);
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onMetadataLoad);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onMetadataLoad);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [setCurrentTime, setDuration, setPlaying]);

  return (
    <video
      ref={videoRef}
      src={video.src}
      className='w-full h-full object-fill rounded-xl'
      controls
      controlsList='nodownload nofullscreen noremoteplayback'
      muted
      disablePictureInPicture
    />
  );
};

export default VideoPlayer;
