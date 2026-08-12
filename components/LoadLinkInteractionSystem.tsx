"use client";

import { useEffect, useMemo, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type DateTarget = {
  input: HTMLInputElement;
  label: string;
  min: string;
  max: string;
};

type ChoiceTarget = {
  select: HTMLSelectElement;
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled: boolean }>;
};

type SuggestionTarget = {
  input: HTMLInputElement;
  label: string;
  value: string;
  options: string[];
  left: number;
  top: number;
  width: number;
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function inputLabel(element: HTMLElement, fallback: string) {
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledText = labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : "";
  const label = element.closest("label");
  const explicit = element.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`) : null;
  return (
    element.getAttribute("aria-label") ||
    labelledText ||
    explicit?.textContent?.trim() ||
    label?.querySelector("span")?.textContent?.trim() ||
    label?.textContent?.trim() ||
    fallback
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function isLoadLinkDate(input: HTMLInputElement) {
  return input.dataset.loadlinkNativeUi !== "true" && (
    input.type === "date" ||
    input.dataset.loadlinkOriginalType === "date" ||
    input.dataset.loadlinkFutureDate === "true" ||
    input.dataset.loadlinkCustomDate === "true"
  );
}

function prepareDateControl(input: HTMLInputElement) {
  if (!isLoadLinkDate(input)) return false;
  if (input.type === "date") {
    input.dataset.loadlinkOriginalType = "date";
    try { input.type = "text"; } catch {}
  }
  input.readOnly = true;
  input.inputMode = "none";
  input.setAttribute("aria-haspopup", "dialog");
  input.setAttribute("autocomplete", "off");
  input.dataset.loadlinkCustomDate = "true";
  return true;
}

function prepareDatalistControl(input: HTMLInputElement) {
  if (input.dataset.loadlinkNativeUi === "true") return "";
  const list = input.getAttribute("list");
  if (list) {
    input.dataset.loadlinkDatalist = list;
    input.removeAttribute("list");
  }
  return input.dataset.loadlinkDatalist || "";
}

function selectorTarget(target: EventTarget | null) {
  return target instanceof Element ? target : null;
}

export default function LoadLinkInteractionSystem() {
  const [darkMode, setDarkMode] = useState(false);
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);
  const [choiceTarget, setChoiceTarget] = useState<ChoiceTarget | null>(null);
  const [suggestionTarget, setSuggestionTarget] = useState<SuggestionTarget | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [shownMonth, setShownMonth] = useState(() => monthStart(new Date()));

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(
        document.documentElement.dataset.loadlinkTheme === "dark" ||
        document.documentElement.classList.contains("dark"),
      );
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-loadlink-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!choiceTarget && !dateTarget) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.dataset.loadlinkSheetOpen = "true";
    html.dataset.loadlinkSheetOpen = "true";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      delete body.dataset.loadlinkSheetOpen;
      delete html.dataset.loadlinkSheetOpen;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [choiceTarget, dateTarget]);

  useEffect(() => {
    const prepareVisibleControls = () => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="date"],input[data-loadlink-future-date="true"],input[data-loadlink-custom-date="true"]')
        .forEach(prepareDateControl);
      document
        .querySelectorAll<HTMLInputElement>('input[list],input[data-loadlink-datalist]')
        .forEach(prepareDatalistControl);
    };

    const openSuggestion = (input: HTMLInputElement) => {
      const listId = prepareDatalistControl(input);
      if (!listId || input.disabled || input.readOnly) {
        setSuggestionTarget(null);
        return;
      }
      const datalist = document.getElementById(listId) as HTMLDataListElement | null;
      const options = datalist ? Array.from(datalist.options).map((option) => option.value.trim()).filter(Boolean) : [];
      if (!options.length) {
        setSuggestionTarget(null);
        return;
      }

      const rect = input.getBoundingClientRect();
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const width = Math.min(Math.max(rect.width, 260), Math.max(260, viewportWidth - 24));
      const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
      const menuHeight = Math.min(330, Math.max(120, options.length * 48 + 16));
      const belowTop = rect.bottom + 8;
      const top = belowTop + Math.min(menuHeight, viewportHeight * 0.42) <= viewportHeight - 12
        ? belowTop
        : Math.max(12, rect.top - Math.min(menuHeight, viewportHeight * 0.42) - 8);

      setSuggestionTarget({
        input,
        label: inputLabel(input, "Suggestions").replace(/\s+/g, " ").trim(),
        value: input.value,
        options,
        left,
        top,
        width,
      });
    };

    prepareVisibleControls();
    const delayed = window.setTimeout(prepareVisibleControls, 250);

    const openDate = (input: HTMLInputElement) => {
      if (!prepareDateControl(input)) return;
      const current = parseIso(input.value) || parseIso(input.min) || new Date();
      setSelectedDate(input.value || isoDate(current));
      setShownMonth(monthStart(current));
      setChoiceTarget(null);
      setSuggestionTarget(null);
      setDateTarget({ input, label: inputLabel(input, "Choose date"), min: input.min || "", max: input.max || "" });
    };

    const openChoice = (select: HTMLSelectElement) => {
      if (select.disabled || select.dataset.loadlinkNativeUi === "true") return;
      select.blur();
      setDateTarget(null);
      setSuggestionTarget(null);
      setChoiceTarget({
        select,
        label: inputLabel(select, "Choose an option").replace(/\s+/g, " ").trim(),
        value: select.value,
        options: Array.from(select.options).map((option) => ({ value: option.value, label: option.textContent || option.value, disabled: option.disabled })),
      });
    };

    const intercept = (event: Event) => {
      const element = selectorTarget(event.target);
      if (!element) return;

      const select = element.closest("select");
      if (select instanceof HTMLSelectElement && select.dataset.loadlinkNativeUi !== "true") {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        openChoice(select);
        return;
      }

      const input = element.closest('input[type="date"],input[data-loadlink-original-type="date"],input[data-loadlink-future-date="true"],input[data-loadlink-custom-date="true"]');
      if (input instanceof HTMLInputElement && isLoadLinkDate(input)) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        input.blur();
        openDate(input);
        return;
      }

      const datalistInput = element.closest('input[list],input[data-loadlink-datalist]');
      if (datalistInput instanceof HTMLInputElement) {
        prepareDatalistControl(datalistInput);
        window.requestAnimationFrame(() => openSuggestion(datalistInput));
      }
    };

    const focusIn = (event: FocusEvent) => {
      const element = selectorTarget(event.target);
      if (!element) return;
      if (element instanceof HTMLSelectElement && element.dataset.loadlinkNativeUi !== "true") {
        element.blur();
        openChoice(element);
        return;
      }
      if (!(element instanceof HTMLInputElement)) {
        if (!element.closest('[data-loadlink-datalist-menu="true"]')) setSuggestionTarget(null);
        return;
      }
      if (element.type === "tel") element.inputMode = "tel";
      if (element.type === "number" && !element.inputMode) {
        const step = element.step || "";
        element.inputMode = step && step !== "1" ? "decimal" : "numeric";
      }
      if (isLoadLinkDate(element)) {
        prepareDateControl(element);
        element.blur();
        openDate(element);
        return;
      }
      if (prepareDatalistControl(element)) openSuggestion(element);
      else setSuggestionTarget(null);
    };

    const inputEvent = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLInputElement)) return;
      if (prepareDatalistControl(element)) openSuggestion(element);
    };

    const closeSuggestionOutside = (event: PointerEvent) => {
      const element = selectorTarget(event.target);
      if (!element || element.closest('[data-loadlink-datalist-menu="true"]')) return;
      const input = element.closest('input[list],input[data-loadlink-datalist]');
      if (input instanceof HTMLInputElement) return;
      setSuggestionTarget(null);
    };

    const closeSuggestionOnViewportMove = () => setSuggestionTarget(null);

    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDateTarget(null);
        setChoiceTarget(null);
        setSuggestionTarget(null);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const active = document.activeElement;
      if (active instanceof HTMLSelectElement && active.dataset.loadlinkNativeUi !== "true") {
        event.preventDefault();
        openChoice(active);
      } else if (active instanceof HTMLInputElement && isLoadLinkDate(active)) {
        event.preventDefault();
        openDate(active);
      }
    };

    document.addEventListener("touchstart", intercept, { capture: true, passive: false });
    document.addEventListener("pointerdown", intercept, true);
    document.addEventListener("mousedown", intercept, true);
    document.addEventListener("click", intercept, true);
    document.addEventListener("focusin", focusIn, true);
    document.addEventListener("input", inputEvent, true);
    document.addEventListener("pointerdown", closeSuggestionOutside, true);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("resize", closeSuggestionOnViewportMove);
    window.addEventListener("scroll", closeSuggestionOnViewportMove, true);

    return () => {
      window.clearTimeout(delayed);
      document.removeEventListener("touchstart", intercept, true);
      document.removeEventListener("pointerdown", intercept, true);
      document.removeEventListener("mousedown", intercept, true);
      document.removeEventListener("click", intercept, true);
      document.removeEventListener("focusin", focusIn, true);
      document.removeEventListener("input", inputEvent, true);
      document.removeEventListener("pointerdown", closeSuggestionOutside, true);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("resize", closeSuggestionOnViewportMove);
      window.removeEventListener("scroll", closeSuggestionOnViewportMove, true);
    };
  }, []);

  const days = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const first = new Date(year, month, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0, 12).getDate();
    return Array.from({ length: mondayOffset + count }, (_, index) => index < mondayOffset ? null : new Date(year, month, index - mondayOffset + 1, 12));
  }, [shownMonth]);

  const suggestionOptions = useMemo(() => {
    if (!suggestionTarget) return [];
    const query = suggestionTarget.value.trim().toLowerCase();
    const exact = suggestionTarget.options.filter((option) => !query || option.toLowerCase().includes(query));
    return exact.slice(0, 12);
  }, [suggestionTarget]);

  const minDate = dateTarget?.min ? parseIso(dateTarget.min) : null;
  const maxDate = dateTarget?.max ? parseIso(dateTarget.max) : null;

  function commitDate() {
    if (!dateTarget || !selectedDate) return;
    setInputValue(dateTarget.input, selectedDate);
    setDateTarget(null);
  }

  function chooseOption(value: string) {
    if (!choiceTarget) return;
    setSelectValue(choiceTarget.select, value);
    setChoiceTarget(null);
  }

  function chooseSuggestion(value: string) {
    if (!suggestionTarget) return;
    const input = suggestionTarget.input;
    setInputValue(input, value);
    setSuggestionTarget(null);
    window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  return (
    <>
      {suggestionTarget && suggestionOptions.length ? (
        <div
          data-loadlink-datalist-menu="true"
          className={`fixed z-[2147483500] overflow-hidden rounded-[18px] border p-2 ${darkMode ? "text-white" : "text-black"}`}
          role="listbox"
          aria-label={`${suggestionTarget.label} suggestions`}
          style={{ left: suggestionTarget.left, top: suggestionTarget.top, width: suggestionTarget.width }}
        >
          <div className="max-h-[min(42dvh,330px)] overflow-y-auto overscroll-contain py-0.5 [-webkit-overflow-scrolling:touch]">
            {suggestionOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option.toLowerCase() === suggestionTarget.value.trim().toLowerCase()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(option)}
                className={`mb-1 flex min-h-11 w-full items-center rounded-[13px] border px-3.5 text-left text-sm font-bold last:mb-0 ${
                  darkMode ? "border-white/8 bg-white/[.035] hover:bg-white/[.08]" : "border-black/7 bg-white/[.42] hover:bg-white/[.72]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {choiceTarget ? (
        <div data-loadlink-choice-sheet="true" className="fixed inset-0 z-[2147483580] flex items-center justify-center bg-black/32 p-4 backdrop-blur-[12px]" role="dialog" aria-modal="true" aria-label={choiceTarget.label} onMouseDown={(event) => { if (event.target === event.currentTarget) setChoiceTarget(null); }}>
          <section className={`flex w-full max-w-[500px] flex-col overflow-hidden rounded-[28px] border p-4 ${darkMode ? "text-white" : "text-black"}`}>
            <div className="flex shrink-0 items-center justify-between gap-4 px-1 pb-3">
              <h2 className="min-w-0 text-xl font-black uppercase tracking-[-.015em]">{choiceTarget.label}</h2>
              <button type="button" onClick={() => setChoiceTarget(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15" aria-label="Close options"><LoadLinkIcon name="close" size={16} /></button>
            </div>
            <div data-loadlink-sheet-scroll="true" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]">
              {choiceTarget.options.map((option) => {
                const selected = option.value === choiceTarget.value;
                return (
                  <button key={`${option.value}-${option.label}`} type="button" disabled={option.disabled} onClick={() => chooseOption(option.value)} className={`mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-[15px] border px-4 text-left text-sm font-bold disabled:opacity-35 ${selected ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-white/[.045]" : "border-black/10 bg-white/[.34]"}`}>
                    <span>{option.label}</span>{selected ? <LoadLinkIcon name="check" size={17} strokeWidth={2.2} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {dateTarget ? (
        <div data-loadlink-calendar-sheet="true" className="fixed inset-0 z-[2147483590] flex items-center justify-center bg-black/32 p-4 backdrop-blur-[12px]" role="dialog" aria-modal="true" aria-labelledby="loadlink-calendar-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setDateTarget(null); }}>
          <section className={`w-full max-w-[520px] overflow-y-auto rounded-[30px] border p-5 ${darkMode ? "text-white" : "text-black"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><p className={`text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "text-[#f6b800]" : "text-[#8f6900]"}`}>{dateTarget.label}</p><h2 id="loadlink-calendar-title" className="mt-1 text-[26px] font-black tracking-[-.035em]">Choose a date</h2></div>
              <button type="button" onClick={() => setDateTarget(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15" aria-label="Close calendar"><LoadLinkIcon name="close" size={16} /></button>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setShownMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() - 1, 1)))} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Previous month"><LoadLinkIcon name="chevronLeft" size={17} /></button>
              <strong className="text-sm font-black">{shownMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</strong>
              <button type="button" onClick={() => setShownMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() + 1, 1)))} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Next month"><LoadLinkIcon name="chevronRight" size={17} /></button>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase opacity-45">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) return <span key={`blank-${index}`} className="aspect-square" />;
                const value = isoDate(date);
                const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
                const selected = value === selectedDate;
                return <button key={value} type="button" disabled={disabled} onClick={() => setSelectedDate(value)} className={`aspect-square rounded-[13px] text-xs font-black disabled:opacity-20 ${selected ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/[.04]" : "bg-white/[.32]"}`}>{date.getDate()}</button>;
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { const now = new Date(); const value = isoDate(now); if ((!minDate || now >= minDate) && (!maxDate || now <= maxDate)) { setSelectedDate(value); setShownMonth(monthStart(now)); } }} className="h-11 rounded-[15px] border border-current/15 px-4 text-xs font-black uppercase">Today</button>
              <button type="button" onClick={commitDate} disabled={!selectedDate} className="h-11 flex-1 rounded-[15px] bg-[#f6b800] px-4 text-xs font-black uppercase text-black disabled:opacity-40">Choose date</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
