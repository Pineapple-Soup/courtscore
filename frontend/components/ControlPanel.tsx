"use client";

import { useEffect, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Behavior } from "@/types/behavior";
import { Video } from "@/types/video";
import ResetModal from "@/components/ResetModal";

const ControlPanel = () => {
  const videoId = useAnnotationStore((s) => s.videoId);
  const getActiveBehaviors = useAnnotationStore((s) => s.getActiveBehaviors);
  const clearInProgress = useAnnotationStore((s) => s.clearInProgress);
  const [videoInfo, setVideoInfo] = useState<Video | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/video/${videoId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data) {
          setVideoInfo(data);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch video ", err);
      }
      setVideoInfo(null);
    };

    if (videoId) {
      fetchVideoInfo();
    } else {
      setVideoInfo(null);
    }
  }, [videoId]);

  const handleReset = () => {
    clearInProgress();
    setIsResetModalOpen(false);
  };

  const handleExport = async () => {
    const behaviorIds = Object.values(Behavior).filter(
      (value) => typeof value === "number"
    );
    const behaviorLabels = behaviorIds.map((id) => Behavior[id]);

    const minTime = 0;
    const maxTime = 600;

    const timePoints = [];
    for (let t = minTime; t <= maxTime; t++) {
      timePoints.push(t);
    }

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const csvRows = [
      ["time", ...behaviorLabels],
      ...timePoints.map((time) => {
        const activeBehaviors = getActiveBehaviors(time);
        return [
          formatTime(time),
          ...behaviorIds.map((id) => {
            return activeBehaviors.includes(id) ? id : "";
          }),
        ];
      }),
    ];

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = videoInfo ? `${videoInfo.label}.csv` : `${videoId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='grid grid-rows-2 grid-cols-2 gap-4'>
      <button
        className='rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold cursor-pointer'
        aria-label='Reset'
        type='button'
        onClick={() => setIsResetModalOpen(true)}>
        Reset
      </button>
      <button
        className='rounded-lg bg-neutral-500 hover:bg-neutral-600 text-white font-semibold cursor-pointer'
        aria-label='Export'
        type='button'
        onClick={() => handleExport()}>
        Export
      </button>
      <button
        className='rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold cursor-pointer'
        aria-label='Save'
        type='button'>
        Save
      </button>
      <button
        className='rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold cursor-pointer'
        aria-label='Submit'
        type='button'>
        Submit
      </button>

      {isResetModalOpen && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setIsResetModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ControlPanel;
