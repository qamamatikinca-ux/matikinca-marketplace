from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label} marker not found")
    return text.replace(old, new, 1)


tools_path = Path("components/LogisticsMessageTools.tsx")
tools = tools_path.read_text()

tools = replace_once(
    tools,
    '  trigger?: "bar" | "menu";\n',
    '  trigger?: "bar" | "menu" | "hidden";\n',
    "trigger type",
)

tools = replace_once(
    tools,
    '  }, [open]);\n\n  const templates = useMemo(() => {',
    '''  }, [open]);

  useEffect(() => {
    if (trigger !== "hidden") return;
    const openFromChat = () => openPanel();
    window.addEventListener("loadlink:open-logistics-tools", openFromChat);
    return () => window.removeEventListener("loadlink:open-logistics-tools", openFromChat);
  }, [trigger, disabled, threadId]);

  const templates = useMemo(() => {''',
    "hidden trigger event",
)

tools = replace_once(
    tools,
    '''  function openPanel() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onOpen?.();
    setOpen(true);
  }
''',
    '''  function openPanel() {
    if (disabled) return;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onOpen?.();
    setOpen(true);
  }
''',
    "openPanel",
)

tools = replace_once(
    tools,
    ') : (\n        <button type="button" onClick={openPanel} disabled={disabled} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black disabled:opacity-40 ${control}`} aria-expanded={open}>',
    ') : trigger === "bar" ? (\n        <button type="button" onClick={openPanel} disabled={disabled} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black disabled:opacity-40 ${control}`} aria-expanded={open}>',
    "bar trigger",
)

tools = replace_once(
    tools,
    '''          Logistics
        </button>
      )}

      {open && typeof document !== "undefined" ? createPortal(''',
    '''          Logistics
        </button>
      ) : null}

      {open && typeof document !== "undefined" ? createPortal(''',
    "trigger end",
)

tools_path.write_text(tools)

page_path = Path("app/messages/page.tsx")
page = page_path.read_text()

page = replace_once(
    page,
    '''  return (
    <main
      data-theme={darkMode ? "dark" : "light"}''',
    '''  return (
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
      data-theme={darkMode ? "dark" : "light"}''',
    "messages return start",
)

page = replace_once(
    page,
    '''                        <LogisticsMessageTools
                          threadId={selectedConversation.id}
                          listingTitle={selectedConversation.listing_title}
                          role={selectedConversation.role}
                          darkMode={darkMode}
                          disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                          trigger="menu"
                          onClose={() => setComposerActionsOpen(false)}
                          onSendQuote={sendStructuredQuote}
                          quoteDefaults={quoteDefaults}
                          savedVehicles={quoteVehicles}
                          onInsert={(message) => updateTyping(text.trim() ? `${text.trim()}\n\n${message}` : message)}
                        />''',
    '''                        <button
                          type="button"
                          disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                          onClick={() => {
                            setComposerActionsOpen(false);
                            window.dispatchEvent(new Event("loadlink:open-logistics-tools"));
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-black/[.04] disabled:opacity-40"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /></svg>
                          </span>
                          <span className="min-w-0 flex-1"><span className="block">Logistics tools</span><span className="mt-0.5 block truncate text-[9px] font-semibold text-black/40">Open the full tool workspace</span></span>
                        </button>''',
    "nested logistics component",
)

page = replace_once(
    page,
    '''      </div>
    </main>
  );
}

function VoiceAttachment''',
    '''      </div>
      </main>
    </>
  );
}

function VoiceAttachment''',
    "messages return end",
)

page_path.write_text(page)
