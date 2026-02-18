"use client";

import { useEffect } from "react";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTooltipText(el) {
  const explicit = normalizeText(el.getAttribute("data-tooltip"));
  if (explicit) return explicit;

  const title = normalizeText(el.getAttribute("title"));
  if (title) return title;

  const aria = normalizeText(el.getAttribute("aria-label"));
  if (aria) return aria;

  const text = normalizeText(el.textContent);
  if (text) return text;

  return "";
}

function applyTooltip(el) {
  if (!(el instanceof HTMLElement)) return;
  if (el.tagName !== "BUTTON") return;

  const tooltipText = resolveTooltipText(el);
  if (!tooltipText) return;

  const ownText = normalizeText(el.textContent);
  const isIconOnly = ownText.length === 0;

  if (!isIconOnly) {
    el.removeAttribute("data-ta-tooltip");
    el.classList.remove("ta-icon-tooltip");
    return;
  }

  el.setAttribute("data-ta-tooltip", tooltipText);
  el.classList.add("ta-icon-tooltip");
  el.setAttribute("data-auto-tooltip", "true");

  if (!el.getAttribute("aria-label")) {
    el.setAttribute("aria-label", tooltipText);
  }

  if (el.hasAttribute("title")) {
    el.removeAttribute("title");
  }
}

function applyTooltips(root = document) {
  root.querySelectorAll("button").forEach((el) => applyTooltip(el));
}

export default function AutoButtonTooltip() {
  useEffect(() => {
    applyTooltips();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.tagName === "BUTTON") applyTooltip(node);
          applyTooltips(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const onFocusOrHover = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      applyTooltip(btn);
    };

    document.addEventListener("mouseover", onFocusOrHover);
    document.addEventListener("focusin", onFocusOrHover);

    return () => {
      observer.disconnect();
      document.removeEventListener("mouseover", onFocusOrHover);
      document.removeEventListener("focusin", onFocusOrHover);
    };
  }, []);

  return null;
}
