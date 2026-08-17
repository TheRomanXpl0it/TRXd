import imaplib
import email
from email.header import decode_header
import requests
import os
import time

EMAIL_WAIT_TIME = os.getenv("EMAIL_WAIT_TIME", 20)

server = os.getenv("TEST_EMAIL_SERVER", None)
port = os.getenv("TEST_EMAIL_PORT", None)
addr = os.getenv("TEST_EMAIL_ADDR", None)
passwd = os.getenv("TEST_EMAIL_PASSWD", None)

imapServer = os.getenv("TEST_IMAP_SERVER", None)
imapPort = os.getenv("TEST_IMAP_PORT", None)
imapAddr = os.getenv("TEST_IMAP_ADDR", None)
imapPasswd = os.getenv("TEST_IMAP_PASSWD", None)

if server is None or port is None or addr is None or passwd is None or imapServer is None or imapPort is None or imapAddr is None or imapPasswd is None:
	print("Please set TEST_EMAIL_SERVER, TEST_EMAIL_PORT, TEST_EMAIL_ADDR, TEST_EMAIL_PASSWD, TEST_IMAP_SERVER, TEST_IMAP_PORT, TEST_IMAP_ADDR and TEST_IMAP_PASSWD environment variables to run this test.")
	exit(0)

host = 'localhost:1337'

url = f'http://{host}/api'


def login(mail, password):
	s = requests.Session()
	r = s.get(f'{url}/info')
	assert r.status_code == 200, r.text
	r = s.post(f'{url}/login', json={
		"email": mail,
		"password": password,
	}, headers={"X-CSRF-Token": s.cookies.get('csrf_')})
	assert r.status_code == 200, r.text
	return s

def register(name=None, mail=None, password=None, token=None):
	data = {}
	if name is not None:
		data["name"] = name
	if mail is not None:
		data["email"] = mail
	if password is not None:
		data["password"] = password
	if token is not None:
		data["token"] = token

	s = requests.Session()
	r = s.get(f'{url}/info')
	assert r.status_code == 200, r.text
	r = s.post(f'{url}/register', json=data,
		headers={"X-CSRF-Token": s.cookies.get('csrf_')})
	assert r.status_code == 200, r.text
	return s

def change_conf(s, key, value):
	r = s.patch(f'{url}/configs',
		json={'key': key, 'value': value},
		headers={"X-CSRF-Token": s.cookies.get('csrf_')})
	assert r.status_code == 200, r.text

admin = login('admin@email.com', 'testpass')

change_conf(admin, 'domain', host)
change_conf(admin, 'email-verification', "true")
change_conf(admin, 'email-server', server)
change_conf(admin, 'email-port', str(port))
change_conf(admin, 'email-addr', addr)
change_conf(admin, 'email-password', passwd)

# change_conf(admin, 'email-expiration', "1") # 1 second for testing



def parse_header_value(header_value):
	if not header_value:
		return ""
	decoded_parts = decode_header(header_value)
	header_text = ""
	for content, encoding in decoded_parts:
		if isinstance(content, bytes):
			header_text += content.decode(encoding or "utf-8", errors="replace")
		else:
			header_text += str(content)
	return header_text


def recive_last_emails(server, port, addr, passwd, last_n=1):
	with imaplib.IMAP4_SSL(server, port) as mail:
		mail.login(addr, passwd)
		mail.select("INBOX")

		status, messages = mail.search(None, "ALL")
		if status != "OK":
			print("Failed to retrieve messages.")
			exit(1)

		email_ids = messages[0].split()
		email_ids = email_ids[-last_n:]

		last_emails = []
		for e_id in reversed(email_ids):
			status, data = mail.fetch(e_id, "(RFC822)")
			if status != "OK":
				print(f"Failed to fetch email with ID {e_id.decode()}.")
				continue

			raw_email = data[0][1]
			msg = email.message_from_bytes(raw_email)

			subject = parse_header_value(msg.get("Subject"))
			sender = parse_header_value(msg.get("From"))

			body = ""
			if msg.is_multipart():
				for part in msg.walk():
					content_type = part.get_content_type()
					content_disposition = str(part.get("Content-Disposition"))

					if content_type == "text/plain" and "attachment" not in content_disposition:
						body = part.get_payload(decode=True).decode("utf-8", errors="replace")
						break
			else:
				body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
			body = body.strip()

			last_emails.append((sender, subject, body))
		return last_emails




s = register(mail=imapAddr)

print(f"Waiting {EMAIL_WAIT_TIME}s for email to arrive...")
time.sleep(EMAIL_WAIT_TIME)

last_emails = recive_last_emails(imapServer, imapPort, imapAddr, imapPasswd, last_n=1)
print(last_emails)

token = last_emails[0][2].split('?token=')[1].split('\r\n')[0]
s = register(name="tester", password="testpass", token=token)

r = s.get(f'{url}/info')
assert r.status_code == 200, r.text
print(r.text)

s2 = login(imapAddr, "testpass")
print("Login successful!")

