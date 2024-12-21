// Import PhotoSwipe's own types
import type { PreparedPhotoSwipeOptions } from 'photoswipe';

export interface PhotoSwipeItem {
  element?: Element;
  html?: string;
  src?: string;
  width: number;
  height: number;
  caption?: string;
  alt?: string;
}

// Use PhotoSwipe's own options type as a base
export type PhotoSwipeOptions = Partial<PreparedPhotoSwipeOptions> & {
  dataSource: PhotoSwipeItem[];
};

export interface PhotoSwipeUI {
  registerElement: (options: PhotoSwipeUIElementOptions) => void;
}

export interface PhotoSwipeUIElementOptions {
  name: string;
  order: number;
  isButton: boolean;
  appendTo: 'wrapper' | 'root' | 'bar';
  html?: string;
  onInit: (el: HTMLElement, pswp: any) => void;
}

export interface PhotoSwipeSlide {
  content: {
    element: Element;
  };
  data: {
    caption?: string;
  };
}

export interface PhotoSwipe {
  ui?: PhotoSwipeUI;
  currSlide?: PhotoSwipeSlide;
  on: (event: string, callback: () => void) => void;
  init: () => void;
}