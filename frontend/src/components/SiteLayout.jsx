import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert } from "./Shared.jsx";

export default function SiteLayout({ children }) {
  const { user, signOut, connectionError } = useAuth();
  return (
    <>
      <header className="site-header">
        <div className="nav-wrap">
          <Link className="brand" to="/">GiG <span>Matrix</span></Link>
          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/jobs">Browse jobs</NavLink>
            {user && <NavLink to="/messages">Messages</NavLink>}
            {user && <NavLink to="/profile">Profile</NavLink>}
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <span className="nav-user">{user.username}</span>
                <button className="button button-quiet" onClick={signOut}>Log out</button>
              </>
            ) : (
              <>
                <Link className="button button-quiet" to="/login">Log in</Link>
                <Link className="button button-primary small" to="/signup">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="page-shell">
        {connectionError && <Alert error={connectionError} />}
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div><Link className="brand" to="/">GiG <span>Matrix</span></Link><p>Connecting businesses with independent talent.</p></div>
          <div className="footer-links"><Link to="/jobs">Find work</Link><Link to="/signup">Join the community</Link></div>
          <small>© {new Date().getFullYear()} GiG Matrix</small>
        </div>
      </footer>
    </>
  );
}
