// src/pages/ContactPage.jsx
import React from "react";
import SiteFooterDisclaimer from "../components/SiteFooterDisclaimer";

const ContactPage = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Contact Us</h2>
      <p>Email: admin@charteredsportsbetting.com</p>
      <p>Twitter/X: @CharteredSB</p>
      <SiteFooterDisclaimer variant="short" />
    </div>
  );
};

export default ContactPage;