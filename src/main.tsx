import React from "react";
import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App'
import './utils/debuggerTest' // Load debugger test utility

// previewModeが未定義の場合のフォールバック
if (typeof window.previewMode === 'undefined') {
  console.warn('previewMode was undefined, setting default value to false');
  (window as any).previewMode = false;
}

// グローバルエラーハンドラーを追加
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });

  // previewMode関連のエラーを特定
  if (event.message && event.message.includes('previewMode')) {
    console.error('previewMode error detected!', event.error?.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
