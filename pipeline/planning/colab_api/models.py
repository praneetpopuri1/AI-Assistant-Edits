from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class FrameItem(BaseModel):
    jpeg_b64: str
    time_s: float


class VisionInput(BaseModel):
    type: Literal["video_path", "frame_array"]
    video_path: str | None = None
    frames: list[FrameItem] = Field(default_factory=list)


class GenerationConfig(BaseModel):
    sample_fps: float = 2.0
    max_frames: int = 120
    max_new_tokens_timeline: int = 1200
    max_new_tokens_plan: int = 2400


class PlanRequest(BaseModel):
    run_id: str
    source_meta: dict[str, Any]
    transcript_words: list[dict[str, Any]] = Field(default_factory=list)
    vision_input: VisionInput
    user_prompt: str
    mode: str = "style"
    generation: GenerationConfig = Field(default_factory=GenerationConfig)


class PlanResponse(BaseModel):
    run_id: str
    timeline_events: list[dict[str, Any]]
    model_plan_raw: dict[str, Any]
    final_edit_plan: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)

