import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";

const AccountMenu = ({ profile }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <FaUserCircle
        size={38}
        color="#2563EB"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen(true)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={styles.modalBackdrop}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()} // prevent closing on modal click
            >
              <h2 style={styles.title}>Patient Details</h2>

              {profile ? (
                <div style={styles.detailsBox}>
                  <p><strong>Name:</strong> {profile.name || "N/A"}</p>
                  <p><strong>Email:</strong> {profile.email || "N/A"}</p>
                  <p><strong>Age:</strong> {profile.age || "N/A"}</p>
                  <p><strong>Gender:</strong> {profile.gender || "N/A"}</p>
                  <p><strong>Height:</strong> {profile.height ? `${profile.height} cm` : "N/A"}</p>
                  <p><strong>Weight:</strong> {profile.weight ? `${profile.weight} kg` : "N/A"}</p>
                  <p><strong>Allergies:</strong> {profile.allergies || "None"}</p>
                </div>
              ) : (
                <p style={{ color: "#64748B" }}>Loading profile...</p>
              )}

              <button style={styles.closeButton} onClick={() => setOpen(false)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// === Styles ===
const styles = {
  modalBackdrop: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "25px 30px",
    width: "400px",
    maxWidth: "90vw",
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: "15px",
    textAlign: "center",
  },
  detailsBox: {
    color: "#0F172A",
    lineHeight: "1.8",
    marginBottom: "20px",
  },
  closeButton: {
    backgroundColor: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "1rem",
    cursor: "pointer",
    display: "block",
    margin: "0 auto",
  },
};

export default AccountMenu;
