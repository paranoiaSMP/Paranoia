"use client";

import { useEffect, useRef } from "react";

type Handler = (data: unknown) => void;

let source: EventSource | null = null;
const handlers = new Map<string, Set<Handler>>();
const attached = new Set<string>();

function attach(event: string) {
  if (!source || attached.has(event)) return;
  attached.add(event);
  source.addEventListener(event, (e) => {
    let data: unknown = null;
    try {
      data = JSON.parse((e as MessageEvent).data);
    } catch {}
    handlers.get(event)?.forEach((h) => h(data));
  });
}

function open() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/stream");
  attached.clear();
  for (const event of handlers.keys()) attach(event);
}

function closeIfIdle() {
  if (!source) return;
  for (const set of handlers.values()) if (set.size) return;
  source.close();
  source = null;
  attached.clear();
}

export function subscribe(event: string, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(handler);
  open();
  attach(event);
  return () => {
    set.delete(handler);
    if (!set.size) handlers.delete(event);
    closeIfIdle();
  };
}

export function useRealtime<T = unknown>(event: string, handler: (data: T) => void, enabled = true) {
  const ref = useRef<(data: T) => void>(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    return subscribe(event, (d) => ref.current(d as T));
  }, [event, enabled]);
}
