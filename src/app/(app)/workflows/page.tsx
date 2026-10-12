import { Suspense } from "react";
import { StarterGalleryView } from "@/components/dashboard/starter-gallery-view";

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-ink-faint">Loading Neuraloop Dashboard...</div>}>
      <StarterGalleryView />
    </Suspense>
  );
}