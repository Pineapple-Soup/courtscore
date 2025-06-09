"use client";

import { useRef, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";

const VideoHandler = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  return (
    <div className='flex items-center justify-center aspect-video border-4 border-neutral-400 rounded-2xl'>
      {videoSrc != null ? (
        <VideoPlayer src={videoSrc} />
      ) : (
        <div className='flex flex-col items-center'>
          <input
            type='file'
            accept='video/*'
            ref={fileInputRef}
            onChange={handleFileUpload}
            className='hidden'
          />
          <p>No Video</p>
          <button
            onClick={handleUploadClick}
            className='px-4 py-2 bg-neutral-300 border-2 border-neutral-50 rounded-lg hover:bg-neutral-400 transition'>
            Upload Video
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoHandler;
