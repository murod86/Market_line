import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const path = window.location.pathname;
    if (path.startsWith('/dealer-portal')) {
      navigator.serviceWorker.register('/dealer-sw.js', { scope: '/dealer-portal' }).catch(() => {});
    } else if (path.startsWith('/portal')) {
      navigator.serviceWorker.register('/sw.js', { scope: '/portal' }).catch(() => {});
    } else {
      navigator.serviceWorker.register('/admin-sw.js').catch(() => {});
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
