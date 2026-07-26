import http.server
import ssl
import urllib.request
import os
import sys

CERT_DIR = os.path.dirname(os.path.abspath(__file__))
CERT_FILE = os.path.join(CERT_DIR, 'cert.pem')
KEY_FILE = os.path.join(CERT_DIR, 'key.pem')
OLLAMA_URL = 'http://localhost:11434'
LISTEN_PORT = 8443

class ProxyHandler(http.server.BaseHTTPRequestHandler):
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
            msg = f'{{"error": "{str(e)}"}}'.encode()
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(msg))
            self.end_headers()
            self.wfile.write(msg)

    def log_message(self, format, *args):
        pass

def main():
    if not os.path.exists(CERT_FILE):
        print(f'Generating self-signed cert...')
        os.system(f'openssl req -x509 -newkey rsa:2048 -keyout "{KEY_FILE}" -out "{CERT_FILE}" -days 365 -nodes -subj "/CN=localhost"')

    server = http.server.HTTPServer(('0.0.0.0', LISTEN_PORT), ProxyHandler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT_FILE, KEY_FILE)
    server.socket = ctx.wrap_socket(server.socket, server_side=True)

    print(f'HTTPS proxy running on https://localhost:{LISTEN_PORT}')
    print(f'Forwarding to {OLLAMA_URL}')
    print('Press Ctrl+C to stop.')
    server.serve_forever()

if __name__ == '__main__':
    main()
