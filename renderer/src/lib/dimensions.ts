import type { EditPlan } from "../types/editPlan";

/** Output composition size after optional reframe. */
export function getOutputDimensions(plan: EditPlan): { width: number; height: number } {
  const w = plan.source_video.width;
  const h = plan.source_video.height;
  const reframe = plan.reframe;
  if (!reframe?.enabled || !reframe.target_aspect_ratio) {
    return { width: w, height: h };
  }

  const ratioStr = reframe.target_aspect_ratio;
  const targetWOverH =
    ratioStr === "16:9"
      ? 16 / 9
      : ratioStr === "9:16"
        ? 9 / 16
        : ratioStr === "1:1"
          ? 1
          : 4 / 5;

  const sourceWOverH = w / h;
  if (Math.abs(sourceWOverH - targetWOverH) < 0.001) {
    return { width: w, height: h };
  }

  // Fit source inside target aspect using cover semantics (center crop).
  if (sourceWOverH > targetWOverH) {
    const height = h;
    const width = Math.round(height * targetWOverH);
    return { width, height };
  }
  const width = w;
  const height = Math.round(width / targetWOverH);
  return { width, height };
}
