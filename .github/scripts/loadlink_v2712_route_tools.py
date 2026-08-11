from pathlib import Path

path = Path("app/messages/page.tsx")
text = path.read_text()

# The chat + menu only routes to /tools. Messages must not own a second
# LogisticsMessageTools renderer at all, otherwise Safari can paint the tools
# after/below the fullscreen chat surface.
text = text.replace(
    'import LogisticsMessageTools, { type QuoteAutofillDefaults, type QuoteVehicleOption, type StructuredQuote } from "@/components/LogisticsMessageTools";',
    'import type { QuoteAutofillDefaults, QuoteVehicleOption, StructuredQuote } from "@/components/LogisticsMessageTools";',
)
text = text.replace(
    '  const [logisticsWorkspaceOpen, setLogisticsWorkspaceOpen] = useState(false);\n',
    '',
)

start_marker = '  if (selectedConversation && logisticsWorkspaceOpen) {'
start = text.find(start_marker)
if start != -1:
    brace_start = text.find('{', start)
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace_start
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''

        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ('"', "'", '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] == '\n':
                    end += 1
                text = text[:start] + text[end:]
                break
        i += 1
    else:
        raise SystemExit('Could not find the end of the embedded Logistics Tools block')

route_handler = 'window.location.assign(`/tools?from=messages&thread=${encodeURIComponent(selectedConversation.id)}`);'
if route_handler not in text:
    raise SystemExit('Standalone /tools navigation handler is missing')

for forbidden in ('logisticsWorkspaceOpen', 'setLogisticsWorkspaceOpen(', '<LogisticsMessageTools'):
    if forbidden in text:
        raise SystemExit(f'Embedded Logistics Tools reference still present: {forbidden}')

path.write_text(text)
print('Messages no longer contains any embedded Logistics Tools renderer. The + menu routes to standalone /tools only.')
