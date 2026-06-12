"use client";

import { useEffect, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { Annotation, Segment } from "@/types/annotation";
import { Assignment } from "@/types/assignment";
import { VideoStatus } from "@/types/video";
import ResetModal from "@/components/ResetModal";
import Modal from "@/components/Modal";
import api, { ApiError } from "@/lib/api";

const ControlPanel = () => {
  const currentAssignmentId = useAssignmentStore((s) => s.currentAssignmentId);

  const segments = useAnnotationStore((s) => s.segments);
  const submitted = useAnnotationStore((s) => s.submitted);
  const setSegments = useAnnotationStore((s) => s.setSegments);
  const setSubmitted = useAnnotationStore((s) => s.setSubmitted);
  const clearInProgress = useAnnotationStore((s) => s.clearInProgress);

  const [projectVideoId, setProjectVideoId] = useState<string>("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentAssignmentId) return;
    const fetchAssignment = async () => {
      try {
        const data = await api.get<Assignment>(
          `/api/v1/assignments/${currentAssignmentId}`,
        );
        return data;
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAnnotationInfo = async () => {
      try {
        const data = await api.get<Annotation>(
          `/api/v1/annotations/${currentAssignmentId}`,
        );
        if (data) {
          setSegments(data.segments);
          setSubmitted(data.submitted, data.submitted_at);
        }
      } catch (err) {
        console.error("Failed to fetch annotation", err);
      }
    };

    fetchAssignment().then((assignment) => {
      setProjectVideoId(assignment?.projectVideoId || "");
      fetchAnnotationInfo();
    });
  }, [currentAssignmentId, projectVideoId, setSegments, setSubmitted]);

  const handleReset = () => {
    clearInProgress();
    setIsResetModalOpen(false);
  };

  const handleExport = async () => {
    if (!currentAssignmentId) return;

    try {
      const res = await api.get<Response>(
        `/api/v1/assignments/${currentAssignmentId}/export`,
        { responseType: "raw" },
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("Content-Disposition");
      const filename =
        contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] ??
        `${currentAssignmentId}.csv`;

      a.download = filename;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export assignment", err);
      alert(
        err instanceof ApiError
          ? `Failed to export assignment: ${err.message}`
          : "Failed to export assignment",
      );
    }
  };

  const handleSave = async () => {
    if (submitted) return;

    const checkAnnotation = async () => {
      try {
        return await api.get(`/api/v1/annotations/${currentAssignmentId}`);
      } catch (err) {
        // If it's a 404, the annotation doesn't exist yet, which is expected behavior
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        console.error("Error checking annotation existence", err);
        throw err;
      }
    };

    const createAnnotation = async () => {
      try {
        const data = await api.post<{ segments: Segment[] }>(
          `/api/v1/annotations/${currentAssignmentId}`,
          { segments },
        );
        setSegments(data.segments);
      } catch (err) {
        console.error("Error creating annotation", err);
        throw err;
      }
    };

    const updateAnnotation = async () => {
      try {
        const data = await api.put<{ segments: Segment[] }>(
          `/api/v1/annotations/${currentAssignmentId}`,
          { segments },
        );
        setSegments(data.segments);
      } catch (err) {
        console.error("Error updating annotation", err);
        throw err;
      }
    };

    const updateAssignmentStatus = async () => {
      if (!currentAssignmentId) return;

      try {
        const status: VideoStatus =
          !segments || segments.length === 0
            ? VideoStatus.NOT_STARTED
            : VideoStatus.IN_PROGRESS;

        const data = await api.put(
          `/api/v1/assignments/${currentAssignmentId}`,
          {
            status,
          },
        );
        console.log(data);
      } catch (err) {
        console.error("Error updating assignment status", err);
        throw err;
      }
    };

    try {
      const existingAnnotation = await checkAnnotation();
      if (existingAnnotation) {
        await updateAnnotation();
      } else {
        await createAnnotation();
      }
      await updateAssignmentStatus();
    } catch (err) {
      console.error("Failed to save annotation", err);
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;

    const submitAnnotation = async () => {
      try {
        const data = await api.post<Annotation>(
          `/api/v1/annotations/${currentAssignmentId}/submit`,
        );

        setSubmitted(true, data.submitted_at);
      } catch (err) {
        console.error("Error submitting annotation", err);
        throw err;
      }
    };

    const updateAssignmentStatus = async () => {
      if (!currentAssignmentId) return;

      try {
        await api.put(`/api/v1/assignments/${currentAssignmentId}`, {
          status: VideoStatus.COMPLETED,
        });
      } catch (err) {
        console.error("Error updating assignment status", err);
        throw err;
      }
    };

    setIsSubmitting(true);
    try {
      await handleSave();
      await submitAnnotation();
      await updateAssignmentStatus();
      setIsSubmitModalOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";

      alert(`Failed to submit annotation: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='grid grid-cols-2 gap-2'>
      <button
        className={`px-5 py-2 border-2 border-border bg-transparent text-foreground text-xs font-bold uppercase tracking-widest rounded hover:bg-muted transition-all disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed`}
        aria-label='Reset'
        type='button'
        disabled={submitted}
        onClick={() => !submitted && setIsResetModalOpen(true)}>
        Reset
      </button>
      <button
        className='px-5 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-sm hover:opacity-90 transition-all'
        aria-label='Export'
        type='button'
        onClick={() => handleExport()}>
        Export
      </button>
      <button
        className={`px-5 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-sm hover:opacity-90 transition-all disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed`}
        aria-label='Save'
        type='button'
        disabled={submitted}
        onClick={() => !submitted && handleSave()}>
        Save
      </button>
      <button
        className={`px-5 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-main hover:brightness-110 active:scale-95 transition-all disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed`}
        aria-label='Submit'
        type='button'
        disabled={submitted}
        onClick={() => !submitted && setIsSubmitModalOpen(true)}>
        {submitted ? "Submitted" : "Submit"}
      </button>

      {isResetModalOpen && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setIsResetModalOpen(false)}
        />
      )}

      {isSubmitModalOpen && (
        <Modal
          title='Submit Annotation'
          onClose={() => setIsSubmitModalOpen(false)}>
          <div className='space-y-4'>
            <p className='text-neutral-600'>
              Are you sure you want to submit this annotation?
              <strong className='text-red-600'>
                {" "}
                This action cannot be undone.
              </strong>
            </p>
            <p className='text-sm text-neutral-500'>
              Once submitted, you will not be able to edit this annotation.
            </p>
            <div className='flex justify-end gap-3 pt-4'>
              <button
                className='px-4 py-2 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold'
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}>
                Cancel
              </button>
              <button
                className='px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:bg-blue-300'
                onClick={handleSubmit}
                disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ControlPanel;
