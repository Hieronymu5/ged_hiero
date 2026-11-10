declare module 'gifenc' {
  export type Palette = number[][];
  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): Encoder;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number, options?: object): Palette;
  export function applyPalette(rgba: Uint8ClampedArray, palette: Palette, format?: string): Uint8Array;
}
