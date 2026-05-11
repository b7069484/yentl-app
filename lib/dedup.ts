export function hashClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class RecentSet {
  private map = new Map<string, true>();
  constructor(private max: number) {}

  add(key: string): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, true);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  size(): number {
    return this.map.size;
  }

  toArray(): string[] {
    return Array.from(this.map.keys());
  }
}
