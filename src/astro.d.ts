/// <reference types="astro/astro-jsx" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 