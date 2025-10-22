import React, { useState} from "react";
import MatchPreview from "./MatchPreview";

export default function PredictionPanel() {
    const [fixtureId, setFixtureId] = useState("");
    const [submittedId, setSubmittedId] = useState(null);
    const [showHelp, setShowHelp] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (fixtureId.trim()) {
            setSubmittedId(fixtureId.trim());
            setShowHelp(false);
        }
    };

    return (
        <div style ={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom:20 }}>
            <h3> Predict Any Match</h3>
            <form onSubmit={handleSubmit} style={{ marginBottom: 10 }}>
                <input
                    type = "text"
                    placeholder="Enter fixture ID"
                    value={fixtureId}
                    onChange={(e) => setFixtureId(e.target.value)}
                    style={{
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        width: "65%",
                        marginRight: 8,
                    }}
                />
                <button
                    type="submit"
                    style ={{
                        background: "#1976d2",
                        color: "white",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                    }}
                >
                    Get Preview
                </button>
                {/* <button
                    type="button"
                    style={{
                        marginLeft: 8,
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "#f0f0f0",
                    }}
                    onClick={() => setShowHelp(!ShowHelp)}
                > ?</button> */}
            </form>

            {showHelp && (
                <p style={{ fontSize: 14, color: "#555" }}>
                    Enter a fixture ID to get a full model preview.
                </p>
            )}

            {submittedId && (
                <div style={{ marginTop: 20 }}>
                    <MatchPreview fixtureId={submittedId} />
                </div>
            )}
        </div>);
}