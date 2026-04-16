# -*- coding: utf-8 -*-
"""
fix_app.py
Ejecutar desde la raiz de notarial-v2:
    python fix_app.py
"""
import pathlib

p = pathlib.Path("src/App.jsx")

content = (
    "import { useState } from \"react\";\n"
    "import { HomeScreen }     from \"./screens/HomeScreen\";\n"
    "import { SelectorScreen } from \"./screens/SelectorScreen\";\n"
    "import { EditorScreen }   from \"./screens/EditorScreen\";\n"
    "\n"
    "const globalStyles = [\n"
    "  \"@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');\",\n"
    "  \"*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\",\n"
    "  \"html, body, #root { height: 100%; overflow: hidden; }\",\n"
    "  \"body { background: #f0ece3; font-family: 'Montserrat', sans-serif; }\",\n"
    "  \"[contenteditable]:focus { outline: none; }\",\n"
    "  \"::-webkit-scrollbar { width: 6px; }\",\n"
    "  \"::-webkit-scrollbar-track { background: transparent; }\",\n"
    "  \"::-webkit-scrollbar-thumb { background: rgba(26,35,50,.2); border-radius: 3px; }\",\n"
    "].join(\"\\n\");\n"
    "\n"
    "export default function App() {\n"
    "  const [screen, setScreen] = useState(\"home\");\n"
    "  return (\n"
    "    <>\n"
    "      <style>{globalStyles}</style>\n"
    "      {screen === \"home\"     && <HomeScreen     onGo={setScreen} />}\n"
    "      {screen === \"selector\" && <SelectorScreen onGo={setScreen} />}\n"
    "      {screen === \"editor\"   && <EditorScreen   onGo={setScreen} />}\n"
    "    </>\n"
    "  );\n"
    "}\n"
)

p.write_text(content, encoding="utf-8")
print("OK  src/App.jsx corregido")
