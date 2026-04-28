import React from "react";
import { AbsoluteFill } from "remotion";
import type { EditPlan } from "../types/editPlan";
import { getReframeStyle } from "../lib/reframe";

type Props = {
  plan: EditPlan;
  children: React.ReactNode;
};

export const ReframeWrapper: React.FC<Props> = ({ plan, children }) => {
  const reframe = plan.reframe;
  if (!reframe?.enabled || !reframe.target_aspect_ratio) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <AbsoluteFill style={getReframeStyle(plan)}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
