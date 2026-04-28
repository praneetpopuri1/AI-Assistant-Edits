import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import type { EditPlanRendererProps } from "../types/editPlan";
import { buildOutputTimeline } from "../lib/timeMap";
import { CaptionsLayer } from "../components/CaptionsLayer";
import { MusicLayer } from "../components/MusicLayer";
import { OverlaysLayer } from "../components/OverlaysLayer";
import { ReframeWrapper } from "../components/ReframeWrapper";
import { TextOverlaysLayer } from "../components/TextOverlaysLayer";
import { VideoSegmentSeries } from "../components/VideoSegmentSeries";
import { ZoomLayer } from "../components/ZoomLayer";

export const EditPlanVideo: React.FC<EditPlanRendererProps> = ({
  editPlan,
  sourceVideoSrc,
  musicSrc,
}) => {
  const timeline = useMemo(() => buildOutputTimeline(editPlan), [editPlan]);
  const zooms = editPlan.zooms ?? [];
  const overlays = editPlan.overlays ?? [];
  const textOverlays = editPlan.text_overlays ?? [];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ReframeWrapper plan={editPlan}>
        <ZoomLayer editPlan={editPlan} timeline={timeline} zooms={zooms}>
          <VideoSegmentSeries
            editPlan={editPlan}
            sourceVideoSrc={sourceVideoSrc}
            timeline={timeline}
          />
        </ZoomLayer>
      </ReframeWrapper>
      <CaptionsLayer editPlan={editPlan} timeline={timeline} />
      <OverlaysLayer editPlan={editPlan} timeline={timeline} overlays={overlays} />
      <TextOverlaysLayer editPlan={editPlan} timeline={timeline} items={textOverlays} />
      <MusicLayer editPlan={editPlan} timeline={timeline} musicSrc={musicSrc} />
    </AbsoluteFill>
  );
};
