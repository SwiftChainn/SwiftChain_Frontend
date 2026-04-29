import '@testing-library/jest-dom';

// ResizeObserver is not available in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollIntoView is not available in jsdom — required by cmdk
Element.prototype.scrollIntoView = jest.fn();