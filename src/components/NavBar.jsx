import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";
import { useAuth } from "../components/AuthGate"; // <-- make sure AuthGate is set up & wrapped at App root

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        {/* Logo */}
        <Link to="/" className={styles.navbarLogo} onClick={closeMenu}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
          Logie’s Edges
        </Link>

        {/* Hamburger */}
        <button
          className={styles.menuIcon}
          onClick={toggleMenu}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>

        {/* Links */}
        <ul className={`${styles.navMenu} ${menuOpen ? styles.navMenuActive : ""}`}>
          <li>
            <NavLink to="/" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Dashboard
            </NavLink>
          </li>

          <li>
            <NavLink to="/fixtures" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Fixtures
            </NavLink>
          </li>

          {/* Sports dropdown */}
          <li className={styles.dropdown}>
            <span>Sports ▾</span>
            <ul className={styles.dropdownContent} onClick={closeMenu}>
              <li>
                <NavLink to="/football"
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  Football
                </NavLink>
              </li>
              <li>
                {/* Route is /basketball in your App.jsx */}
                <NavLink to="/basketball"
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  NBA
                </NavLink>
              </li>
              <li>
                <NavLink to="/nhl"
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  NHL
                </NavLink>
              </li>
              <li>
                <NavLink to="/nfl"
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  NFL
                </NavLink>
              </li>
              <li>
                <NavLink to="/cfb"
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  CFB
                </NavLink>
              </li>
            </ul>
          </li>

          <li>
            <NavLink to="/performance" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Performance
            </NavLink>
          </li>

          <li>
            <NavLink to="/bets" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Bets
            </NavLink>
          </li>

          {/* Tipsters directory */}
          <li>
            <NavLink to="/tipsters" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Tipsters <span className={styles.newBadge}>NEW</span>
            </NavLink>
          </li>

          {/* Right-side auth / CTA */}
          {user ? (
            <>
              <li>
                <NavLink to="/tipsters/become" onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  Become a Tipster
                </NavLink>
              </li>
              <li>
                <button onClick={() => { logout(); closeMenu(); }}
                        className={styles.linkButton}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink to="/login" onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}>
                  Sign Up
                </NavLink>
              </li>
            </>
          )}

          <li>
            <NavLink to="/about" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              About
            </NavLink>
          </li>

          <li>
            <NavLink to="/contact" onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}>
              Contact Us
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}