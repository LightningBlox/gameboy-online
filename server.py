#!/usr/bin/env python
import base64
import socket
import sys
import webbrowser
import urllib2
import urlparse
from SocketServer import TCPServer, ThreadingMixIn
from SimpleHTTPServer import SimpleHTTPRequestHandler

class Handler(ThreadingMixIn, SimpleHTTPRequestHandler):
    """Extends SimpleHTTPRequestHandler to proxy at res/proxy.php."""
    
    """if ?url then grab it, passing user-agent, and echo it base64ed,
    Content-Type: text/plain; Expries: in a day or whatever."""
    
    def do_GET(self):
        path = urlparse.urlparse(self.path)
        
        if path.path == "/res/proxy.php":
            qs = urlparse.parse_qs(path.query)
            url = qs["url"][0].strip()
            
            self.log_message("Proxy Request: %s", url)
            
            try:
                contents = urllib2.urlopen(url).read()
            except urllib2.URLError:
                self.log_error("Proxy - 404")
                self.send_error(404)
                self.end_headers()
                return
            
            encoded = base64.b64encode(contents)
            self.log_message("Proxy - 200 for %s", qs["url"][0])
            self.send_response(200)
            self.end_headers()
            
            self.wfile.write(encoded)
        else:
            return SimpleHTTPRequestHandler.do_GET(self)

def main(argument=None):
    """Hosts the emulator on a free port and opens it in a web browser.
    
    Opening the web browser may be suppressed with --dont-open/-d."""
    
    port = 8000 # scans up until one is unused
    
    while True:
        try:
            server = TCPServer(("", port), Handler)
            sys.stdout.write("Now listening on port %s.\n" % port)
            break
        except socket.error, e:
            if e.args[0] == 48: # port in use
                port += 1
            else:
                raise e
    
    if argument not in set(("--dont-open", "-d")):
        webbrowser.open("http://localhost:%s" % port)
    
    server.serve_forever()

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
