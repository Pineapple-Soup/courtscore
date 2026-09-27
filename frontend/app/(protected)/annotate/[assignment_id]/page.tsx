"use client";

import { useEffect } from "react";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import * as React from "react";
import AnnotationWorkspace from "@/components/AnnotationWorkspace";

export default function AnnotationPage({
  params,
}: {
  params: Promise<{ assignment_id: string }>;
}) {
  const { assignment_id } = React.use(params);
  const setCurrent = useAssignmentStore((s) => s.actions.setCurrent);

  useEffect(() => {
    setCurrent(assignment_id);
  }, [assignment_id, setCurrent]);

  return (
    <div className='flex flex-col'>
      <AnnotationWorkspace />
    </div>
  );
}
