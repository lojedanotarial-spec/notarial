import { Component } from "react";
import { logError } from "../utils/logger";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logError("react_boundary", error.message, {
      stack: error.stack,
      screen: this.props.screen,
      context: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#f0ece3", gap: 16, padding: 24,
        }}>
          <div style={{
            fontSize: 48, lineHeight: 1,
          }}>⚠️</div>
          <div style={{
            fontFamily: "'Merriweather', serif", fontSize: 20,
            color: "#1a2332", textAlign: "center",
          }}>
            Algo salió mal
          </div>
          <div style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: 13,
            color: "rgba(26,35,50,.6)", textAlign: "center", maxWidth: 340, lineHeight: 1.6,
          }}>
            {this.state.error?.message || "Error inesperado"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 8,
              border: "none", background: "#1a2332", color: "#fdfcfa",
              fontFamily: "'Montserrat', sans-serif", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
