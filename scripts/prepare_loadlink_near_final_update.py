from pathlib import Path

path = Path("scripts/apply_loadlink_near_final_update.py")
text = path.read_text(encoding="utf-8")
text = text.replace(
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  18% { opacity: 0.86; }\n  75% { opacity: 0.72; }\n  100% { opacity: 0; }\n}""",
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  10% { opacity: 0.9; }\n  80% { opacity: 0.55; }\n  100% { opacity: 0; }\n}""",
    1,
)
path.write_text(text, encoding="utf-8")
print("Near-final update compatibility prepared.")
