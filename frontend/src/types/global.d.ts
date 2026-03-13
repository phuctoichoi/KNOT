// Global type declarations for Docker build compatibility

declare global {
  // Fix for missing DOM types in Docker environment
  interface ImageData {
    readonly data: Uint8ClampedArray;
    readonly height: number;
    readonly width: number;
  }

  interface HTMLElementTagNameMap {
    [key: string]: HTMLElement;
  }

  interface SVGElementTagNameMap {
    [key: string]: SVGElement;
  }

  interface DOMRect {
    readonly bottom: number;
    readonly height: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  }

  interface CacheQueryOptions {
    ignoreMethod?: boolean;
    ignoreSearch?: boolean;
    ignoreVary?: boolean;
  }

  interface ExtendableEvent extends Event {
    waitUntil(f: Promise<any>): void;
  }

  type WorkerType = 'classic' | 'module';

  interface Worker extends EventTarget {
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
    postMessage(message: any, transfer: Transferable[]): void;
    postMessage(message: any, options?: StructuredSerializeOptions): void;
    terminate(): void;
  }
}

export {};