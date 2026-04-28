import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { none } from "@remotion/transitions/none";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionType } from "../types/editPlan";

type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

export function presentationForTransitionType(
  type: TransitionType | string | undefined,
): AnyPresentation {
  switch (type) {
    case "crossfade":
      return fade() as AnyPresentation;
    case "fade_from_black":
      return fade({ shouldFadeOutExitingScene: true }) as AnyPresentation;
    case "wipe_left":
      return wipe({ direction: "from-right" }) as AnyPresentation;
    case "wipe_right":
      return wipe({ direction: "from-left" }) as AnyPresentation;
    case "wipe_up":
      return wipe({ direction: "from-bottom" }) as AnyPresentation;
    case "none":
    default:
      return none() as AnyPresentation;
  }
}
