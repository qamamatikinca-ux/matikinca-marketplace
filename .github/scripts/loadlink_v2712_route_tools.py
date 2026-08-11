from pathlib import Path

path = Path("app/messages/page.tsx")
text = path.read_text()

old = '''onClick={() => {
                            setComposerActionsOpen(false);
                            setLogisticsWorkspaceOpen(true);
                          }}'''
new = '''onClick={() => {
                            setComposerActionsOpen(false);
                            window.location.assign(`/tools?from=messages&thread=${encodeURIComponent(selectedConversation.id)}`);
                          }}'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly one Logistics Tools click handler, found {count}")

text = text.replace(old, new, 1)
path.write_text(text)
print("Patched Messages: Logistics Tools now leaves chat and opens the standalone /tools page.")
