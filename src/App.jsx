import { useState } from "react";
import { HomeScreen }     from "./screens/HomeScreen";
import { SelectorScreen } from "./screens/SelectorScreen";
import { BulkScreen  }   from "./screens/BulkScreen";

const globalStyles = [
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  "html, body, #root { height: 100%; overflow: hidden; }",
  "body { background: #f0ece3; font-family: 'Montserrat', sans-serif; }",
  "[contenteditable]:focus { outline: none; }",
  "::-webkit-scrollbar { width: 6px; }",
  "::-webkit-scrollbar-track { background: transparent; }",
  "::-webkit-scrollbar-thumb { background: rgba(26,35,50,.2); border-radius: 3px; }",
  "@media print {",
  "  body { background: white !important; overflow: visible !important; }",
  "  html, body, #root { height: auto !important; overflow: visible !important; }",
  "  .no-print { display: none !important; }",
  "  .print-page { box-shadow: none !important; margin: 0 !important; }",
  "  @page { size: A4; margin: 0; }",
  "}",
].join("\n");

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});

  const handleGo = (targetScreen, targetParams = {}) => {
    setParams(targetParams);
    setScreen(targetScreen);
  };

  return (
    <>
      <style>{globalStyles}</style>
      {screen === "home"     && <HomeScreen     onGo={handleGo} />}
      {screen === "selector" && <SelectorScreen onGo={handleGo} />}
      {screen === "editor"   && <EditorScreen   onGo={handleGo} params={params} />}
      {screen === "bulk" && <BulkScreen onGo={handleGo} />}
    </>
  );
}
