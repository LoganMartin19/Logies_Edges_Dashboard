import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";
import { useAuth } from "../components/AuthGate";
import { fetchMyTipster } from "../api";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [myTipster, setMyTipster] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) { setMyTipster(null); return; }
    fetchMyTipster().then(setMyTipster).catch(() => setMyTipster(null));
  }, [user]);

  const toggleMenu = () => setMenuOpen(p => !p);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <Link to="/" className={styles.navbarLogo} onClick={closeMenu}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
          Logie’s Edges
        </Link>

        <button className={styles.menuIcon} onClick={toggleMenu}
                aria-label="Toggle navigation" aria-expanded={menuOpen}>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>

        <ul className={`${styles.navMenu} ${menuOpen ? styles.navMenuActive : ""}`}>
          <li><NavLink to="/" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>Dashboard</NavLink></li>
          <li><NavLink to="/fixtures" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>Fixtures</NavLink></li>

          <li className={styles.dropdown}>
            <span>Sports ▾</span>
            <ul className={styles.dropdownContent} onClick={closeMenu}>
              <li><NavLink to="/football" className={({isActive}) => (isActive ? styles.active : "")}>Football</NavLink></li>
              <li><NavLink to="/basketball" className={({isActive}) => (isActive ? styles.active : "")}>NBA</NavLink></li>
              <li><NavLink to="/nhl" className={({isActive}) => (isActive ? styles.active : "")}>NHL</NavLink></li>
              <li><NavLink to="/nfl" className={({isActive}) => (isActive ? styles.active : "")}>NFL</NavLink></li>
              <li><NavLink to="/cfb" className={({isActive}) => (isActive ? styles.active : "")}>CFB</NavLink></li>
            </ul>
          </li>

          <li><NavLink to="/performance" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>Performance</NavLink></li>
          <li><NavLink to="/bets" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>Bets</NavLink></li>
          <li><NavLink to="/tipsters" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>
                Tipsters <span className={styles.newBadge}>NEW</span>
              </NavLink>
          </li>

          {user ? (
            <>
              {myTipster ? (
                // Profile mini-menu when you ARE a tipster
                <li className={styles.dropdown}>
                  <span>Profile ▾</span>
                  <ul className={styles.dropdownContent} onClick={closeMenu}>
                    <li><NavLink to={`/tipsters/${myTipster.username}`}
                                 className={({isActive}) => (isActive ? styles.active : "")}>
                      My tipster page
                    </NavLink></li>
                    <li><NavLink to={`/tipsters/${myTipster.username}/new-pick`}
                                 className={({isActive}) => (isActive ? styles.active : "")}>
                      Add pick
                    </NavLink></li>
                    <li><button className={styles.linkButton} onClick={() => { logout(); closeMenu(); }}>
                      Logout
                    </button></li>
                  </ul>
                </li>
              ) : (
                // CTA when you are logged in but not a tipster yet
                <li>
                  <NavLink to="/tipsters/become" onClick={closeMenu}
                           className={({isActive}) => (isActive ? styles.active : "")}>
                    Become a Tipster
                  </NavLink>
                </li>
              )}
            </>
          ) : (
            <>
              <li><NavLink to="/login" onClick={closeMenu}
                    className={({isActive}) => (isActive ? styles.active : "")}>Login</NavLink></li>
              <li><NavLink to="/signup" onClick={closeMenu}
                    className={({isActive}) => (isActive ? styles.active : "")}>Sign Up</NavLink></li>
            </>
          )}

          <li><NavLink to="/about" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>About</NavLink></li>
          <li><NavLink to="/contact" onClick={closeMenu}
                className={({isActive}) => (isActive ? styles.active : "")}>Contact Us</NavLink></li>
        </ul>
      </div>
    </nav>
  );
}