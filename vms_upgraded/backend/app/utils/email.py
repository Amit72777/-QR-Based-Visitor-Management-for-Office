"""
Email utility — sends QR codes to visitors after registration.

Uses SMTP (Gmail by default). All config comes from .env so nothing
is hardcoded here. If email sending fails, we log the error but DON'T
crash the registration — the visitor still gets their QR on screen.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import base64
from app.core.config import settings

log = logging.getLogger(__name__)


def send_qr_email(
    to_email: str,
    visitor_name: str,
    qr_image_b64: str,   # the full "data:image/png;base64,..." string
    host_name: str | None = None,
    qr_expires_str: str = "",
) -> bool:
    """
    Send a nicely formatted HTML email with the QR code attached as an inline image.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.SMTP_ENABLED:
        log.info("SMTP is disabled — skipping email to %s", to_email)
        return False

    try:
        # Strip the data URI prefix to get raw base64 bytes
        raw_b64 = qr_image_b64.split(",", 1)[-1]
        qr_bytes = base64.b64decode(raw_b64)

        msg = MIMEMultipart("related")
        msg["Subject"] = "Your Visitor QR Code — VisitorQR System"
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to_email

        # ── HTML body ─────────────────────────────────────────────
        host_line = f"<p>You are visiting: <strong>{host_name}</strong></p>" if host_name else ""
        html_body = f"""
        <html><body style="font-family: sans-serif; background:#f8fafc; padding:24px;">
          <div style="max-width:480px; margin:auto; background:#fff;
                      border-radius:12px; box-shadow:0 2px 16px rgba(0,0,0,0.08); overflow:hidden;">
            <div style="background:#1e293b; padding:24px; text-align:center;">
              <h2 style="color:#f1f5f9; margin:0; font-size:20px;">⬡ VisitorQR System</h2>
            </div>
            <div style="padding:28px 32px;">
              <h3 style="color:#1e293b;">Hello, {visitor_name}!</h3>
              <p>Your visitor registration is confirmed. Please show the QR code below
                 at the security desk to check in.</p>
              {host_line}
              <p style="color:#64748b; font-size:13px;">
                QR valid until: <strong>{qr_expires_str}</strong>
              </p>
              <div style="text-align:center; margin:28px 0;">
                <img src="cid:qr_code" alt="Your QR Code"
                     style="width:220px; height:220px; border:4px solid #e2e8f0; border-radius:8px;" />
              </div>
              <p style="font-size:12px; color:#94a3b8; text-align:center;">
                This QR code is single-use and time-limited. Do not share it.<br/>
                Scan again at the exit to complete your check-out.
              </p>
            </div>
            <div style="background:#f1f5f9; padding:12px 32px; text-align:center;">
              <p style="font-size:11px; color:#94a3b8; margin:0;">
                Automated message from VisitorQR — do not reply
              </p>
            </div>
          </div>
        </body></html>
        """

        msg.attach(MIMEText(html_body, "html"))

        # Attach QR image as inline (Content-ID: qr_code)
        qr_part = MIMEImage(qr_bytes, _subtype="png")
        qr_part.add_header("Content-ID", "<qr_code>")
        qr_part.add_header("Content-Disposition", "inline", filename="qr_code.png")
        msg.attach(qr_part)

        # ── Send via SMTP ──────────────────────────────────────────
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        log.info("QR email sent to %s", to_email)
        return True

    except Exception as exc:
        # Don't crash the registration — just log and move on
        log.error("Failed to send QR email to %s: %s", to_email, exc)
        return False

def send_reset_password_email(
    to_email: str,
    user_name: str,
    reset_link: str,
) -> bool:
    """
    Send a password reset link email to the user.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.SMTP_ENABLED:
        log.info("SMTP is disabled — skipping reset email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("related")
        msg["Subject"] = "Password Reset Request — VisitorQR System"
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to_email

        html_body = f"""
        <html><body style="font-family: sans-serif; background:#f8fafc; padding:24px;">
          <div style="max-width:480px; margin:auto; background:#fff;
                      border-radius:12px; box-shadow:0 2px 16px rgba(0,0,0,0.08); overflow:hidden;">
            <div style="background:#1e293b; padding:24px; text-align:center;">
              <h2 style="color:#f1f5f9; margin:0; font-size:20px;">⬡ VisitorQR System</h2>
            </div>
            <div style="padding:28px 32px;">
              <h3 style="color:#1e293b;">Hello, {user_name}!</h3>
              <p>We received a request to reset your password.</p>
              <p>Click the button below to set a new password. This link will expire in <strong>30 minutes</strong>.</p>
              <div style="text-align:center; margin:28px 0;">
                <a href="{reset_link}"
                   style="background:#6366f1; color:#fff; padding:14px 32px;
                          border-radius:8px; text-decoration:none; font-size:16px; font-weight:600;">
                  Reset Password
                </a>
              </div>
              <p style="font-size:12px; color:#94a3b8;">
                If you didn't request this, you can safely ignore this email.<br/>
                Link expires at: <strong>30 minutes from now</strong>
              </p>
              <p style="font-size:11px; color:#cbd5e1; word-break:break-all;">
                Or copy this link: {reset_link}
              </p>
            </div>
            <div style="background:#f1f5f9; padding:12px 32px; text-align:center;">
              <p style="font-size:11px; color:#94a3b8; margin:0;">
                Automated message from VisitorQR — do not reply
              </p>
            </div>
          </div>
        </body></html>
        """

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        log.info("Password reset email sent to %s", to_email)
        return True

    except Exception as exc:
        log.error("Failed to send reset email to %s: %s", to_email, exc)
        return False