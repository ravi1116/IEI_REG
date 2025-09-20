// --- 1. Firebase Setup ---
// Import the functions you need from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js"
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js" // Import QRCode library

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmv-jjCpdh-x5AGKSD3PQv7m1SnPEgV5A",
  authDomain: "iei-event-regestration.firebaseapp.com",
  projectId: "iei-event-regestration",
  storageBucket: "iei-event-regestration.appspot.com",
  messagingSenderId: "449870515537",
  appId: "1:449870515537:web:73e1e130b9f56b3e3c5770",
  measurementId: "G-CTDGXNJGC9",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const analytics = getAnalytics(app)
console.log("Firebase Initialized with Firestore")

let cachedData = {} // temporary storage for form data

// --- DOM Element Selection ---
const eventForm = document.getElementById("eventForm")
const payBtn = document.getElementById("payBtn")
const eventCheckboxes = document.querySelectorAll('input[name="event"]')
const liveAmountContainer = document.getElementById("liveAmountContainer")
const liveAmountEl = document.getElementById("liveAmount")

function validateEmail(email) {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
  return emailRegex.test(email)
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone)
}

function validateUTR(utr) {
  const utrRegex = /^[0-9]{12}$/
  return utrRegex.test(utr)
}

// --- Live Amount Calculation ---
function updateLiveAmount() {
  const selectedEvents = [...document.querySelectorAll('input[name="event"]:checked')]
  if (selectedEvents.length === 0) {
    liveAmountContainer.style.display = "none"
    return
  }
  const amount = selectedEvents.length === 4 ? 99 : selectedEvents.length * 29
  liveAmountEl.innerText = "₹" + amount
  liveAmountContainer.style.display = "block"
}
eventCheckboxes.forEach((cb) => cb.addEventListener("change", updateLiveAmount))

// --- Step 1: Click Pay → Generate QR ---
payBtn.addEventListener("click", () => {
  const name = document.getElementById("name").value.trim()
  const college = document.getElementById("college").value.trim()
  const branch = document.getElementById("branch").value.trim()
  const year = document.getElementById("year").value.trim()
  const classRollno = document.getElementById("classRollno").value.trim()
  const email = document.getElementById("email").value.trim()
  const phone = document.getElementById("phone").value.trim()
  const events = [...document.querySelectorAll('input[name="event"]:checked')].map((e) => e.value)

  if (!name || !college || !branch || !year || !classRollno || !email || !phone) {
    showMessage("❌ Please fill all personal details.", "error")
    return
  }

  if (!validateEmail(email)) {
    showMessage("❌ Please enter a valid email address.", "error")
    return
  }

  if (!validatePhone(phone)) {
    showMessage("❌ Please enter a valid 10-digit phone number.", "error")
    return
  }

  if (events.length === 0) {
    showMessage("❌ Please select at least one event.", "error")
    return
  }

  const amount = events.length === 4 ? 99 : events.length * 29
  document.getElementById("amount").innerText = "Total Amount: ₹" + amount

  const upiLink = `upi://pay?pa=9474080663@slc&pn=Organizer&am=${amount}&cu=INR`
  const qrCodeContainer = document.getElementById("qrcode")
  qrCodeContainer.innerHTML = ""

  const canvas = document.createElement("canvas")
  QRCode.toCanvas(canvas, upiLink, (error) => {
    if (error) {
      console.error("QR Code generation error:", error)
      showMessage("❌ Error generating QR code. Please try again.", "error")
      return
    }
    qrCodeContainer.appendChild(canvas)
  })

  cachedData = { name, college, branch, year, class_rollno: classRollno, email, phone, events, amount }
  document.getElementById("paymentSection").style.display = "block"
  showMessage("✅ QR Generated. Complete payment and enter the UTR.", "success")
})

// --- Step 2: Confirm Registration → Send data to Firebase ---
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const submitButton = e.target.querySelector('button[type="submit"]')
  const utr = document.getElementById("utr").value.trim()

  if (!utr) {
    showMessage("❌ Please enter your UTR after payment.", "error")
    return
  }

  if (!validateUTR(utr)) {
    showMessage("❌ Please enter a valid 12-digit UTR number.", "error")
    return
  }

  submitButton.disabled = true
  submitButton.textContent = "Submitting..."

  const finalData = { ...cachedData, utr: utr, timestamp: new Date() }

  try {
    // Check if UTR already exists in the 'registrations' collection
    const q = query(collection(db, "registrations"), where("utr", "==", utr))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      showMessage(`⚠️ This UTR has already been used. Please enter a valid one.`, "error")
    } else {
      // Add a new document with a generated ID to the 'registrations' collection.
      await addDoc(collection(db, "registrations"), finalData)

      console.log("Success! Data saved to Firebase.")
      const successMessage = `🎉 Registration confirmed! <a href="https://chat.whatsapp.com/CbcwCDG529b6qaCqbu4wi5" target="_blank">Click here to join the WhatsApp group.</a>`
      showMessage(successMessage, "success")

      eventForm.reset()
      document.getElementById("qrcode").innerHTML = ""
      document.getElementById("paymentSection").style.display = "none"
      liveAmountContainer.style.display = "none"
      cachedData = {}
    }
  } catch (err) {
    console.error("Firebase Error: ", err)
    showMessage("⚠️ A network error occurred. Please try again.", "error")
  } finally {
    submitButton.disabled = false
    submitButton.textContent = "Confirm Registration"
  }
})

// --- Helper function to show messages ---
function showMessage(msg, type) {
  const box = document.getElementById("message")
  box.style.display = "block"
  box.className = "message " + type
  box.innerHTML = msg
}
