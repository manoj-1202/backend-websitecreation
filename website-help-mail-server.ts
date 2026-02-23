import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = Number(process.env.PORT || 5001);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_WEBSITE_HELP_TO =
  process.env.BREVO_WEBSITE_HELP_TO || process.env.BREVO_SENDER_EMAIL;

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[website-help-mail] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => {
  console.log("[website-help-mail] health check ok");
  res.status(200).json({ ok: true, service: "website-help-mail" });
});

app.post("/send-website-help-email", async (req, res) => {
  const { name, email, phone, message } = req.body ?? {};
  console.log("[website-help-mail] incoming payload:", {
    name,
    email,
    phone,
    hasMessage: Boolean(message),
    messageLength: typeof message === "string" ? message.length : 0,
  });

  if (!name || !email || !phone || !message) {
    console.error("[website-help-mail] validation failed: missing required fields");
    return res.status(400).json({
      message: "Missing required fields: name, email, phone, message",
    });
  }

  const missingVars = [
    !BREVO_API_KEY ? "BREVO_API_KEY" : null,
    !BREVO_SENDER_EMAIL ? "BREVO_SENDER_EMAIL" : null,
    !BREVO_WEBSITE_HELP_TO ? "BREVO_WEBSITE_HELP_TO" : null,
  ].filter(Boolean);

  if (missingVars.length > 0) {
    console.error("[website-help-mail] missing env vars:", missingVars);
    return res.status(500).json({
      message: `Email service not configured. Missing: ${missingVars.join(", ")}`,
    });
  }

  try {
    console.log("[website-help-mail] sending mail via Brevo", {
      sender: BREVO_SENDER_EMAIL,
      to: BREVO_WEBSITE_HELP_TO,
      subject: `Website Project Inquiry from ${name}`,
    });
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Dreamer's Production House",
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: BREVO_WEBSITE_HELP_TO }],
        replyTo: { name, email },
        subject: `Website Project Inquiry from ${name}`,
        htmlContent: `
          <h3>HOW CAN WE HELP? - Website Creation</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Message:</strong> ${message}</p>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("[website-help-mail] email sent successfully");

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error: any) {
    const brevoError = error?.response?.data || error?.message || "Unknown error";
    const status = error?.response?.status;
    const headers = error?.response?.headers;
    console.error("[website-help-mail] Brevo send failed", {
      status,
      headers,
      brevoError,
    });
    return res.status(500).json({ message: "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`[website-help-mail] server running on port ${PORT}`);
  console.log("[website-help-mail] env status:", {
    hasBrevoApiKey: Boolean(BREVO_API_KEY),
    brevoSenderEmail: BREVO_SENDER_EMAIL || null,
    brevoWebsiteHelpTo: BREVO_WEBSITE_HELP_TO || null,
  });
});
