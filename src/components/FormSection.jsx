// src/components/FormSection.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // ✅ env-based axios client

const FormSection = ({ fixtureId }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const { data } = await api.get("/form/fixture", {
          params: { fixture_id: fixtureId, n: 5 },
          responseType: "text", // explicitly request text
        });
        setHtml(data);
      } catch (err) {
        console.error("Form fetch failed:", err);
        setHtml("<p style='color:#c00'>Failed to load form data.</p>");
      }
    };
    fetchForm();
  }, [fixtureId]);

  return (
    <div className="card">
      <h3>Team Form</h3>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default FormSection;