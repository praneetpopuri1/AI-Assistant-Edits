import type { CalculateMetadataFunction } from "remotion";
import type { EditPlanRendererProps } from "../types/editPlan";
import { getOutputDimensions } from "./dimensions";
import { buildOutputTimeline } from "./timeMap";

export const calculateEditPlanMetadata: CalculateMetadataFunction<
  EditPlanRendererProps
> = async ({ props }) => {
  const fps = props.editPlan.source_video.fps;
  const timeline = buildOutputTimeline(props.editPlan);
  const durationInFrames = Math.max(
    1,
    Math.ceil(timeline.totalDurationSeconds * fps),
  );
  const { width, height } = getOutputDimensions(props.editPlan);
  return { durationInFrames, fps, width, height };
};
