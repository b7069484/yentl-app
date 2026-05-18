import "@testing-library/jest-dom/vitest";

// Node 22+ exposes a native `localStorage` accessor on globalThis that requires
// the `--localstorage-file` CLI flag to be functional. Without the flag its
// methods throw, and the accessor shadows jsdom's window.localStorage in
// every test. Install a minimal in-memory Storage polyfill on both globalThis
// and window so tests that touch localStorage / sessionStorage just work.
class StorageMock implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

const installStorage = (name: "localStorage" | "sessionStorage") => {
  const store = new StorageMock();
  Object.defineProperty(globalThis, name, {
    value: store,
    writable: true,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: store,
      writable: true,
      configurable: true,
    });
  }
};

installStorage("localStorage");
installStorage("sessionStorage");
