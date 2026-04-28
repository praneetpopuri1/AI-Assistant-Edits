from __future__ import annotations

import json
import subprocess


def get_video_metadata(path: str) -> dict[str, float | int]:
    """Read canonical source_video metadata with ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,duration",
        "-of",
        "json",
        path,
    ]
    out = subprocess.check_output(cmd).decode("utf-8")
    data = json.loads(out)
    stream = data["streams"][0]

    num, den = stream["r_frame_rate"].split("/")
    fps = float(num) / float(den) if float(den) != 0 else 0.0
    duration_s = float(stream.get("duration", 0) or 0)

    return {
        "duration_s": round(duration_s, 3),
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": round(fps, 3),
    }

