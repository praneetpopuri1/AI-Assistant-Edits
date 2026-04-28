from __future__ import annotations

from typing import Any

import requests


def request_plan(colab_base_url: str, payload: dict[str, Any], timeout_s: int = 600) -> dict[str, Any]:
    endpoint = f"{colab_base_url.rstrip('/')}/plan"
    response = requests.post(endpoint, json=payload, timeout=timeout_s)
    response.raise_for_status()
    return response.json()

