"use client";

import { useEffect, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { Assignment } from "@/types/assignment";
import { VideoStatus } from "@/types/video";
import ResetModal from "@/components/ResetModal";
import Modal from "@/components/Modal";

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
        const res = await fetch(
          `http://localhost:8000/api/v1/assignments/${currentAssignmentId}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch assignment context");
        }
        const data: Assignment = await res.json();
        return data;
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAnnotationInfo = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/annotations/${currentAssignmentId}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSegments(data.segments);
            setSubmitted(data.submitted, data.submitted_at);
          }
        }
      } catch (err) {
        console.log("Failed to fetch annotation", err);
      }
    };

    fetchAssignment().then((assignment) => {
      setProjectVideoId(assignment?.projectVideoId || "");
      console.log("Fetched assignment:", assignment);
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
      const res = await fetch(
        `http://localhost:8000/api/v1/assignments/${currentAssignmentId}/export`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) {
        alert(`Failed to export assignment ${currentAssignmentId}`);
        return;
      }
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
        err instanceof Error
          ? `Failed to export assignment: ${err.message}`
          : "Failed to export assignment",
      );
    }
  };

  const handleSave = async () => {
    if (submitted) return;

    const checkAnnotation = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/annotations/${currentAssignmentId}`,
          { credentials: "include" },
        );
        if (res.ok) {
          return await res.json();
        } else if (res.status === 404) {
          return null;
        } else {
          throw new Error("Failed to check annotation existence");
        }
      } catch (err) {
        console.error("Error checking annotation existence", err);
        throw err;
      }
    };

    const createAnnotation = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/annotations/${currentAssignmentId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ segments: segments }),
            credentials: "include",
          },
        );
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments);
        } else {
          throw new Error("Failed to create annotation");
        }
      } catch (err) {
        console.error("Error creating annotation", err);
        throw err;
      }
    };

    const updateAnnotation = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/annotations/${currentAssignmentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ segments: segments }),
            credentials: "include",
          },
        );
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments);
        } else {
          throw new Error("Failed to update annotation");
        }
      } catch (err) {
        console.error("Error updating annotation", err);
        throw err;
      }
    };

    const updateAssignmentStatus = async () => {
      try {
        if (!currentAssignmentId) return;
        const status: VideoStatus =
          !segments || segments.length === 0
            ? VideoStatus.NOT_STARTED
            : VideoStatus.IN_PROGRESS;

        const res = await fetch(
          `http://localhost:8000/api/v1/assignments/${currentAssignmentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status }),
            credentials: "include",
          },
        );

        if (res.ok) {
          const data = await res.json();
          console.log(data);
        } else {
          throw new Error("Failed to update assignment status");
        }
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

    const sumbitAnnotation = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/v1/annotations/${currentAssignmentId}/submit`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (res.ok) {
          const data = await res.json();
          setSubmitted(true, data.submitted_at);
        } else {
          const error = await res.json();
          throw new Error(error.detail || "Failed to submit annotation");
        }
      } catch (err) {
        console.error("Error submitting annotation", err);
        throw err;
      }
    };

    const updateAssignmentStatus = async () => {
      try {
        if (!currentAssignmentId) return;
        const res = await fetch(
          `http://localhost:8000/api/v1/assignments/${currentAssignmentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: VideoStatus.COMPLETED }),
            credentials: "include",
          },
        );

        if (res.ok) {
          const data = await res.json();
          console.log(data);
        } else {
          throw new Error("Failed to update assignment status");
        }
      } catch (err) {
        console.error("Error updating assignment status", err);
        throw err;
      }
    };

    setIsSubmitting(true);
    try {
      await handleSave();
      await sumbitAnnotation();
      await updateAssignmentStatus();
      setIsSubmitModalOpen(false);
    } catch (err) {
      alert(
        err instanceof Error
          ? `Failed to submit annotation: ${err.message}`
          : "Failed to submit annotation",
      );
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
