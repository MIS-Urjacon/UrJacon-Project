"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { DEF, renderDocument } from "@/lib/proposal/engine";
import { DOC_CSS, PAGES_HTML } from "@/lib/proposal/docHtml";

const PAGE_WIDTH = 794;

// Page shell around the 11 proposal pages. It lives in an iframe so the proposal keeps its own
// styles exactly (and printing prints only the proposal).
const FRAME_CSS = `html,body{height:auto!important;margin:0}body{background:#e9ebee;padding:14px 0 18px}
.pages{gap:18px!important}`;
const SRC_DOC = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap"><style>${DOC_CSS}${FRAME_CSS}</style></head><body><div class="pages" id="pages">${PAGES_HTML}</div></body></html>`;

// Shows the proposal for a builder state ({ state, media }). `ref` gives print().
export default function ProposalFrame({ proposal, height = 640, className = "", ref }) {
  const frame = useRef(null);
  const box = useRef(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);
  const srcDoc = useMemo(() => SRC_DOC, []);

  useImperativeHandle(ref, () => ({
    print: () => {
      const win = frame.current?.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
    },
  }), []);

  useEffect(() => {
    const node = box.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    setWidth(node.clientWidth); // eslint-disable-line react-hooks/set-state-in-effect -- measured after mount
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!ready || !doc || !proposal?.state) return;
    doc.documentElement.style.setProperty("--z", String(Math.min(1, Math.max(0.3, (width - 28) / PAGE_WIDTH))));
    try { renderDocument(doc, { ...DEF, ...proposal.state }, proposal.media ?? {}); } catch (error) { console.error("proposal render failed", error); }
  }, [ready, proposal, width]);

  return (
    <div ref={box} className={className}>
      <iframe ref={frame} title="Quotation proposal" srcDoc={srcDoc} onLoad={() => setReady(true)} style={{ width: "100%", height, border: 0, display: "block", background: "#e9ebee" }} />
    </div>
  );
}
