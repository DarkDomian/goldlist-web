import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => {},
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.dataset.theme = "";
  document.documentElement.style.colorScheme = "";
});
