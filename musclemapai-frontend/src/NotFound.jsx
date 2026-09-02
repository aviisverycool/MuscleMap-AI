import { useEffect } from "react";
import { Link } from "react-router-dom";
import bg from "./background-minimal.png";

export default function NotFound() {
  useEffect(() => {
    let theme = "dark";
    try {
      theme = localStorage.getItem("musclemap-theme") || "dark";
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <div className="page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="auth-card notfound-card">
        <div className="notfound-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link className="auth-primary notfound-link" to="/">
          Back to MuscleMap AI
        </Link>
      </div>
    </div>
  );
}
