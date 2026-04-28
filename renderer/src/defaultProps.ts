import type { EditPlanRendererProps } from "./types/editPlan";

/** Minimal valid plan for Remotion Studio when `public/source.mp4` exists. */
export const defaultEditPlanProps: EditPlanRendererProps = {
  sourceVideoSrc: "source.mp4",
  editPlan: {
    source_video: {
      duration_s: 10,
      width: 1920,
      height: 1080,
      fps: 30,
    },
    segments: [{ start_s: 0, end_s: 10, action: "keep", speed: 1 }],
    captions: {
      enabled: false,
      words: [],
    },
  },
};
