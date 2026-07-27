import http.server
import ssl
import urllib.request
import os
import sys
import threading

CERT_DIR = os.path.dirname(os.path.abspath(__file__))
CERT_FILE = os.path.join(CERT_DIR, 'cert.pem')
KEY_FILE = os.path.join(CERT_DIR, 'key.pem')
OLLAMA_URL = 'http://localhost:11434'
HTTPS_PORT = 8443
HTTP_PORT = 8081

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_GET(self):
        self._proxy('GET')

    def do_POST(self):
        self._proxy('POST')

    def _proxy(self, method):
        target_url = OLLAMA_URL + self.path
        body = None
        if 'Content-Length' in self.headers:
            body = self.rfile.read(int(self.headers['Content-Length']))

        headers = {}
        for key in ['Content-Type', 'Authorization']:
            if key in self.headers:
                headers[key] = self.headers[key]

        req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
        try:
            resp = urllib.request.urlopen(req, timeout=300)
            resp_body = resp.read()
            self.send_response(resp.status)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
            self.send_header('Content-Length', len(resp_body))
            self.end_headers()
            self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            resp_body = e.read()
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(resp_body))
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            msg = str(e).encode()
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(msg))
            self.end_headers()
            self.wfile.write(msg)

    def log_message(self, format, *args):
        pass

def start_https():
    if not os.path.exists(CERT_FILE):
        print('Generating self-signed cert...')
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime, ipaddress
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cert = (x509.CertificateBuilder()
            .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')]))
            .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')]))
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.now(datetime.UTC))
            .not_valid_after(datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=365))
            .add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'), x509.IPAddress(ipaddress.IPv4Address('127.0.0.1'))]), critical=False)
            .sign(key, hashes.SHA256()))
        with open(KEY_FILE, 'wb') as f:
            f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))
        with open(CERT_FILE, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

    server = http.server.HTTPServer(('0.0.0.0', HTTPS_PORT), CORSProxyHandler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT_FILE, KEY_FILE)
    server.socket = ctx.wrap_socket(server.socket, server_side=True)
    print(f'HTTPS proxy on https://localhost:{HTTPS_PORT} -> {OLLAMA_URL}')
    server.serve_forever()

def start_http():
    server = http.server.HTTPServer(('0.0.0.0', HTTP_PORT), CORSProxyHandler)
    print(f'HTTP proxy on http://localhost:{HTTP_PORT} -> {OLLAMA_URL}')
    server.serve_forever()

if __name__ == '__main__':
    t1 = threading.Thread(target=start_https, daemon=True)
    t1.start()
    t2 = threading.Thread(target=start_http, daemon=True)
    t2.start()
    print('Both proxies running. Press Ctrl+C to stop.')
    import time
    while True:
        time.sleep(3600)
