from pathlib import Path

path = Path("app/messages/page.tsx")
text = path.read_text()

# Logistics Tools stays inside Messages, but it takes over the whole Messages render.
# It must never navigate to /tools and it must never render beneath the chat.

old_import = 'import type { QuoteAutofillDefaults, QuoteVehicleOption, StructuredQuote } from "@/components/LogisticsMessageTools";'
new_import = 'import LogisticsMessageTools, { type QuoteAutofillDefaults, type QuoteVehicleOption, type StructuredQuote } from "@/components/LogisticsMessageTools";'
if old_import not in text:
    raise SystemExit("Expected type-only LogisticsMessageTools import was not found")
text = text.replace(old_import, new_import, 1)

state_anchor = '  const [composerActionsOpen, setComposerActionsOpen] = useState(false);\n'
state_line = '  const [logisticsWorkspaceOpen, setLogisticsWorkspaceOpen] = useState(false);\n'
if state_line not in text:
    if state_anchor not in text:
        raise SystemExit("Composer actions state anchor not found")
    text = text.replace(state_anchor, state_anchor + state_line, 1)

old_click = '''onClick={() => {
                            setComposerActionsOpen(false);
                            window.location.assign(`/tools?from=messages&thread=${encodeURIComponent(selectedConversation.id)}`);
                          }}'''
new_click = '''onClick={() => {
                            setComposerActionsOpen(false);
                            setLogisticsWorkspaceOpen(true);
                          }}'''
if old_click not in text:
    raise SystemExit("Standalone /tools navigation handler not found")
text = text.replace(old_click, new_click, 1)

# Insert the takeover render immediately after the loading return and before the normal Messages return.
block = '''
  if (selectedConversation && logisticsWorkspaceOpen) {
    return (
      <LogisticsMessageTools
        threadId={selectedConversation.id}
        listingTitle={selectedConversation.listing_title}
        role={selectedConversation.role}
        darkMode={darkMode}
        disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
        trigger="hidden"
        forceOpen
        onClose={() => setLogisticsWorkspaceOpen(false)}
        onSendQuote={sendStructuredQuote}
        quoteDefaults={quoteDefaults}
        savedVehicles={quoteVehicles}
        onInsert={(message) => updateTyping(text.trim() ? `${text.trim()}\n\n${message}` : message)}
      />
    );
  }

'''
if 'if (selectedConversation && logisticsWorkspaceOpen)' not in text:
    anchor = '''      </main>\n    );\n  }\n\n  return (\n    <main'''
    if anchor not in text:
        raise SystemExit("Could not find Messages render boundary for takeover insertion")
    text = text.replace(anchor, '''      </main>\n    );\n  }\n\n''' + block + '''  return (\n    <main''', 1)

path.write_text(text)
print("Restored in-chat Logistics Tools as a full Messages takeover. No /tools navigation remains.")
