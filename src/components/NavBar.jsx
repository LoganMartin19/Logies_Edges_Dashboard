import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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

        {/* Hamburger Menu Icon */}
        <div className={styles.menuIcon} onClick={toggleMenu}>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
        </div>

        {/* Main Nav Links */}
        <ul
          className={`${styles.navMenu} ${
            menuOpen ? styles.navMenuActive : ""
          }`}
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

          {/* Dropdown */}
          <li className={styles.dropdown}>
            <span>Sports ▾</span>
            <ul className={styles.dropdownContent}>
              <li>
                <NavLink
                  to="/football"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  Football
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nba"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NBA
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nhl"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NHL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nfl"
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? styles.active : "")}
                >
                  NFL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/cfb"
                  onClick={closeMenu}
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