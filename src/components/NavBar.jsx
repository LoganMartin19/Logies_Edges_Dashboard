// src/components/NavBar.jsx
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";
import { useAuth } from "../components/AuthGate";

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
          aria-controls="main-menu"
          type="button"
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>

        {/* Backdrop for mobile (click to close) */}
        {menuOpen && <div className={styles.backdrop} onClick={closeMenu} />}

        {/* Main Nav */}
        <ul
          id="main-menu"
          className={`${styles.navMenu} ${menuOpen ? styles.navMenuActive : ""}`}
        >
          <li>
            <NavLink
              to="/"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Dashboard
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/fixtures"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Fixtures
            </NavLink>
          </li>

          {/* Sports dropdown */}
          <li className={styles.dropdown}>
            <span>Sports ▾</span>
            <ul className={styles.dropdownContent} onClick={closeMenu}>
              <li>
                <NavLink
                  to="/football"
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  Football
                </NavLink>
              </li>
              <li>
                {/* Route is /basketball */}
                <NavLink
                  to="/basketball"
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NBA
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nhl"
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NHL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nfl"
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NFL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/cfb"
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  CFB
                </NavLink>
              </li>
            </ul>
          </li>

          <li>
            <NavLink
              to="/performance"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Performance
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/bets"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Bets
            </NavLink>
          </li>

          {/* Tipsters directory */}
          <li>
            <NavLink
              to="/tipsters"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Tipsters <span className={styles.newBadge}>NEW</span>
            </NavLink>
          </li>

          {/* Auth area */}
          {user ? (
            <>
              <li>
                {/* 🔧 Route fix: singular to match App.jsx (/tipsters/become) */}
                <NavLink
                  to="/tipsters/become"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  Become a Tipster
                </NavLink>
              </li>
              <li>
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className={styles.linkButton}
                  type="button"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink
                  to="/login"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/signup"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  Sign Up
                </NavLink>
              </li>
            </>
          )}

          <li>
            <NavLink
              to="/about"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              About
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/contact"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Contact Us
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}