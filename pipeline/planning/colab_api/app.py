from __future__ import annotations

from fastapi import FastAPI, HTTPException

from pipeline.planning.colab_api.engine import build_engine_from_env
from pipeline.planning.colab_api.models import PlanRequest, PlanResponse

app = FastAPI(title="AI-Edits Colab Planner API", version="0.1.0")
engine = build_engine_from_env()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/plan", response_model=PlanResponse)
def plan(request: PlanRequest) -> PlanResponse:
    try:
        timeline_events, model_plan_raw, final_edit_plan, warnings = engine.generate(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return PlanResponse(
        run_id=request.run_id,
        timeline_events=timeline_events,
        model_plan_raw=model_plan_raw,
        final_edit_plan=final_edit_plan,
        warnings=warnings,
    )

