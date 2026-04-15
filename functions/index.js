// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const functions = require('firebase-functions');
// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
exports.receiveData = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { userId, heartRate, spo2 } = req.body;

    if (!userId || !heartRate || !spo2) {
      return res.status(400).send('Missing data fields');
    }

    const db = admin.firestore();
    const data = {
      heartRate: parseInt(heartRate),
      spo2: parseInt(spo2),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: userId,
    };

    // Save the data to a collection named 'healthData'
    await db.collection('healthData').add(data);

    // Send a success response
    res.status(200).send('Data received and saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send('Internal Server Error');
  }
});