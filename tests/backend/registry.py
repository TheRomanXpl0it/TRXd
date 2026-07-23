import docker, requests, os
from urllib.parse import urlparse

import warnings
warnings.filterwarnings("ignore")


project_name = os.getenv('PROJECT_NAME', 'trxd')
username = os.getenv('REGISTRY_USERNAME', 'user')
password = os.getenv('REGISTRY_PASSWORD', 'password')


registry = "localhost:5000"
source_image = "echo-server"
tag = "latest"


client = docker.from_env()

client.login(
	username=username,
	password=password,
	registry=registry,
)

target_image = f"{registry}/{source_image}"

image = client.images.get(source_image)
image.tag(target_image, tag=tag)

for event in client.images.push(
	target_image,
	tag=tag,
	stream=True,
	decode=True,
):
	if "error" in event:
		raise RuntimeError(event["error"])

	status = event.get("status")
	progress = event.get("progress")
	if status:
		print(f"{status} {progress or ''}")


client.images.remove(target_image, force=True)


url = 'http://localhost:1337/api'

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

def update_challenge(session, chall_id, image=None, compose=None, hash_domain=None):
	data = {"chall_id": chall_id}
	if image is not None:
		data["image"] = image
	if compose is not None:
		data["compose"] = compose
	if hash_domain is not None:
		data["hash_domain"] = hash_domain
	r = session.patch(f'{url}/challenges',
		json=data,
		headers={'X-CSRF-Token': session.cookies.get('csrf_'),}
	)
	assert r.status_code == 200, r.text

admin = login('admin@email.com', 'testpass')


r = admin.get(f'{url}/challenges')
assert r.status_code == 200
for chall in r.json():
	if chall['name'] == "chall-3":
		chall_id_3 = chall['id']
	elif chall['name'] == "chall-4":
		chall_id_4 = chall['id']


compose = f'''
services:
  chall:
    image: {target_image}:{tag}
    container_name: ${{CONTAINER_NAME}}
    ports:
      - "${{INSTANCE_PORT}}:1337"
    environment:
      - ECHO_MESSAGE=Hello from app
      - INSTANCE_PORT=${{INSTANCE_PORT}}
      - INSTANCE_DOMAIN=${{INSTANCE_DOMAIN}}
'''
update_challenge(admin, chall_id_3, image=f'{target_image}:{tag}', hash_domain=False)
update_challenge(admin, chall_id_4, compose=compose, hash_domain=False)
print(target_image)


def spawn_instance(session, chall_id):
	r = session.post(f'{url}/instances', json={
		"chall_id": chall_id,
	}, headers={"X-CSRF-Token": session.cookies.get('csrf_')})
	return r

def spawn_good_instance(session, chall_id):
	r = spawn_instance(session, chall_id)
	assert r.status_code == 200, r.text
	i = r.json()
	print(i)
	return i

def kill_instance(session, chall_id):
	r = session.delete(f'{url}/instances', json={
		"chall_id": chall_id,
	}, headers={"X-CSRF-Token": session.cookies.get('csrf_')})
	return r

def kill_good_instance(session, chall_id):
	r = kill_instance(session, chall_id)
	assert r.status_code == 200, r.text

def format_request(r: requests.Response, hash_domain):
	req = r.request
	parsed = urlparse(r.url)
	# raw = f"{req.method} {req.path_url} HTTP/1.{'0' if hash_domain else '1'}\r\n"
	raw = f"Host: {parsed.hostname}{':' + str(parsed.port) if parsed.port else ''}\r\n"
	raw += "\r\n".join(f"{k}: {v}" for k, v in req.headers.items() if k != 'Connection')
	return raw

def assert_request(r: requests.Response, hash_domain):
	req = format_request(r, hash_domain)
	resp = r.text.strip()
	for line in req.split('\r\n'):
		assert line in resp, f'"{line}" not in resp\n{req}\n-----DIFF-----\n{resp}'


s1 = login('a@a.a', 'testpass')
s2 = login('b@b.b', 'testpass')
s3 = login('c@c.c', 'testpass')


# first loop it needs to pull the image, second loop it should use the cached image
for _ in range(2):
	r = spawn_instance(s1, chall_id_3)
	assert r.status_code == 200, r.text
	i1 = r.json()
	print(i1)
	r = spawn_instance(s2, chall_id_3)
	assert r.status_code == 409, r.text
	r = spawn_instance(s3, chall_id_3)
	assert r.status_code == 200, r.text
	i3 = r.json()
	print(i3)

	r = requests.get(f'http://localhost:{i1["port"]}')
	assert_request(r, False)
	r = requests.get(f'http://localhost:{i3["port"]}')
	assert_request(r, False)

	kill_instance(s1, chall_id_3)
	kill_instance(s3, chall_id_3)


client.images.remove(target_image, force=True)


# first loop it needs to pull the image, second loop it should use the cached image
for _ in range(2):
	r = spawn_instance(s1, chall_id_4)
	assert r.status_code == 200, r.text
	i1 = r.json()
	print(i1)
	r = spawn_instance(s3, chall_id_4)
	assert r.status_code == 200, r.text
	i3 = r.json()
	print(i3)

	r = requests.get(f'http://localhost:{i1["port"]}')
	assert_request(r, False)
	r = requests.get(f'http://localhost:{i3["port"]}')
	assert_request(r, False)

	kill_instance(s1, chall_id_4)
	kill_instance(s3, chall_id_4)
