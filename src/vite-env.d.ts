/// <reference types="vite/client" />

declare global {
  interface Window {
    $electron?: boolean;
  }
}

export {};
