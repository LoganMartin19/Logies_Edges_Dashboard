import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";

const NavBar = () => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <nav className={styles.navbar}>
      {/* Logo → Dashboard */}
      <NavLink to="/" className={styles.logo} onClick={close}>
        <img src="/logo.png" alt="Logie's Edges Logo" />
      </NavLink>

      <div className={styles.links}>
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          onClick={close}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/fixtures"
          className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          onClick={close}
        >
          Fixtures
        </NavLink>

        {/* SPORTS DROPDOWN */}
        <div
          className={styles.dropdown}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            className={styles.dropdownToggle}
            aria-haspopup="menu"
            aria-expanded={open ? "true" : "false"}
          >
            Sports ▾
          </button>

          {open && (
            <div className={styles.dropdownMenu} role="menu">
              <NavLink to="/football" className={styles.dropdownItem} onClick={close}>
                Football (Soccer)
              </NavLink>
              <NavLink to="/cfb" className={styles.dropdownItem} onClick={close}>
                College Football
              </NavLink>
              <NavLink to="/nhl" className={styles.dropdownItem} onClick={close}>
                NHL
              </NavLink>
              <NavLink to="/nfl" className={styles.dropdownItem} onClick={close}>
                NFL
              </NavLink>
              {/* Hide Tennis if not implemented to avoid errors */}
              {/* <NavLink to="/tennis" className={styles.dropdownItem} onClick={close}>Tennis</NavLink> */}
              <NavLink to="/basketball" className={styles.dropdownItem} onClick={close}>
                Basketball
              </NavLink>
            </div>
          )}
        </div>

        <NavLink
          to="/bets"
          className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          onClick={close}
        >
          Bets
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          onClick={close}
        >
          About Us
        </NavLink>

        <NavLink
          to="/contact"
          className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          onClick={close}
        >
          Contact Us
        </NavLink>
      </div>
    </nav>
  );
};

export default NavBar;