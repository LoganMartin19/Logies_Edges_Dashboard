import React, { useEffect, useState } from "react";

const FormSection = ({ fixtureId }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/form/fixture?fixture_id=${fixtureId}&n=5`)
      .then((res) => res.text())
      .then(setHtml)
      .catch((err) => console.error("Form fetch failed:", err));
  }, [fixtureId]);

  return (
    <div className="card">
      <h3>Team Form</h3>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default FormSection;