"use client";
import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

// Drop-in replacement for <select>: same props (value, onChange(e), disabled, required,
// className, <option> children) but with the system's own dropdown list.
// onChange receives { target: { value } }, like a native select event.
function readOptions(children) {
  const out = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    if (c.type === "option") {
      const label = Children.toArray(c.props.children).join("");
      out.push({ value: String(c.props.value ?? label), label, disabled: !!c.props.disabled });
    } else if (c.props?.children) out.push(...readOptions(c.props.children)); // fragments
  });
  return out;
}

// variant="dropdown" keeps the dropdown whatever the number of options (long or data-driven lists).
export default function Select({ value, onChange, disabled, required, className = "field", children, id, variant, ...rest }) {
  const options = useMemo(() => readOptions(children), [children]);
  const current = String(value ?? "");
  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState(null);
  const btn = useRef(null);
  const list = useRef(null);
  const uid = useId();

  function place() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setBox({ left: r.left, width: r.width, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const close = (e) => {
      if (btn.current?.contains(e.target) || list.current?.contains(e.target)) return;
      setOpen(false);
    };
    const move = (e) => {
      if (list.current?.contains(e.target)) return;
      place();
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", move, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", move, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }
  function pick(o) {
    if (o.disabled) return;
    onChange?.({ target: { value: o.value } });
    setOpen(false);
    btn.current?.focus();
  }
  function onKey(e) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[active]) pick(options[active]); }
    else if (e.key === "Tab") setOpen(false);
  }

  // A short list (2 to 4 choices) is shown as radio buttons (round, one answer only) instead of a dropdown. Longer lists keep the dropdown (tick boxes do not fit them).
  const choices = options.filter((o) => o.value !== "");
  if (variant !== "dropdown" && choices.length >= 2 && choices.length <= 4) {
    const pickChoice = (o) => { if (!disabled && !o.disabled && o.value !== current) onChange?.({ target: { value: o.value } }); };
    return (
      <div className="relative flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2" role="radiogroup" id={id}>
        {choices.map((o) => {
          const on = o.value === current;
          const off = disabled || o.disabled;
          return (
            // A span, not a button / input: inside the field's <label> a click on the title must not tick the first box.
            <span
              key={o.value}
              role="radio"
              aria-checked={on}
              aria-disabled={off || undefined}
              tabIndex={off ? -1 : 0}
              onClick={() => pickChoice(o)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); pickChoice(o); } }}
              className={`inline-flex select-none items-center gap-2 text-sm outline-none ${off ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"}`}
            >
              <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition ${on ? "border-brand bg-white" : "border-slate-300 bg-white"} ${off ? "opacity-60" : ""}`}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
              </span>
              <span className={on ? "font-semibold text-slate-800" : ""}>{o.label}</span>
            </span>
          );
        })}
        {required && (
          // Hidden field so the form's native "required" check still works.
          <input tabIndex={-1} aria-hidden required value={current} onChange={() => {}}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />
        )}
      </div>
    );
  }

  const isPlaceholder = !selected || selected.value === "";
  return (
    <>
      <div className="relative">
        <button
          type="button"
          id={id}
          ref={btn}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${uid}-list`}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKey}
          className={`${className} flex items-center justify-between gap-2 text-left ${
            open ? "!border-brand shadow-[0_0_0_3px_rgba(47,168,154,0.18)]" : ""
          } ${disabled ? "cursor-not-allowed !bg-slate-50 text-slate-500" : "cursor-pointer"}`}
          {...rest}
        >
          <span className={`truncate ${isPlaceholder ? "text-slate-400" : "text-slate-800"}`}>
            {selected ? selected.label : current || "Select"}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180 text-brand-dark" : ""}`} />
        </button>
        {required && (
          // Hidden field so the form's native "required" check still works.
          <input tabIndex={-1} aria-hidden required value={current} onChange={() => {}}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />
        )}
      </div>
      {open && box &&
        createPortal(
          <ul
            ref={list}
            id={`${uid}-list`}
            role="listbox"
            style={{ position: "fixed", left: box.left, width: box.width, top: box.top, bottom: box.bottom }}
            className="anim-pop z-[100] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)]"
          >
            {options.map((o, i) => {
              const sel = o.value === current;
              return (
                <li
                  key={o.value + i}
                  role="option"
                  aria-selected={sel}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    o.disabled ? "cursor-not-allowed text-slate-300"
                    : sel ? "bg-brand-50 font-semibold text-brand-dark"
                    : i === active ? "bg-slate-50 text-slate-800"
                    : o.value === "" ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check size={15} className="shrink-0 text-brand" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
