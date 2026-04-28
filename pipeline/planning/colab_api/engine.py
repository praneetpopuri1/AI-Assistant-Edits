from __future__ import annotations

import base64
import io
import os
import re
from dataclasses import dataclass
from typing import Any

from PIL import Image

from pipeline.planning.colab_api.models import PlanRequest
from pipeline.planning.shared.normalize import (
    build_final_plan,
    default_keep_plan,
    extract_json_object,
    seconds_to_ts,
    validate_events,
)
from pipeline.planning.shared.prompts import build_plan_prompt, build_timeline_prompt


@dataclass
class PlannerConfig:
    model_name: str = "Qwen/Qwen3-VL-8B-Instruct"
    torch_dtype: str = "bfloat16"


class QwenPlannerEngine:
    """
    Qwen-based two-pass planner kept intentionally close to notebook behavior.
    """

    def __init__(self, config: PlannerConfig | None = None) -> None:
        self.config = config or PlannerConfig()
        self._model = None
        self._processor = None
        self._vision_fn = None

    def _ensure_loaded(self) -> None:
        if self._model is not None and self._processor is not None and self._vision_fn is not None:
            return
        try:
            import torch
            from qwen_vl_utils import process_vision_info
            from transformers import AutoProcessor, Qwen3VLForConditionalGeneration
        except ImportError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError(
                "Missing Colab dependencies. Install transformers, torch, qwen-vl-utils."
            ) from exc

        dtype = getattr(torch, self.config.torch_dtype)
        self._model = Qwen3VLForConditionalGeneration.from_pretrained(
            self.config.model_name,
            torch_dtype=dtype,
            device_map="auto",
            attn_implementation="sdpa",
        )
        self._processor = AutoProcessor.from_pretrained(self.config.model_name)
        self._vision_fn = process_vision_info

    def _decode_frames(self, frame_items: list[dict[str, Any]]) -> list[Image.Image]:
        images: list[Image.Image] = []
        for item in frame_items:
            raw = base64.b64decode(item["jpeg_b64"])
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            images.append(img)
        return images

    def _run_prompt(
        self,
        *,
        text_prompt: str,
        vision_payload: dict[str, Any],
        sample_fps: float,
        max_frames: int,
        max_new_tokens: int,
    ) -> str:
        self._ensure_loaded()
        assert self._model is not None
        assert self._processor is not None
        assert self._vision_fn is not None

        content: list[dict[str, Any]] = []
        if vision_payload["type"] == "video_path":
            content.append(
                {
                    "type": "video",
                    "video": vision_payload["video_path"],
                    "total_pixels": 8192 * 32 * 32,
                    "min_pixels": 64 * 32 * 32,
                    "max_frames": max_frames,
                    "sample_fps": sample_fps,
                }
            )
        else:
            frames = self._decode_frames(vision_payload.get("frames", []))
            # Qwen cookbook frame-list mode: provide sampled frames plus sampling metadata.
            content.append(
                {
                    "type": "video",
                    "video": frames,
                    "total_pixels": 8192 * 32 * 32,
                    "min_pixels": 64 * 32 * 32,
                    "max_frames": max_frames,
                    "sample_fps": sample_fps,
                }
            )

        content.append({"type": "text", "text": text_prompt})
        conversation = [{"role": "user", "content": content}]

        chat_text = self._processor.apply_chat_template(
            conversation,
            tokenize=False,
            add_generation_prompt=True,
        )

        image_inputs, video_inputs, video_kwargs = self._vision_fn(
            [conversation],
            return_video_kwargs=True,
            image_patch_size=16,
            return_video_metadata=True,
        )
        if video_inputs is not None:
            video_inputs, video_metadatas = zip(*video_inputs)
            video_inputs = list(video_inputs)
            video_metadatas = list(video_metadatas)
        else:
            video_metadatas = None

        inputs = self._processor(
            text=[chat_text],
            images=image_inputs,
            videos=video_inputs,
            video_metadata=video_metadatas,
            **video_kwargs,
            do_resize=False,
            return_tensors="pt",
            padding=True,
        ).to(self._model.device)

        import torch

        with torch.inference_mode():
            generated_ids = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
            )

        trimmed_ids = [
            out_ids[len(in_ids) :]
            for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        raw_output = self._processor.batch_decode(
            trimmed_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]

        m = re.match(r"<think>\n?(.*?)</think>\n*", raw_output, flags=re.DOTALL)
        if m:
            raw_output = raw_output[m.end() :].strip()
        return raw_output.strip()

    def generate(self, request: PlanRequest) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any], list[str]]:
        warnings: list[str] = []
        timeline_prompt = build_timeline_prompt(request.source_meta)
        timeline_response = self._run_prompt(
            text_prompt=timeline_prompt,
            vision_payload=request.vision_input.model_dump(),
            sample_fps=request.generation.sample_fps,
            max_frames=request.generation.max_frames,
            max_new_tokens=request.generation.max_new_tokens_timeline,
        )

        try:
            timeline_json = extract_json_object(timeline_response)
            timeline_events = validate_events(
                timeline_json.get("events", []),
                duration_s=float(request.source_meta["duration_s"]),
                min_len_s=1.0,
            )
        except Exception as exc:
            warnings.append(f"timeline_parse_failed: {exc}")
            timeline_events = []

        if not timeline_events:
            timeline_events = [
                {
                    "start": "00:00.00",
                    "end": seconds_to_ts(float(request.source_meta["duration_s"])),
                    "start_s": 0.0,
                    "end_s": round(float(request.source_meta["duration_s"]), 2),
                    "description": "Full video fallback event",
                    "visible_objects": [],
                    "confidence": "low",
                }
            ]

        plan_prompt = build_plan_prompt(
            source_meta=request.source_meta,
            events=timeline_events,
            transcript_words=request.transcript_words,
            user_prompt=request.user_prompt,
        )
        plan_response = self._run_prompt(
            text_prompt=plan_prompt,
            vision_payload=request.vision_input.model_dump(),
            sample_fps=request.generation.sample_fps,
            max_frames=request.generation.max_frames,
            max_new_tokens=request.generation.max_new_tokens_plan,
        )

        try:
            model_plan_raw = extract_json_object(plan_response)
            final_edit_plan = build_final_plan(
                model_plan_raw,
                request.source_meta,
                caption_words=request.transcript_words,
            )
        except Exception as exc:
            warnings.append(f"plan_parse_failed: {exc}")
            model_plan_raw = {}
            final_edit_plan = default_keep_plan(
                request.source_meta,
                caption_words=request.transcript_words,
            )

        return timeline_events, model_plan_raw, final_edit_plan, warnings


def build_engine_from_env() -> QwenPlannerEngine:
    config = PlannerConfig(
        model_name=os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3-VL-8B-Instruct"),
    )
    return QwenPlannerEngine(config=config)

