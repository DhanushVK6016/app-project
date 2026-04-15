import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { rtdb, auth } from "../firebase-config"; 
import { signOut } from "firebase/auth";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const PRIMARY = "#2563EB";
const ALERT_RED = "#DC2626";
const BG = "#F8FAFC";
const SUCCESS_GREEN = "#10B981";
const APPOINTMENT_ORANGE = "#F97316";

const formatTemperature = (temp) => {
    const t = Number(temp);
    if (isNaN(t) || t < 50 || t > 120) return "0";
    return t.toFixed(1);
};

const getAppointmentCount = () => 2; // Mock

export default function DoctorDashboard() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState({});
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    useEffect(() => {
        const usersRef = ref(rtdb, "users");
        const unsub = onValue(usersRef, (snap) => {
            const val = snap.val() || {};
            setPatients(val);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const patientList = useMemo(() => {
        return Object.entries(patients)
            .map(([id, data]) => ({ id, ...data }))
            .filter((p) => (p.role ? p.role === "patient" : true))
            .filter((p) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
            })
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [patients, query]);

    const totalPatients = patientList.length;
    const appointmentCount = getAppointmentCount();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/auth");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const sparkOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        elements: { point: { radius: 0 }, line: { borderWidth: 2 } },
        scales: { x: { display: false }, y: { display: false } },
    };

    const makeSpark = (p) => {
        const ecg = Array.isArray(p?.vitals?.ecg) && p.vitals.ecg.length
            ? p.vitals.ecg.slice(-40)
            : Array.from({ length: 40 }, () => (p.vitals?.heartRate || 60));

        return {
            labels: ecg.map((_, i) => i),
            datasets: [{
                data: ecg,
                borderColor: p.vitals?.spo2 < 94 ? ALERT_RED : PRIMARY,
                backgroundColor: "rgba(37,99,235,0.05)",
                fill: true,
                tension: 0.4
            }]
        };
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div style={styles.leftHeader}>
                    <div style={styles.logo}>PulsePal <span style={{fontWeight: 300, color: '#64748B'}}>MD</span></div>
                    <div style={styles.statusPill}>Live Monitoring Active</div>
                </div>

                <div style={styles.rightHeader}>
                    <div style={styles.statsRow}>
                        <div style={styles.statCard}>
                            <div style={styles.statTitle}>Total Patients</div>
                            <div style={styles.statValue}>{totalPatients}</div>
                        </div>
                        <div style={{ ...styles.statCard, borderLeft: `4px solid ${APPOINTMENT_ORANGE}` }} onClick={() => alert("Appointments")}>
                            <div style={styles.statTitle}>Appointments</div>
                            <div style={{ ...styles.statValue, color: APPOINTMENT_ORANGE }}>{appointmentCount}</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={styles.searchWrapper}>
                           <input
                                placeholder="Search by name..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                style={styles.searchInput}
                            />
                        </div>
                        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </header>

            <main style={styles.main}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
                    <h3 style={styles.sectionTitle}>Patient Directory</h3>
                    <div style={{fontSize: 13, color: '#64748B'}}>Showing {patientList.length} Active Records</div>
                </div>

                <div style={styles.grid}>
                    {loading ? (
                        <div style={styles.loader}>Synchronizing Clinical Data...</div>
                    ) : patientList.length === 0 ? (
                        <div style={styles.emptyState}>No patient records found in current directory.</div>
                    ) : (
                        patientList.map((p) => (
                            <div key={p.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={{flex: 1}}>
                                        <div style={{display:'flex', alignItems:'center', gap: 8}}>
                                            <div style={styles.patientName}>{p.name || "Patient Unknown"}</div>
                                            {p.vitals?.spo2 < 94 && <span style={styles.alertBadge}>Critical</span>}
                                        </div>
                                        <div style={styles.patientEmail}>{p.email || "No email provided"}</div>
                                    </div>
                                    <div style={{ width: 120, height: 45 }}>
                                        <Line data={makeSpark(p)} options={sparkOptions} />
                                    </div>
                                </div>

                                <div style={styles.vitalsRow}>
                                    <div style={styles.vitalBlock}>
                                        <div style={styles.vitalLabel}>Heart Rate</div>
                                        <div style={styles.vitalValue}>{p.vitals?.heartRate || 0} <small style={styles.unit}>bpm</small></div>
                                    </div>
                                    <div style={styles.vitalBlock}>
                                        <div style={styles.vitalLabel}>SpO₂</div>
                                        <div style={{...styles.vitalValue, color: p.vitals?.spo2 < 94 ? ALERT_RED : '#0F172A'}}>
                                            {p.vitals?.spo2 || 0} <small style={styles.unit}>%</small>
                                        </div>
                                    </div>
                                    <div style={styles.vitalBlock}>
                                        <div style={styles.vitalLabel}>Temperature</div>
                                        <div style={styles.vitalValue}>{formatTemperature(p.vitals?.temperature)} <small style={styles.unit}>°F</small></div>
                                    </div>
                                    <div style={styles.vitalBlock}>
                                        <div style={styles.vitalLabel}>Glucose</div>
                                        <div style={styles.vitalValue}>{p.vitals?.glucose || 0} <small style={styles.unit}>mg/dL</small></div>
                                    </div>
                                </div>

                                <div style={styles.cardFooter}>
                                    <div style={styles.lastUpdate}>
                                        Sync: {p.vitals?.timestamp ? new Date(p.vitals.timestamp).toLocaleTimeString() : "Manual Entry"}
                                    </div>
                                    <button 
                                        style={styles.viewBtn} 
                                        onClick={() => navigate(`/doctor/patient/${p.id}`, { state: { patient: p } })}
                                    >
                                        Analyze Patient Vitals
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

const styles = {
    page: { minHeight: "100vh", width: "100vw", backgroundColor: BG, padding: "30px 50px", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, paddingBottom: 20, borderBottom: "1px solid #E2E8F0" },
    leftHeader: { display: "flex", alignItems: "center", gap: 15 },
    logo: { color: PRIMARY, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' },
    statusPill: { background: '#ECFDF5', color: SUCCESS_GREEN, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${SUCCESS_GREEN}` },
    rightHeader: { display: "flex", gap: 30, alignItems: "center" },
    statsRow: { display: "flex", gap: 12 },
    statCard: { background: "#fff", padding: "12px 20px", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: '1px solid #E5E7EB', minWidth: 140 },
    statTitle: { color: "#64748B", fontWeight: 600, fontSize: 11, textTransform: 'uppercase' },
    statValue: { fontSize: 24, fontWeight: 800, color: '#1E293B' },
    searchWrapper: { position: 'relative' },
    searchInput: { padding: "10px 16px", borderRadius: 10, border: "1px solid #CBD5E1", width: 300, fontSize: 14, outline: 'none', transition: 'all 0.2s' },
    logoutBtn: { background: ALERT_RED, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 },
    main: { width: "100%", margin: "0 auto" },
    sectionTitle: { fontSize: 22, fontWeight: 800, color: '#1E293B' },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 25 },
    card: { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.02)", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", transition: 'transform 0.2s' },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    patientName: { fontWeight: 800, fontSize: 20, color: '#1E293B' },
    patientEmail: { color: "#64748B", fontSize: 13 },
    alertBadge: { background: '#FEF2F2', color: ALERT_RED, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
    vitalsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 15, padding: '20px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' },
    vitalBlock: { textAlign: "left" },
    vitalLabel: { color: "#94A3B8", fontWeight: 700, fontSize: 11, textTransform: 'uppercase' },
    vitalValue: { fontWeight: 800, fontSize: 19, color: '#0F172A', marginTop: 4 },
    unit: { fontSize: 11, color: '#94A3B8', fontWeight: 400 },
    cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
    lastUpdate: { fontSize: 12, color: "#94A3B8", fontWeight: 500 },
    viewBtn: { background: PRIMARY, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 },
    loader: { padding: 50, textAlign: 'center', color: '#64748B', fontWeight: 600 },
    emptyState: { padding: 50, textAlign: 'center', color: '#94A3B8' }
};