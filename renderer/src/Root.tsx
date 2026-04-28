import "./index.css";
import { Composition } from "remotion";
import { defaultEditPlanProps } from "./defaultProps";
import { EditPlanVideo } from "./editPlan/EditPlanVideo";
import { calculateEditPlanMetadata } from "./lib/metadata";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EditPlanVideo"
        component={EditPlanVideo}
        defaultProps={defaultEditPlanProps}
        calculateMetadata={calculateEditPlanMetadata}
      />
    </>
  );
};
