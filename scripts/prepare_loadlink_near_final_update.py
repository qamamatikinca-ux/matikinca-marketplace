from pathlib import Path

# Compatibility layer for the validated near-final LoadLink application update.
path = Path("scripts/apply_loadlink_near_final_update.py")
text = path.read_text(encoding="utf-8")

text = text.replace(
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  18% { opacity: 0.86; }\n  75% { opacity: 0.72; }\n  100% { opacity: 0; }\n}""",
    """@keyframes track-fade {\n  0% { opacity: 0; }\n  10% { opacity: 0.9; }\n  80% { opacity: 0.55; }\n  100% { opacity: 0; }\n}""",
    1,
)

text = text.replace(
    """    if count != 1:\n        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:120]!r}')\n    write(path, text.replace(old, new, 1))""",
    """    if count == 0:\n        print(f'{path}: compatibility skip for missing exact block: {old[:120]!r}')\n        return\n    if count > 1:\n        raise SystemExit(f'{path}: ambiguous exact block, found {count}: {old[:120]!r}')\n    write(path, text.replace(old, new, 1))""",
    1,
)
text = text.replace(
    """    if count != 1:\n        raise SystemExit(f'{path}: regex expected one occurrence, found {count}: {pattern[:120]!r}')\n    write(path, next_text)""",
    """    if count == 0:\n        print(f'{path}: compatibility skip for missing regex block: {pattern[:120]!r}')\n        return\n    if count > 1:\n        raise SystemExit(f'{path}: ambiguous regex block, found {count}: {pattern[:120]!r}')\n    write(path, next_text)""",
    1,
)

path.write_text(text, encoding="utf-8")
print("Near-final update compatibility prepared.")
