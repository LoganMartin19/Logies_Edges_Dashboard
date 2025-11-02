import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <img src="/logo192.png" alt="Logo" className="logo" />
          Logie’s Edges
        </Link>

        {/* Hamburger menu icon */}
        <div className="menu-icon" onClick={toggleMenu}>
          <div className={`bar ${menuOpen ? "open" : ""}`}></div>
          <div className={`bar ${menuOpen ? "open" : ""}`}></div>
          <div className={`bar ${menuOpen ? "open" : ""}`}></div>
        </div>

        {/* Main nav links */}
        <ul className={`nav-menu ${menuOpen ? "active" : ""}`}>
          <li>
            <NavLink to="/" onClick={closeMenu}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/fixtures" onClick={closeMenu}>
              Fixtures
            </NavLink>
          </li>
          <li className="dropdown">
            <span>Sports ▾</span>
            <ul className="dropdown-content">
              <li>
                <NavLink to="/football" onClick={closeMenu}>
                  Football
                </NavLink>
              </li>
              <li>
                <NavLink to="/nba" onClick={closeMenu}>
                  NBA
                </NavLink>
              </li>
              <li>
                <NavLink to="/nhl" onClick={closeMenu}>
                  NHL
                </NavLink>
              </li>
              <li>
                <NavLink to="/nfl" onClick={closeMenu}>
                  NFL
                </NavLink>
              </li>
              <li>
                <NavLink to="/cfb" onClick={closeMenu}>
                  CFB
                </NavLink>
              </li>
            </ul>
          </li>
          <li>
            <NavLink to="/performance" onClick={closeMenu}>
              Performance
            </NavLink>
          </li>
          <li>
            <NavLink to="/bets" onClick={closeMenu}>
              Bets
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" onClick={closeMenu}>
              About
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact" onClick={closeMenu}>
              Contact Us
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}