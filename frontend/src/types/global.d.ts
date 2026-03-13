// Global type declarations for Docker build compatibility

declare global {
  // Fix for missing DOM types in Docker environment
  interface ImageData {
    readonly data: Uint8ClampedArray;
    readonly height: number;
    readonly width: number;
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
}

export {};