from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label} marker not found")
    return text.replace(old, new, 1)

# Make LogisticsMessageTools capable of mounting already open.
tools_path = Path("components/LogisticsMessageTools.tsx")
tools = tools_path.read_text()

tools = replace_once(
    tools,
    '  savedVehicles?: QuoteVehicleOption[];\n};',
    '  savedVehicles?: QuoteVehicleOption[];\n  forceOpen?: boolean;\n};',
    "tools props",
)

tools = replace_once(
    tools,
    '  savedVehicles = [],\n}: Props) {\n  const [open, setOpen] = useState(false);',
    '  savedVehicles = [],\n  forceOpen = false,\n}: Props) {\n  const [open, setOpen] = useState(Boolean(forceOpen));',
    "tools initial open",
)

tools = replace_once(
    tools,
    '    setOpen(false);\n    setQuoteOpen(false);',
    '    setOpen(Boolean(forceOpen));\n    setQuoteOpen(false);',
    "thread reset open",
)

tools = replace_once(
    tools,
    '  }, [threadId]);',
    '  }, [threadId, forceOpen]);',
    "thread effect dependencies",
)

tools_path.write_text(tools)

# Make the Messages page own the tools state and stop rendering chat while tools are open.
page_path = Path("app/messages/page.tsx")
page = page_path.read_text()

page = replace_once(
    page,
    '  const [composerActionsOpen, setComposerActionsOpen] = useState(false);\n',
    '  const [composerActionsOpen, setComposerActionsOpen] = useState(false);\n  const [logisticsWorkspaceOpen, setLogisticsWorkspaceOpen] = useState(false);\n',
    "messages state",
)

old_controller = '''  return (
    <>
      {selectedConversation ? (
        <LogisticsMessageTools
          threadId={selectedConversation.id}
          listingTitle={selectedConversation.listing_title}
          role={selectedConversation.role}
          darkMode={darkMode}
          disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
          trigger="hidden"
          onOpen={() => setComposerActionsOpen(false)}
          onSendQuote={sendStructuredQuote}
          quoteDefaults={quoteDefaults}
          savedVehicles={quoteVehicles}
          onInsert={(message) => updateTyping(text.trim() ? `${text.trim()}\n\n${message}` : message)}
        />
      ) : null}
      <main
'''
new_controller = '''  if (selectedConversation && logisticsWorkspaceOpen) {
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

  return (
    <main
'''
page = replace_once(page, old_controller, new_controller, "messages tools controller")

page = replace_once(
    page,
    '''                          onClick={() => {
                            setComposerActionsOpen(false);
                            window.dispatchEvent(new Event("loadlink:open-logistics-tools"));
                          }}''',
    '''                          onClick={() => {
                            setComposerActionsOpen(false);
                            setLogisticsWorkspaceOpen(true);
                          }}''',
    "logistics menu button",
)

page = replace_once(
    page,
    '''      </div>
      </main>
    </>
  );
}

function VoiceAttachment''',
    '''      </div>
    </main>
  );
}

function VoiceAttachment''',
    "messages return closing",
)

page_path.write_text(page)
