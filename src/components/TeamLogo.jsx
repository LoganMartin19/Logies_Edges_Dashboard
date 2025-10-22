// src/components/TeamLogo.jsx
import React from "react";
import styles from "../styles/TeamLogo.module.css";

// simple slugify: lowercase, replace spaces/slashes with _
const slugify = (name) =>
  name.toLowerCase().replace(/[\s/]+/g, "_");

const TeamLogo = ({ team, size = 32 }) => {
  const slug = slugify(team);
  const src = `${process.env.PUBLIC_URL}/logos/${slug}.png`;

  return (
    <img
      src={src}
      alt={team}
      className={styles.logo}
      style={{ width: size, height: size }}
      onError={(e) => {
        e.target.src = `${process.env.PUBLIC_URL}/logos/fallback.png`; // optional
      }}
    />
  );
};

export default TeamLogo;