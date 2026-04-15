import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../firebase-config";
import { Button, Badge, Table } from "react-bootstrap";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ClinicalAnalysis() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [patientInfo, setPatientInfo] = useState(null);
    const [viewingReport, setViewingReport] = useState(null);

    useEffect(() => {
        const userRef = ref(rtdb, `users/${id}`);
        const unsub = onValue(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setPatientInfo(data);
                if (data.vitalsHistory) {
                    // Pulling all saved clinical reports
                    setHistory(Object.entries(data.vitalsHistory).reverse());
                }
            }
        });
        return () => unsub();
    }, [id]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { min: 1840, max: 1890, grid: { color: "#f1f1f1" } },
            x: { display: false }
        },
        plugins: { legend: { display: false } }
    };

    return (
        <div style={styles.container}>
            {/* Left Sidebar: Patient Profile */}
            <aside style={styles.sidebar}>
                <Button variant="link" onClick={() => navigate(-1)} style={styles.backBtn}>
                    ← Back to Dashboard
                </Button>
                <div style={styles.profileHeader}>
                    <div style={styles.avatar}>P</div>
                    <h3 style={styles.patientName}>{patientInfo?.profile?.name || "Patient N/A"}</h3>
                    <p style={styles.idLabel}>HEALTHCARE ID: {id?.substring(0, 8).toUpperCase()}</p>
                </div>
                <div style={styles.profileInfo}>
                    <div style={styles.infoRow}>
                        <div style={styles.infoCol}><label>Age</label><span>{patientInfo?.profile?.age || "—"}</span></div>
                        <div style={styles.infoCol}><label>Gender</label><span>{patientInfo?.profile?.gender || "—"}</span></div>
                    </div>
                    <div style={styles.infoRow} className="mt-4">
                        <div style={styles.infoCol}><label>Blood Group</label><span>B+</span></div>
                        <div style={styles.infoCol}><label>Allergies</label><span style={{color: 'red'}}>None</span></div>
                    </div>
                </div>
            </aside>

            {/* Right Main Content Area */}
            <main style={styles.contentArea}>
                {!viewingReport ? (
                    /* View 1: Saved Reports List */
                    <div style={styles.cardBox}>
                        <h4 className="fw-bold mb-4">Saved Clinical Reports</h4>
                        <Table hover responsive borderless>
                            <thead style={styles.tableHead}>
                                <tr>
                                    <th>DATE & TIME</th>
                                    <th>DIAGNOSIS</th>
                                    <th>VITALS (HR/SPO2)</th>
                                    <th className="text-end">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(([key, record]) => (
                                    <tr key={key} style={styles.tableRow}>
                                        <td className="fw-bold">{record.timestamp}</td>
                                        <td><Badge bg="success">Normal</Badge></td>
                                        <td>{record.heartRate} bpm / {record.spo2}%</td>
                                        <td className="text-end">
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                onClick={() => setViewingReport(record)}
                                            >
                                                View Analysis
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    /* View 2: Detailed Report with ECG */
                    <div style={styles.reportDetail}>
                        <div style={styles.detailHeader}>
                            <Button variant="outline-secondary" size="sm" onClick={() => setViewingReport(null)}>
                                ← Back to List
                            </Button>
                            <div className="d-flex align-items-center gap-3">
                                <h4 className="mb-0 fw-bold">Detailed Report: {viewingReport.timestamp}</h4>
                                <Badge bg="primary">Normal</Badge>
                            </div>
                        </div>

                        {/* Vitals Grid: Populating values from viewingReport state */}
                        <div style={styles.vitalsGrid}>
                            <div style={styles.vitalCard}><small>Heart Rate</small><strong>{viewingReport.heartRate} bpm</strong></div>
                            <div style={styles.vitalCard}><small>SpO2</small><strong>{viewingReport.spo2} %</strong></div>
                            <div style={styles.vitalCard}><small>Temp</small><strong>{viewingReport.temperature || viewingReport.temp || 0} °F</strong></div>
                            <div style={styles.vitalCard}><small>Glucose</small><strong>{viewingReport.glucose || 0}</strong></div>
                        </div>

                        {/* ECG Analysis */}
                        <div style={styles.ecgCard}>
                            <h6 className="fw-bold text-primary mb-3">ECG WAVEFORM (Clinical Evidence)</h6>
                            <div style={{height: "300px"}}>
                                <Line 
                                    data={{
                                        labels: viewingReport.ecg ? viewingReport.ecg.map((_, i) => i) : [],
                                        datasets: [{
                                            data: viewingReport.ecg || [],
                                            borderColor: "#2563EB",
                                            borderWidth: 2,
                                            pointRadius: 0,
                                            tension: 0.4
                                        }]
                                    }} 
                                    options={chartOptions} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const styles = {
    container: { display: "flex", height: "100vh", width: "100vw", backgroundColor: "#F8FAFC", overflow: "hidden" },
    sidebar: { width: "350px", backgroundColor: "#fff", borderRight: "1px solid #E2E8F0", padding: "40px" },
    backBtn: { padding: 0, textDecoration: "none", color: "#64748B", marginBottom: "30px", fontSize: "14px" },
    profileHeader: { textAlign: "center", marginBottom: "40px" },
    avatar: { width: "80px", height: "80px", backgroundColor: "#2563EB", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", margin: "0 auto 15px" },
    patientName: { fontWeight: "bold", margin: 0 },
    idLabel: { fontSize: "12px", color: "#94A3B8", marginTop: "5px" },
    profileInfo: { marginTop: "30px" },
    infoRow: { display: "flex", justifyContent: "space-between" },
    infoCol: { display: "flex", flexDirection: "column" },
    contentArea: { flex: 1, padding: "40px", overflowY: "auto" },
    cardBox: { backgroundColor: "#fff", borderRadius: "20px", padding: "30px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" },
    tableHead: { color: "#94A3B8", fontSize: "12px", borderBottom: "1px solid #F1F5F9" },
    tableRow: { verticalAlign: "middle", borderBottom: "1px solid #F1F5F9" },
    reportDetail: { display: "flex", flexDirection: "column", gap: "25px" },
    detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "15px", borderBottom: "1px solid #E2E8F0" },
    vitalsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" },
    vitalCard: { backgroundColor: "#fff", padding: "20px", borderRadius: "15px", border: "1px solid #E2E8F0", textAlign: "center", display: "flex", flexDirection: "column" },
    ecgCard: { backgroundColor: "#fff", padding: "30px", borderRadius: "20px", border: "1px solid #E2E8F0" }
};