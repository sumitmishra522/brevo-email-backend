
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Contact form API
app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required."
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Build email content safely
        const escapeHtml = (value = "") =>
            String(value).replace(/[&<>"']/g, (char) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);

        const emailHtml = `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
           
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\r?\n/g, "<br>")}</p>
        `;

        // Send email using Brevo API
        const brevoResponse = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        name: "Website Contact Form",
                        email: process.env.SENDER_EMAIL
                    },
                    to: [
                        {
                            email: process.env.RECEIVER_EMAIL
                        }
                    ],
                    replyTo: {
                        email: email,
                        name: name
                    },
                    subject: `New Contact Form: ${name}`,
                    htmlContent: emailHtml
                })
            }
        );

        const result = await brevoResponse.json();

        if (!brevoResponse.ok) {
            console.error("Brevo API error:", result);

            return res.status(502).json({
                success: false,
                message: "Unable to send your message right now."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully."
        });

    } catch (error) {
        console.error("Email sending error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});

// Health-check route
app.get("/", (req, res) => {
    res.send("Brevo Email API is running.");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
