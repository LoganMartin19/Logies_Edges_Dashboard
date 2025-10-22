// src/components/EventsSection.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";

const EventsSection = ({ fixtureId }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/football/events?fixture_id=${fixtureId}`
        );
        const json = await res.json();
        setEvents(json?.response || []);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    };
    fetchEvents();
  }, [fixtureId]);

  if (!events.length) return <p>No match events available.</p>;

  return (
    <div className={styles.tabContent}>
      <h3>Match Events</h3>
      <ul>
        {events.map((e, i) => (
          <li key={i}>
            {e.time?.elapsed}' — {e.team?.name} — {e.player?.name}{" "}
            <b>{e.type} {e.detail}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventsSection;