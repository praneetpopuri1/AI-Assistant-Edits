import React from "react";
import { linearTiming } from "@remotion/transitions";
import { TransitionSeries } from "@remotion/transitions";
import type { EditPlan } from "../types/editPlan";
import { presentationForTransitionType } from "../lib/transitionPresentations";
import type { OutputTimeline } from "../lib/timeMap";
import { segmentOutputDurationS } from "../lib/timeMap";
import { SegmentVideoClip } from "./SegmentVideoClip";

type Props = {
  editPlan: EditPlan;
  sourceVideoSrc: string;
  timeline: OutputTimeline;
};

export const VideoSegmentSeries: React.FC<Props> = ({
  editPlan,
  sourceVideoSrc,
  timeline,
}) => {
  const fps = editPlan.source_video.fps;
  const { outputSegments, overlapSeconds } = timeline;
  const sourceFps = editPlan.source_video.fps;
  const sourceDurationS = editPlan.source_video.duration_s;

  if (outputSegments.length === 0) {
    return null;
  }

  const children: React.ReactNode[] = [];

  for (let i = 0; i < outputSegments.length; i++) {
    const seg = outputSegments[i];
    const durationS = segmentOutputDurationS(seg);
    const durationInFrames = Math.max(1, Math.round(durationS * fps));

    if (i > 0) {
      const overlap = overlapSeconds[i - 1] ?? 0;
      const transitionFrames = Math.round(overlap * fps);
      if (transitionFrames > 0) {
        children.push(
          <TransitionSeries.Transition
            key={`t-${i}`}
            timing={linearTiming({ durationInFrames: transitionFrames })}
            presentation={presentationForTransitionType(
              outputSegments[i].transitionIn?.type ?? "none",
            )}
          />,
        );
      }
    }

    children.push(
      <TransitionSeries.Sequence
        key={`s-${seg.segmentIndex}`}
        durationInFrames={durationInFrames}
      >
        <SegmentVideoClip
          sourceVideoSrc={sourceVideoSrc}
          sourceFps={sourceFps}
          sourceDurationS={sourceDurationS}
          segment={seg}
        />
      </TransitionSeries.Sequence>,
    );
  }

  return <TransitionSeries>{children}</TransitionSeries>;
};
