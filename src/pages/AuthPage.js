import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ref, set, get, child } from "firebase/database";
import { auth, rtdb } from '../firebase-config';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [role, setRole] = useState('patient');
  const navigate = useNavigate();

  const handleAuthentication = async () => {
    try {
      setError(null);
      setMessage(null);
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `users/${userCredential.user.uid}`));
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.role === 'doctor') {
            navigate('/doctor-dashboard', { state: { userEmail: email, userName: userData.name } });
          } else {
            navigate('/dashboard', { state: { userEmail: email, userName: userData.name } });
          }
        } else {
          navigate('/dashboard', { state: { userEmail: email } });
        }
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await set(ref(rtdb, 'users/' + userCredential.user.uid), {
          email,
          name,
          role
        });
        if (role === 'doctor') {
          navigate('/doctor-dashboard', { state: { userEmail: email, userName: name } });
        } else {
          navigate('/dashboard', { state: { userEmail: email, userName: name } });
        }
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setError(null);
      if (!email) {
        setError("Please enter your email to reset your password.");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div className="left-panel" style={styles.leftPanel}>
        <h1 style={styles.appTitle}>PulsePal</h1>
        <p style={styles.subText}>Monitor • Diagnose • Care — all in one platform.</p>
      </div>

      <div className="right-panel" style={styles.rightPanel}>
        <div style={styles.authBox}>
          <h2 style={styles.formTitle}>{isLogin ? 'Login' : 'Create an Account'}</h2>

          <div style={styles.roleToggle}>
            <button
              style={role === 'patient' ? { ...styles.roleButton, ...styles.activeRoleButton } : styles.roleButton}
              onClick={() => setRole('patient')}
            >
              Patient
            </button>
            <button
              style={role === 'doctor' ? { ...styles.roleButton, ...styles.activeRoleButton } : styles.roleButton}
              onClick={() => setRole('doctor')}
            >
              Doctor
            </button>
          </div>

          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && <p style={styles.errorText}>{error}</p>}
          {message && <p style={styles.successText}>{message}</p>}

          {isLogin && (
            <div style={styles.loginActions}>
              <span onClick={handlePasswordReset} style={{ ...styles.toggleLink, ...styles.forgotPasswordLink }}>
                Forgot Password?
              </span>
              <button onClick={handleAuthentication} style={styles.button}>
                Login
              </button>
            </div>
          )}

          {!isLogin && (
            <button onClick={handleAuthentication} style={styles.button}>
              Sign Up
            </button>
          )}

          <div style={styles.toggleText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span onClick={() => setIsLogin(!isLogin)} style={styles.toggleLink}>
              {isLogin ? ' Sign Up' : ' Login'}
            </span>
          </div>
        </div>
      </div>

      {/* Inline responsive media queries */}
      <style>
        {`
          @media (max-width: 768px) {
            .left-panel {
              display: none;
            }
            .right-panel {
              flex: 1;
              background-color: #ffffff;
              justify-content: flex-start !important;
              align-items: center !important;
              padding-top: 3rem;
            }
            .right-panel h2 {
              font-size: 1.4rem;
            }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: 'Poppins, sans-serif',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  appTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  subText: {
    fontSize: '1.1rem',
    opacity: 0.9,
    maxWidth: '400px',
    textAlign: 'center',
  },
  rightPanel: {
    flex: 1.2,
    backgroundColor: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authBox: {
    width: '380px',
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  formTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '1.5rem',
    fontWeight: '600',
  },
  roleToggle: {
    marginBottom: '1.5rem',
  },
  roleButton: {
    backgroundColor: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    padding: '0.6rem 1.25rem',
    margin: '0 0.25rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeRoleButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    margin: '0.5rem 0',
    borderRadius: '0.375rem',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f1f5f9',
    fontSize: '1rem',
  },
  // New style to wrap the button and forgot password link
  loginActions: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end', // Aligns the children (like the link) to the right
    marginTop: '0.5rem', // Add a little space above the link/button block
  },
  // New style for the link itself
  forgotPasswordLink: {
    // The base toggleLink style is good, we're just overriding the margin/position
    display: 'block', // Make it take up the full width for alignment
    width: '100%',
    textAlign: 'right', // Push the text to the right
    marginBottom: '0.5rem', // Space between the link and the button
    fontSize: '0.875rem',
    textDecoration: 'none', // Remove underline on the link text itself
    color: '#2563eb',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    marginTop: '0rem', // Removed extra margin here as it's handled by loginActions
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  toggleText: {
    marginTop: '1rem',
    fontSize: '0.9rem',
    color: '#475569',
  },
  toggleLink: {
    color: '#2563eb',
    textDecoration: 'underline',
    cursor: 'pointer',
    marginLeft: '0.25rem',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  successText: {
    color: '#16a34a',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  // The original 'forgotPassword' style is now obsolete, but kept for reference
  // forgotPassword: {
  //   textAlign: 'right',
  //   width: '100%',
  //   marginTop: '-0.5rem',
  //   marginBottom: '1rem',
  //   fontSize: '0.875rem',
  // },
};

export default AuthPage;
