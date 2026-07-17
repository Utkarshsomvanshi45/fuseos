"""
Sends compound-risk alert emails. Triggered when a new critical/high severity
risk event lands (see api/ingest.py). Recipients currently come from
core/config.py's ALERT_RECIPIENTS — once Settings > Notifications has a real
backend, swap this for a DB query against that table instead.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

SEVERITY_COLORS = {
    "critical": "#dc2626",
    "high": "#ea580c",
    "elevated": "#ca8a04",
    "low": "#16a34a",
}

SEVERITY_BG = {
    "critical": "#fef2f2",
    "high": "#fff7ed",
    "elevated": "#fefce8",
    "low": "#f0fdf4",
}

SEVERITY_BORDER = {
    "critical": "#fecaca",
    "high": "#fed7aa",
    "elevated": "#fef08a",
    "low": "#bbf7d0",
}

SEVERITY_TEXT_DARK = {
    "critical": "#991b1b",
    "high": "#9a3412",
    "elevated": "#854d0e",
    "low": "#166534",
}

SEVERITY_TEXT_DARKER = {
    "critical": "#7f1d1d",
    "high": "#7c2d12",
    "elevated": "#713f12",
    "low": "#14532d",
}

SIGNAL_LABELS = {
    "permit": "PERMIT", "sensor": "SENSOR", "scada": "SCADA", "shift": "SHIFT",
}

# Set this to your deployed frontend URL once live (e.g. https://fuseos.vercel.app).
# Falls back to localhost for local testing.
APP_BASE_URL = settings.__dict__.get("APP_BASE_URL", "http://localhost:5173")


def render_alert_email(risk_event: dict) -> str:
    severity = risk_event["severity"]
    color = SEVERITY_COLORS.get(severity, "#2563eb")
    bg = SEVERITY_BG.get(severity, "#eff6ff")
    border = SEVERITY_BORDER.get(severity, "#bfdbfe")
    text_dark = SEVERITY_TEXT_DARK.get(severity, "#1e40af")
    text_darker = SEVERITY_TEXT_DARKER.get(severity, "#1e3a8a")

    signals_html = "".join(
        f'<span style="display:inline-block;background:{bg};color:{text_dark};'
        f'font-size:10px;font-weight:bold;padding:3px 9px;border-radius:3px;margin-right:6px;">'
        f'{SIGNAL_LABELS.get(s, s.upper())}</span>'
        for s in risk_event.get("contributing_signals", [])
    )

    lead_time = risk_event.get("lead_time_minutes")
    lead_time_row = (
        f'<tr style="border-bottom:1px solid #f3f4f6;">'
        f'<td style="padding:10px 28px;color:#6b7280;font-size:12px;">Lead time</td>'
        f'<td style="padding:10px 28px;color:#111827;font-size:13px;font-weight:bold;">'
        f'{lead_time} minutes before threshold breach</td></tr>'
        if lead_time else ""
    )

    alert_url = f"{APP_BASE_URL}/alerts/{risk_event.get('id', '')}"

    return f"""
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;font-family:Arial,sans-serif;box-shadow:0 0 0 1px #e5e7eb;">
      <div style="background:#111827;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;">
        <div style="color:#22d3ee;font-family:monospace;font-weight:bold;font-size:16px;">
          FUSE<span style="color:#ffffff;">.OS</span>
        </div>
        <div style="color:#9ca3af;font-size:10px;font-family:monospace;">ALERT NOTIFICATION</div>
      </div>

      <div style="background:{color};padding:4px 28px;"></div>

      <div style="padding:24px 28px 8px;">
        <div style="color:{color};font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
          {severity} compound risk
        </div>
        <div style="color:#111827;font-size:20px;font-weight:bold;margin-top:4px;line-height:1.3;">
          {risk_event['risk_type']}
        </div>
        <div style="color:#6b7280;font-size:13px;margin-top:6px;">
          Detected at Rourkela Integrated Steelworks, Zone {risk_event['zone_id']}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;">
        <tr style="border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 28px;color:#6b7280;font-size:12px;width:40%;">Zone</td>
          <td style="padding:10px 28px;color:#111827;font-size:13px;font-weight:bold;">{risk_event['zone_id']}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 28px;color:#6b7280;font-size:12px;">Confidence</td>
          <td style="padding:10px 28px;color:#111827;font-size:13px;font-weight:bold;">{risk_event['confidence']}%</td>
        </tr>
        {lead_time_row}
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 28px;color:#6b7280;font-size:12px;vertical-align:top;">Signals</td>
          <td style="padding:10px 28px;">{signals_html}</td>
        </tr>
      </table>

      <div style="padding:0 28px 20px;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Evidence</div>
        <div style="color:#374151;font-size:13px;line-height:1.6;">{risk_event['description']}</div>
      </div>

      <div style="margin:0 28px 24px;padding:14px 18px;background:{bg};border:1px solid {border};border-radius:6px;">
        <div style="color:{text_dark};font-size:12px;font-weight:bold;margin-bottom:3px;">Action required</div>
        <div style="color:{text_darker};font-size:12px;line-height:1.5;">
          Review this alert in FUSE.OS and acknowledge or resolve before continuing work in this zone.
        </div>
      </div>

      <div style="margin:0 28px 24px;text-align:center;">
        <a href="{alert_url}" style="display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:bold;padding:12px 28px;border-radius:6px;text-decoration:none;">
          Open alert in FUSE.OS
        </a>
      </div>

      <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:10px;">
        This alert was generated automatically. Do not reply. Rourkela Integrated Steelworks · Sector 4.
      </div>
    </div>
    """


def send_alert_email(recipients: list[str], risk_event: dict):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("[email_service] SMTP not configured — skipping send. "
              "Set SMTP_USER/SMTP_PASSWORD in .env to enable.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[FUSE.OS] {risk_event['severity'].upper()} — {risk_event['risk_type']} ({risk_event['zone_id']})"
    msg["From"] = settings.SMTP_USER
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(render_alert_email(risk_event), "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, recipients, msg.as_string())
        return True
    except Exception as e:
        print(f"[email_service] Failed to send alert email: {e}")
        return False


def render_invite_email(name: str, email: str, temp_password: str, role: str) -> str:
    login_url = f"{APP_BASE_URL}/login"
    return f"""
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;font-family:Arial,sans-serif;box-shadow:0 0 0 1px #e5e7eb;">
      <div style="background:#111827;padding:18px 28px;">
        <div style="color:#22d3ee;font-family:monospace;font-weight:bold;font-size:16px;">
          FUSE<span style="color:#ffffff;">.OS</span>
        </div>
      </div>
      <div style="padding:28px;">
        <div style="color:#111827;font-size:18px;font-weight:bold;">You've been added to FUSE.OS</div>
        <div style="color:#6b7280;font-size:13px;margin-top:6px;">Rourkela Integrated Steelworks · Sector 4</div>
        <p style="color:#374151;font-size:13px;line-height:1.6;margin-top:18px;">
          Hi {name}, an administrator has created a FUSE.OS account for you with the
          <b>{role}</b> role. Use the temporary credentials below to sign in, and change
          your password immediately afterward from Settings → Security.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
          <tr><td style="padding:12px 18px;color:#6b7280;font-size:12px;width:40%;">Email</td>
              <td style="padding:12px 18px;color:#111827;font-size:13px;font-weight:bold;">{email}</td></tr>
          <tr><td style="padding:12px 18px;color:#6b7280;font-size:12px;">Temporary password</td>
              <td style="padding:12px 18px;color:#111827;font-size:13px;font-weight:bold;font-family:monospace;">{temp_password}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0;">
          <a href="{login_url}" style="display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:bold;padding:12px 28px;border-radius:6px;text-decoration:none;">
            Sign in to FUSE.OS
          </a>
        </div>
        <p style="color:#9ca3af;font-size:11px;line-height:1.5;">
          If you weren't expecting this, contact your plant administrator before using these credentials.
        </p>
      </div>
      <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:10px;">
        This is an automated account-provisioning email. Do not reply.
      </div>
    </div>
    """


def send_invite_email(name: str, email: str, temp_password: str, role: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("[email_service] SMTP not configured — skipping invite send. "
              "Set SMTP_USER/SMTP_PASSWORD in .env to enable.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your FUSE.OS account is ready"
    msg["From"] = settings.SMTP_USER
    msg["To"] = email
    msg.attach(MIMEText(render_invite_email(name, email, temp_password, role), "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [email], msg.as_string())
        return True
    except Exception as e:
        print(f"[email_service] Failed to send invite email: {e}")
        return False
