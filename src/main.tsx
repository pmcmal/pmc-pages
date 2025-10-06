import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./styles/background.css"; // Import nowego pliku CSS

createRoot(document.getElementById("root")!).render(<App />);