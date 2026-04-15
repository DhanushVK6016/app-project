import React, { useEffect, useState, useRef } from "react"; // Added useRef
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, update, push } from "firebase/database";
import { Line } from "react-chartjs-2";
import { Button, Modal, Tab, Tabs } from "react-bootstrap";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas'; // Added html2canvas
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PRIMARY = "#2563EB";
const SUCCESS = "#10B981"; // Using a nicer green for success buttons

// --- SIMULATED DATA TO MATCH IMAGE STATE ---
const simulatedUserData = {
  email: "jk@gmail.com",
  vitals: {
    heartRate: 0,
    spo2: 0,
    // Using an average temperature from the images (87-90)
    temperature: 88.3625, 
    glucose: "0.000",
  },
  // Added placeholder profile data to ensure PDF has content
  profile: {
    name: "jinath",
    phone: "6374504344",
    age: "55",
    gender: "male",
    height: "160",
    weight: "75",
    allergies: "dust",
  },
  medicalHistory: {
    'm1': { date: '2024-05-01', note: 'Routine checkup. Advised on diet.' },
  }
};
// ---------------------------------------------


// --- UTILITY FUNCTIONS ---

/**
 * Formats temperature and converts C to F if necessary.
 */
const formatTemperature = (tempC, decimals = 3) => {
  const t = Number(tempC);
  if (tempC === null || tempC === undefined || isNaN(t)) return "N/A";
  
  if (t === 0) return t.toFixed(decimals); 
  
  // Assume Fahrenheit if > 60 (which all images show)
  if (t > 60) return t.toFixed(decimals); 
  
  // Fallback conversion for C to F
  if (t >= 20 && t <= 50) {
    const tempF = (t * 9) / 5 + 32;
    return tempF.toFixed(decimals);
  }
  
  return t.toFixed(decimals);
};


// --- PDF GENERATION LOGIC (Hospital Report) ---

const generateHospitalReport = async (data, ecgRef) => {
    const { profile, vitals, medicalHistory, email } = data;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 10; 
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(PRIMARY);
    doc.text("PulsePal Health Report", 105, y, null, null, 'center');
    y += 15;

    // Patient Details Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Patient Information:", 15, y);
    y += 5;
    
    doc.setFontSize(10);
    doc.text(`Name: ${profile.name || 'N/A'}`, 15, y);
    doc.text(`Email: ${email || 'N/A'}`, 100, y);
    y += 5;
    doc.text(`Age: ${profile.age || 'N/A'}`, 15, y);
    doc.text(`Gender: ${profile.gender || 'N/A'}`, 100, y);
    y += 5;
    doc.text(`Phone: ${profile.phone || 'N/A'}`, 15, y);
    doc.text(`Allergies: ${profile.allergies || 'None'}`, 100, y);
    y += 10;
    
    // Vitals Table Section
    doc.setFontSize(14);
    doc.text("Current Vital Signs:", 15, y);
    y += 5;
    
    const vitalsData = [
        ["Heart Rate", Math.round(vitals.heartRate ?? 0), "bpm"],
        ["SpO₂", Math.round(vitals.spo2 ?? 0), "%"],
        ["Temperature", formatTemperature(vitals.temperature ?? 0, 3), "°F"], 
        ["Glucose", Number(vitals.glucose ?? 0).toFixed(3), "mg/dL"],
        ["Diagnosis", vitals.diagnosis || 'N/A', ''], 
    ];

    vitalsData.forEach(([label, value, unit]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${value} ${unit}`, 50, y);
        y += 5;
    });

    y += 10;
    
    // Medical History/Notes Section
    doc.setFontSize(14);
    doc.text("Medical History Notes:", 15, y);
    y += 5;
    
    const historyEntries = Object.values(medicalHistory || {}).map(item => ({
        ...item,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (historyEntries.length > 0) {
        historyEntries.slice(0, 3).forEach((item, index) => { 
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Date ${index + 1}: ${item.date || "N/A"}`, 15, y);
            doc.setFont('helvetica', 'normal');
            
            const noteText = `Note/Procedure: ${item.note || "N/A"}`;
            const splitText = doc.splitTextToSize(noteText, 180);
            doc.text(splitText, 15, y + 5);
            y += (splitText.length * 5) + 5;
            if (y > 250) { doc.addPage(); y = 15; }
        });
    } else {
        doc.setFontSize(10);
        doc.text("No medical history records found.", 15, y);
        y += 10;
    }
    
    // ECG Snapshot Section
    if (ecgRef.current) {
        if (y > 200) { doc.addPage(); y = 15; }
        doc.setFontSize(14);
        doc.text("ECG Waveform Snapshot", 15, y);
        y += 5;

        // Ensure ECG is visible before trying to render
        const canvas = await html2canvas(ecgRef.current, { scale: 2, backgroundColor: '#FFFFFF', logging: false });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width; 
        doc.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
    }
    
    doc.save(`Vitals_Report_${profile.name || 'Patient'}_${new Date().toISOString().slice(0, 10)}.pdf`);
};


const Dashboard = () => {
  const auth = getAuth();
  const db = getDatabase();

  // 1. STATE & REFS
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(simulatedUserData);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [showECG, setShowECG] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showDoctors, setShowDoctors] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const ecgGraphRef = useRef(null); // Ref for the ECG chart DOM element

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    allergies: "",
  });
  const [newHistory, setNewHistory] = useState({ date: "", note: "" });

  // 2. DATA FETCHING
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u || null);
    });
    return () => unsubAuth();
  }, [auth]);

  useEffect(() => {
    if (!currentUser) {
      setUserData(simulatedUserData);
      setLoadingUserData(false);
      return;
    }

    setLoadingUserData(true);
    const userRef = ref(db, `users/${currentUser.uid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        // Merge real data with simulated vitals/profile to ensure chart data and structure exist
        setUserData({ 
            ...simulatedUserData, 
            ...val, 
            vitals: { 
                ...simulatedUserData.vitals, 
                ...val.vitals 
            }, 
            profile: {
                ...simulatedUserData.profile,
                ...val.profile
            },
            email: currentUser.email // Use actual email
        });

        // when not editing, keep form in sync
        if (!editMode) {
          setProfileForm({
            name: val?.profile?.name || val?.name || "",
            phone: val?.profile?.phone || "",
            age: val?.profile?.age || "",
            gender: val?.profile?.gender || "",
            height: val?.profile?.height || "",
            weight: val?.profile?.weight || "",
            allergies: val?.profile?.allergies || "",
          });
        }
      } else {
        setUserData(simulatedUserData);
      }
      setLoadingUserData(false);
    });

    return () => unsub();
  }, [currentUser, db, editMode]);

  // 3. HANDLERS
  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/auth";
  };

  const handleProfileSave = async () => {
    if (!currentUser) return alert("Not signed in.");
    try {
      await update(ref(db, `users/${currentUser.uid}/profile`), profileForm);
      setEditMode(false);
      alert("Profile saved.");
    } catch (err) {
      console.error("save profile err:", err);
      alert("Failed to save profile.");
    }
  };

  const handleAddHistory = async () => {
    if (!currentUser) return alert("Not signed in.");
    if (!newHistory.date || !newHistory.note) return alert("Please add date and note.");
    try {
      const historyRef = ref(db, `users/${currentUser.uid}/medicalHistory`);
      await push(historyRef, newHistory);
      setNewHistory({ date: "", note: "" });
      alert("Medical history added.");
    } catch (err) {
      console.error("add history err:", err);
      alert("Failed to add history.");
    }
  };

  // NEW PDF HANDLER (Calls the full hospital report function)
  const handleDownloadPDF = () => {
    // If ECG is hidden, temporarily set it to true for the PDF snapshot
    const wasHidden = !showECG;
    if (wasHidden) setShowECG(true);

    // Give React time to render the chart before taking the snapshot
    setTimeout(() => {
        generateHospitalReport(userData, ecgGraphRef);
        
        // Restore previous state after a short delay
        if (wasHidden) setShowECG(false);
    }, 100); 
  };
  
  // 4. CHART DATA GENERATOR
  // The ECG data must be correctly pulled from the vitals object (Firebase sends key:value pairs)
  let rawEcgData = [];
  if (userData?.vitals?.ecg && typeof userData.vitals.ecg === 'object') {
      rawEcgData = Object.values(userData.vitals.ecg);
  }

  // fallback ECG values if none present
  const ecgValues = rawEcgData.length > 0 
    ? rawEcgData.map(v => Number(v) || 200) 
    : Array.from({ length: 100 }, (_, i) => Math.sin(i / 5) * 100 + 1840); // Placeholder data 1840 matches the images

  const ecgData = {
    labels: ecgValues.map((_, i) => i + 1),
    datasets: [
      {
        label: "ECG Signal",
        data: ecgValues,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        fill: true,
        tension: 0.25,
        pointRadius: 0,
      },
    ],
  };

  // 5. RENDER LOGIC
  if (loadingUserData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#2563EB", fontWeight: 700 }}>Loading dashboard...</div>
      </div>
    );
  }

  // Inline CSS block with media queries ensures consistent responsive behavior
  const responsiveCss = `
    /* root spacing and font fallback */
    :root { --bg: #F8FAFC; --primary: #2563EB; --card-shadow: 0 8px 20px rgba(2,6,23,0.06); }

    .dashboard-page { min-height: 100vh; width: 100vw; background-color: var(--bg); padding: 28px 40px; box-sizing: border-box; font-family: Roboto, system-ui, Arial, sans-serif; }
    .dashboard-header { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
    .dashboard-title { color: var(--primary); font-weight:800; font-size: clamp(20px, 2.2vw, 30px); }
    .header-actions { display:flex; gap:10px; align-items:center; } 

    .vitals-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:20px; }
    .vital-card { background:#fff; border-radius:12px; padding:20px; box-shadow: var(--card-shadow); text-align:center; min-height:120px; display:flex; flex-direction:column; justify-content:center; }
    .vital-title { color:var(--primary); font-weight:700; }
    .vital-value { margin-top:8px; font-size:1.6rem; font-weight:800; color:#0F172A; }

    .ecg-grid { display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px; }
    .card { background:#fff; border-radius:12px; padding:20px; box-shadow: var(--card-shadow); }

    .download-row { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; background:#fff; border-radius:12px; padding:20px; box-shadow: var(--card-shadow); }
    .btn-success { background-color: ${SUCCESS}; border-color: ${SUCCESS}; }

    /* medium devices / tablets */
    @media (max-width: 1100px) {
      .vitals-grid { grid-template-columns: repeat(2, 1fr); }
      .ecg-grid { grid-template-columns: 1fr; }
    }

    /* small devices / phones */
    @media (max-width: 600px) {
      .vitals-grid { grid-template-columns: 1fr; padding-bottom: 8px; }
      .dashboard-page { padding: 12px; }
      .vital-value { font-size: 1.4rem; }
    }
  `;

  return (
    <>
      <style>{responsiveCss}</style>
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-title">PulsePal Dashboard</div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setShowDoctors(true)}>Appointments</button>
            <button className="btn btn-outline-primary" onClick={() => setShowProfile(true)}>Account</button>
            <div style={{ fontWeight: 600 }}>{userData.email}</div>
            <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Vitals */}
        <div className="vitals-grid">
          <div className="vital-card">
            <div className="vital-title">Heart Rate</div>
            <div className="vital-value">{userData?.vitals?.heartRate ?? "N/A"} bpm</div>
          </div>

          <div className="vital-card">
            <div className="vital-title">SpO₂</div>
            <div className="vital-value">{userData?.vitals?.spo2 ?? "N/A"} %</div>
          </div>

          <div className="vital-card">
            <div className="vital-title">Temperature</div>
            <div className="vital-value">{formatTemperature(userData?.vitals?.temperature, 3) ?? "N/A"} °F</div>
          </div>

          <div className="vital-card">
            <div className="vital-title">Diagnosis</div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => alert(userData?.vitals?.diagnosis || "No diagnosis available")}>Show</button>
            </div>
          </div>
        </div>

        {/* ECG + Glucose */}
        <div className="ecg-grid">
          <div className="card" style={{ minHeight: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: "#2563EB", fontWeight: 700 }}>ECG Signal</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowECG(p => !p)}>{showECG ? "Hide ECG" : "Show ECG"}</button>
            </div>
            
            {/* ECG CHART CONTAINER - ATTACH REF HERE */}
            <div ref={ecgGraphRef} style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {showECG ? (
                <Line data={ecgData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div style={{ color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  ECG is hidden. Click "Show ECG".
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ color: "#2563EB", fontWeight: 700, marginBottom: 6 }}>Glucose</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{Number(userData?.vitals?.glucose ?? 0).toFixed(3) ?? "N/A"} mg/dL</div>
            <div style={{ color: "#64748B", marginTop: 6 }}>Normal Range: 70—140 mg/dL</div>
          </div>
        </div>

        {/* Download */}
        <div className="download-row" style={{ marginBottom: 20 }}>
          <div>
            <div style={{ color: "#2563EB", fontWeight: 700 }}>Download Report</div>
            <div style={{ color: "#475569" }}>Download a PDF snapshot of your latest vitals & ECG.</div>
          </div>
          <div>
            <button className="btn btn-success" onClick={handleDownloadPDF}>Download PDF</button>
          </div>
        </div>

        {/* Modals (Appointments and Profile) ... no change needed */}
        {/* Appointments Modal */}
        <Modal show={showDoctors} onHide={() => setShowDoctors(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title style={{ color: "#2563EB" }}>Appointments</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {userData?.role === "doctor" ? (
              <>
                <div style={{ fontWeight: 700 }}>{userData?.profile?.name || "Doctor"}</div>
                <div style={{ color: "#475569" }}>{userData?.email}</div>
                <div style={{ color: "#2563EB", marginTop: 8 }}>Specialization: {userData?.profile?.specialization || "N/A"}</div>
              </>
            ) : userData?.assignedDoctor ? (
              <>
                <div style={{ fontWeight: 700 }}>Assigned Doctor</div>
                <div style={{ color: "#475569" }}>{userData.assignedDoctor.name}</div>
                <div style={{ color: "#475569" }}>{userData.assignedDoctor.email}</div>
              </>
            ) : (
              <div>No doctor assigned.</div>
            )}
          </Modal.Body>
        </Modal>

        {/* Profile Modal */}
        <Modal show={showProfile} onHide={() => { setShowProfile(false); setEditMode(false); }} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title style={{ color: "#2563EB" }}>Account</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
              <Tab eventKey="details" title="Details">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>Details</div>
                  {!editMode ? (
                    <Button variant="primary" onClick={() => setEditMode(true)}>Edit Profile</Button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="success" onClick={handleProfileSave}>Save Changes</Button>
                      <Button variant="secondary" onClick={() => { setEditMode(false); }}>Cancel</Button>
                    </div>
                  )}
                </div>

                {!editMode ? (
                  <div>
                    <div style={{ marginBottom: 8 }}><strong>Name:</strong> {userData?.profile?.name || userData?.name || "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Email:</strong> {userData?.email || "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Phone:</strong> {userData?.profile?.phone || "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Age:</strong> {userData?.profile?.age || "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Gender:</strong> {userData?.profile?.gender || "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Height:</strong> {userData?.profile?.height ? `${userData.profile.height} cm` : "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Weight:</strong> {userData?.profile?.weight ? `${userData.profile.weight} kg` : "N/A"}</div>
                    <div style={{ marginBottom: 8 }}><strong>Allergies:</strong> {userData?.profile?.allergies || "N/A"}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 700 }}>Name</label>
                      <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="form-control" />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 700 }}>Phone</label>
                      <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="form-control" />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 700 }}>Age</label>
                        <input value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} className="form-control" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 700 }}>Gender</label>
                        <input value={profileForm.gender} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })} className="form-control" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 700 }}>Height (cm)</label>
                        <input value={profileForm.height} onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })} className="form-control" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 700 }}>Weight (kg)</label>
                        <input value={profileForm.weight} onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} className="form-control" />
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontWeight: 700 }}>Allergies</label>
                      <input value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} className="form-control" />
                    </div>
                  </div>
                )}
              </Tab>

              <Tab eventKey="history" title="Medical History">
                <div>
                  {userData?.medicalHistory ? (
                    Object.values(userData.medicalHistory).map((h, idx) => (
                      <div key={idx} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700 }}>{h.date}</div>
                        <div style={{ color: "#475569" }}>{h.note}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748B" }}>No medical history available.</div>
                  )}

                  <hr />

                  <div style={{ marginBottom: 8 }}>
                    <h6>Add New History</h6>
                    <input type="date" className="form-control mb-2" value={newHistory.date} onChange={(e) => setNewHistory({ ...newHistory, date: e.target.value })} />
                    <textarea className="form-control mb-2" placeholder="Enter note..." value={newHistory.note} onChange={(e) => setNewHistory({ ...newHistory, note: e.target.value })} />
                    <Button variant="primary" onClick={handleAddHistory}>Add History</Button>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </Modal.Body>
        </Modal>
      </div>
    </>
  );
};
export default Dashboard;
