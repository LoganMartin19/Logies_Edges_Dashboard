// src/components/NavBar.jsx
import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "../styles/NavBar.module.css";
import { useAuth } from "../components/AuthGate";
import { fetchMyTipster } from "../api";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [myTipster, setMyTipster] = useState(null);

  // from AuthGate
  const { firebaseUser, isPremium, isAdmin, initializing, logout } = useAuth();

  useEffect(() => {
    if (firebaseUser) {
      fetchMyTipster()
        .then(setMyTipster)
        .catch(() => setMyTipster(null));
    } else {
      setMyTipster(null);
    }
  }, [firebaseUser]);

  const toggleMenu = () =>
    setMenuOpen((p) => {
      const next = !p;
      if (!next) {
        setSportsOpen(false);
        setUserMenuOpen(false);
      }
      return next;
    });

  const closeMenu = () => {
    setMenuOpen(false);
    setSportsOpen(false);
    setUserMenuOpen(false);
  };

  const toggleSports = () => setSportsOpen((p) => !p);
  const toggleUserMenu = () => setUserMenuOpen((p) => !p);

  const displayInitial =
    (firebaseUser?.displayName && firebaseUser.displayName[0]) ||
    (firebaseUser?.email && firebaseUser.email[0]) ||
    "U";

  // 👇 NEW: choose best avatar source
  const avatarUrl =
    myTipster?.avatar_url ||
    firebaseUser?.photoURL ||
    null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <Link to="/" className={styles.navbarLogo} onClick={closeMenu}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
          Chartered
          <br />
          Sports
          <br />
          Betting
        </Link>

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

          {/* SPORTS DROPDOWN */}
          <li
            className={`${styles.dropdown} ${
              sportsOpen ? styles.dropdownOpen : ""
            }`}
          >
            <button
              type="button"
              className={styles.dropdownToggle}
              onClick={toggleSports}
            >
              Sports ▾
            </button>
            <ul className={styles.dropdownContent} onClick={closeMenu}>
              <li>
                <NavLink
                  to="/football"
                  className={({ isActive }) =>
                    isActive ? styles.active : ""
                  }
                >
                  Football
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/basketball"
                  className={({ isActive }) =>
                    isActive ? styles.active : ""
                  }
                >
                  NBA
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nhl"
                  className={({ isActive }) =>
                    isActive ? styles.active : ""
                  }
                >
                  NHL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/nfl"
                  className={({ isActive }) =>
                    isActive ? styles.active : ""
                  }
                >
                  NFL
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/cfb"
                  className={({ isActive }) =>
                    isActive ? styles.active : ""
                  }
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
              to="/tipsters"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Tipsters <span className={styles.newBadge}>NEW</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/following"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              Following
            </NavLink>
          </li>

          {/* Premium */}
          <li>
            <NavLink
              to="/premium"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              {isPremium ? "Premium ✅" : "Premium"}
            </NavLink>
          </li>

          {/* Admin */}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? styles.active : "")}
              >
                Admin
              </NavLink>
            </li>
          )}

          {/* Right side auth */}
          {!initializing &&
            (firebaseUser ? (
              <li
                className={`${styles.dropdown} ${
                  userMenuOpen ? styles.dropdownOpen : ""
                }`}
              >
                <button
                  type="button"
                  className={styles.dropdownToggleUser}
                  onClick={toggleUserMenu}
                >
                  <span className={styles.avatarCircle}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="User avatar"
                        className={styles.avatarImg}
                      />
                    ) : (
                      displayInitial
                    )}
                  </span>
                  <span className={styles.caret}>▾</span>
                </button>
                <ul className={styles.dropdownContent} onClick={closeMenu}>
                  <li>
                    <NavLink
                      to="/account"
                      className={({ isActive }) =>
                        isActive ? styles.active : ""
                      }
                    >
                      Profile &amp; Settings
                    </NavLink>
                  </li>

                  <li>
                    <NavLink
                      to="/following"
                      className={({ isActive }) =>
                        isActive ? styles.active : ""
                      }
                    >
                      Following feed
                    </NavLink>
                  </li>

                  <li>
                    <NavLink
                      to="/premium"
                      className={({ isActive }) =>
                        isActive ? styles.active : ""
                      }
                    >
                      Premium &amp; Billing
                    </NavLink>
                  </li>

                  {isAdmin && (
                    <>
                      <li>
                        <NavLink
                          to="/admin"
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          Admin dashboard
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/admin/picks"
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          Featured picks admin
                        </NavLink>
                      </li>
                    </>
                  )}

                  {myTipster ? (
                    <>
                      <li>
                        <NavLink
                          to={`/tipsters/${myTipster.username}`}
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          My tipster page
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to={`/tipsters/${myTipster.username}/edit`}
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          Edit tipster profile
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to={`/tipsters/${myTipster.username}/new-pick`}
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          Add pick
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to={`/tipsters/${myTipster.username}/new-acca`}
                          className={({ isActive }) =>
                            isActive ? styles.active : ""
                          }
                        >
                          New Acca
                        </NavLink>
                      </li>
                    </>
                  ) : (
                    <li>
                      <NavLink
                        to="/tipsters/become"
                        className={({ isActive }) =>
                          isActive ? styles.active : ""
                        }
                      >
                        Become a Tipster
                      </NavLink>
                    </li>
                  )}

                  <li>
                    <button
                      className={styles.linkButton}
                      onClick={() => {
                        logout();
                        closeMenu();
                      }}
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              <>
                <li>
                  <NavLink
                    to="/login"
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      isActive ? styles.active : ""
                    }
                  >
                    Login
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/signup"
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      isActive ? styles.active : ""
                    }
                  >
                    Sign Up
                  </NavLink>
                </li>
              </>
            ))}

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