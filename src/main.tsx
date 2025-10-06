import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
// Usunięto import "./styles/background.css";

createRoot(document.getElementById("root")!).render(<App />);