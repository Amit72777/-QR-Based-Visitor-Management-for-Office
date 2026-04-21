import uuid, base64, qrcode
from io import BytesIO
from datetime import datetime, timedelta
from app.core.config import settings


def generate_token() -> str:
    return str(uuid.uuid4())


def build_qr_image(token: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


def qr_expiry() -> datetime:
    return datetime.utcnow() + timedelta(hours=settings.QR_EXPIRY_HOURS)


def validate_qr(status: str, qr_expires: datetime) -> tuple[bool, str]:
    if status == "checked_in":
        return False, "Visitor already checked in. Scan again to check out."
    if status == "checked_out":
        return False, "This QR code has been fully used (check-out complete)."
    if status == "expired":
        return False, "This QR code has expired."
    if datetime.utcnow() > qr_expires:
        return False, "QR code has expired. Please register again."
    return True, "OK"
