import React from "react";
import { OffthreadVideo, staticFile } from "remotion";
import type { OutputSegmentInfo } from "../lib/timeMap";

type Props = {
  sourceVideoSrc: string;
  sourceFps: number;
  sourceDurationS: number;
  segment: OutputSegmentInfo;
};

export const SegmentVideoClip: React.FC<Props> = ({
  sourceVideoSrc,
  sourceFps,
  sourceDurationS,
  segment,
}) => {
  const totalFrames = Math.max(1, Math.floor(sourceDurationS * sourceFps));
  const startFrame = Math.floor(segment.sourceStartS * sourceFps);
  const endFrame = Math.min(
    totalFrames,
    Math.max(startFrame + 1, Math.ceil(segment.sourceEndS * sourceFps)),
  );
  const speed = segment.speed;

  return (
    <OffthreadVideo
      src={staticFile(sourceVideoSrc)}
      trimBefore={startFrame}
      trimAfter={endFrame}
      playbackRate={speed}
    />
  );
};
