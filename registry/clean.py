import sys
import requests

if len(sys.argv) != 2:
	print("Usage: python clean.py <image>")
	sys.exit(1)

image = sys.argv[1]

url = 'https://registry.localhost'

username = 'user'
password = 'password'

r = requests.get(f"{url}/v2/_catalog", auth=(username, password), verify=False)
assert r.status_code == 200, f"Failed to get catalog: {r.status_code} - {r.text}"
r = requests.get(f"{url}/v2/{image}/manifests/latest",
	headers={
        "Accept": ",".join([
            "application/vnd.oci.image.index.v1+json",
            "application/vnd.oci.image.manifest.v1+json",
            "application/vnd.docker.distribution.manifest.list.v2+json",
            "application/vnd.docker.distribution.manifest.v2+json",
        ])
    },
	auth=(username, password),
	verify=False
)
assert r.status_code == 200, f"Failed to get manifest for {image}: {r.status_code} - {r.text}"
# print(r)
# print(r.json())
print(r.headers["Docker-Content-Digest"])

# exit()

manifests = r.json()['manifests']
print(manifests)
for manifest in manifests[1:]:
	digest = manifest['digest']
	print(digest)
	r = requests.delete(f"{url}/v2/{image}/manifests/{digest}", auth=(username, password), verify=False)
	assert r.status_code == 202, f"Failed to delete manifest for {image}: {r.status_code} - {r.text}"
	print(r.json())
