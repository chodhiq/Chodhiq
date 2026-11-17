"use client";

import { useEffect, useRef, useState } from "react";

export function useUrlFilter<T extends string>(
  parameter: string,
  values: readonly T[],
  fallback: T,
  targetId?: string,
  ready = true,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  const [initialized, setInitialized] = useState(false);
  const scrollPending = useRef(false);
  const shouldWrite = useRef(false);
  const valuesKey = values.join("\u0000");
  useEffect(() => {
    const read = (scroll: boolean) => {
      const params = new URLSearchParams(window.location.search);
      const candidate = params.get(parameter);
      shouldWrite.current = params.has(parameter);
      if (candidate !== null && valuesKey.split("\u0000").includes(candidate)) {
        setValue(candidate as T);
        if (scroll) scrollPending.current = true;
      } else setValue(fallback);
      setInitialized(true);
    };
    read(true);
    const onPopState = () => read(true);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fallback, parameter, valuesKey]);

  useEffect(() => {
    if (!initialized || !shouldWrite.current) return;
    const url = new URL(window.location.href);
    url.searchParams.set(parameter, value);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialized, parameter, value]);

  useEffect(() => {
    if (!initialized || !ready || !scrollPending.current || !targetId) return;
    scrollPending.current = false;
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView());
  }, [initialized, ready, targetId, value]);

  const updateValue = (next: T) => {
    shouldWrite.current = true;
    setValue(next);
  };
  return [value, updateValue];
}

export function useUrlSection(parameter: string, values: readonly string[], targetIds: Record<string, string>, ready = true) {
  const [section, setSection] = useUrlFilter(parameter, values, values[0], undefined, ready);
  const sectionId = targetIds[section];
  useEffect(() => {
    if (!ready || !sectionId || !new URLSearchParams(window.location.search).has(parameter)) return;
    window.requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView());
  }, [parameter, ready, sectionId]);
  return setSection;
}

export function useUrlParameter(parameter: string, fallback = "", targetId?: string): [string, (value: string) => void] {
  const [value, setValue] = useState(fallback);
  const [initialized, setInitialized] = useState(false);
  const shouldWrite = useRef(false);
  const scrollPending = useRef(false);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      shouldWrite.current = params.has(parameter);
      setValue(params.get(parameter) ?? fallback);
      scrollPending.current = params.has(parameter);
      setInitialized(true);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [fallback, parameter]);
  useEffect(() => {
    if (!initialized || !shouldWrite.current) return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialized, parameter, value]);
  useEffect(() => {
    if (!initialized || !scrollPending.current || !targetId) return;
    scrollPending.current = false;
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView());
  }, [initialized, targetId, value]);
  const updateValue = (next: string) => { shouldWrite.current = true; setValue(next); };
  return [value, updateValue];
}
