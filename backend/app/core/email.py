import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings


async def send_email(to: str, subject: str, html_body: str) -> None:
    """Send email via configured SMTP provider."""
    if not settings.SMTP_USER or settings.SMTP_PASSWORD == "your_gmail_app_password_here":
        import logging
        logging.getLogger("knot.email").warning(f"Email skipped (SMTP not configured). Would send to {to}: {subject}")
        return
    await _send_smtp(to, subject, html_body)


async def _send_smtp(to: str, subject: str, html_body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html_body, subtype="html")
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
    except Exception as e:
        import logging
        logging.getLogger("knot.email").error(f"Email send failed: {e}")


# ─── Email Templates ──────────────────────────────────────────────────────────

_BASE_STYLE = """
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: #DC2626; padding: 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: 2px; }
  .header p { color: #fca5a5; margin: 4px 0 0; font-size: 13px; }
  .body { padding: 32px; color: #374151; line-height: 1.7; }
  .body h2 { color: #111827; margin-top: 0; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #DC2626; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; }
  .note { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #92400E; margin: 16px 0; }
  .footer { padding: 16px 32px; background: #F9FAFB; text-align: center; font-size: 12px; color: #9CA3AF; }
</style>
"""

def _wrap(content: str) -> str:
    return f"""<!DOCTYPE html><html><head>{_BASE_STYLE}</head><body>
<div class="container">
  <div class="header"><h1>⬡ KNOT</h1><p>Kết Nối Ứng Phó Thiên Tai</p></div>
  <div class="body">{content}</div>
  <div class="footer">KNOT – Nền tảng báo cáo và ứng phó thiên tai Việt Nam<br>weareknot.03@gmail.com</div>
</div></body></html>"""


def verification_email(full_name: str, verify_url: str) -> str:
    return _wrap(f"""
<h2>Xác thực tài khoản KNOT</h2>
<p>Xin chào <strong>{full_name}</strong>,</p>
<p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống KNOT.</p>
<p>Vui lòng nhấn vào liên kết bên dưới để xác thực địa chỉ email của bạn:</p>
<div style="text-align:center"><a class="btn" href="{verify_url}">Xác thực tài khoản</a></div>
<div class="note">⚠️ Liên kết xác thực này chỉ có hiệu lực trong <strong>3 phút</strong>.</div>
<p>Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email.</p>
<p>Trân trọng,<br><strong>KNOT Team</strong></p>""")


def reset_password_email(full_name: str, reset_url: str) -> str:
    return _wrap(f"""
<h2>Đặt lại mật khẩu KNOT</h2>
<p>Xin chào <strong>{full_name}</strong>,</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản KNOT của bạn.</p>
<p>Vui lòng nhấn vào liên kết dưới đây để đặt lại mật khẩu:</p>
<div style="text-align:center"><a class="btn" href="{reset_url}">Đặt lại mật khẩu</a></div>
<div class="note">⚠️ Liên kết này chỉ có hiệu lực trong <strong>3 phút</strong>.</div>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
<p>Trân trọng,<br><strong>KNOT Team</strong></p>""")


def account_approved_email(full_name: str) -> str:
    return _wrap(f"""
<h2>Tài khoản đã được phê duyệt ✅</h2>
<p>Xin chào <strong>{full_name}</strong>,</p>
<p>Tài khoản tổ chức của bạn trên hệ thống KNOT đã được phê duyệt.</p>
<p>Bạn có thể đăng nhập và sử dụng đầy đủ các tính năng ngay bây giờ.</p>
<p>Trân trọng,<br><strong>KNOT Team</strong></p>""")


def org_pending_approval_email(full_name: str) -> str:
    return _wrap(f"""
<h2>Email đã được xác thực 📧</h2>
<p>Xin chào <strong>{full_name}</strong>,</p>
<p>Email của bạn đã được xác thực thành công.</p>
<p>Tài khoản tổ chức của bạn đang <strong>chờ quản trị viên phê duyệt</strong>. Chúng tôi sẽ thông báo qua email ngay khi được duyệt.</p>
<p>Trân trọng,<br><strong>KNOT Team</strong></p>""")


def report_submitted_email(report_id: str, disaster_type: str) -> str:
    return _wrap(f"""
<h2>Báo cáo đã được ghi nhận</h2>
<p>Cảm ơn bạn đã gửi báo cáo thiên tai <strong>{disaster_type}</strong>.</p>
<p>Mã báo cáo: <code>{report_id}</code></p>
<p>Chúng tôi sẽ xem xét và cập nhật trạng thái sớm nhất.</p>""")


def report_status_changed_email(report_id: str, new_status: str) -> str:
    status_vi = {
        "verified": "Đã xác minh", "in_progress": "Đang xử lý",
        "resolved": "Đã giải quyết", "rejected": "Từ chối",
    }.get(new_status, new_status)
    return _wrap(f"""
<h2>Cập nhật trạng thái báo cáo</h2>
<p>Báo cáo <code>{report_id}</code> của bạn đã được cập nhật:</p>
<p>Trạng thái mới: <strong>{status_vi}</strong></p>""")
