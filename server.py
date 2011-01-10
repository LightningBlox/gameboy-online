#!/usr/bin/env python
import socket
import sys
import webbrowser
from SocketServer import TCPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    """TODO: Handle requests to res/proxy.php"""

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
        webbrowser.open("http://localhost:%s" + port)
    
    server.serve_forever()

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
