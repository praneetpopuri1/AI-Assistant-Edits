import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { EditPlan, Zoom } from "../types/editPlan";
import { sourceTimeToOutputSeconds } from "../lib/timeMap";
import type { OutputTimeline } from "../lib/timeMap";

function anchorToOrigin(anchor: Zoom["anchor"], xy?: { x: number; y: number }): string {
  if (anchor === "custom" && xy) {
    return `${xy.x * 100}% ${xy.y * 100}%`;
  }
  switch (anchor) {
    case "top_third":
      return "50% 33%";
    case "bottom_third":
      return "50% 66%";
    case "face":
      return "50% 38%";
    case "center":
    default:
      return "50% 50%";
  }
}

function easingFor(z: Zoom["easing"]): (t: number) => number {
  switch (z) {
    case "ease_in":
      return Easing.in(Easing.ease);
    case "ease_out":
      return Easing.out(Easing.ease);
    case "linear":
      return Easing.linear;
    case "spring":
      return Easing.bezier(0.34, 1.56, 0.64, 1);
    case "ease_in_out":
    default:
      return Easing.inOut(Easing.ease);
  }
}

type Props = {
  editPlan: EditPlan;
  timeline: OutputTimeline;
  zooms: Zoom[];
  children: React.ReactNode;
};

export const ZoomLayer: React.FC<Props> = ({
  editPlan,
  timeline,
  zooms,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const active = useMemo(() => {
    for (const z of zooms) {
      const start = sourceTimeToOutputSeconds(editPlan, z.start_s, timeline);
      const end = sourceTimeToOutputSeconds(editPlan, z.end_s, timeline);
      if (start === null || end === null) continue;
      const from = Math.floor(start * fps);
      const to = Math.ceil(end * fps);
      if (frame >= from && frame < to) {
        return { z, from, to };
      }
    }
    return null;
  }, [editPlan, fps, frame, timeline, zooms]);

  if (!active) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const { z, from, to } = active;
  const scale = interpolate(frame, [from, to], [1, z.scale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easingFor(z.easing ?? "ease_in_out"),
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: anchorToOrigin(z.anchor ?? "face", z.anchor_xy),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
