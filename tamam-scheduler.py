"""Daily Telegram delivery for the loopback launcher. Uses Python standard library."""
import json
import mimetypes
import os
import sqlite3
import threading
import time
import uuid
import urllib.request
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

folder = Path.home() / '.tamam-pro'
folder.mkdir(mode=0o700, exist_ok=True)
database = folder / 'delivery.sqlite'
def connect():
    db = sqlite3.connect(database, timeout=20)
    db.execute('create table if not exists jobs(company text, kind text, chat text, token text, name text, content blob, due real, primary key(company,kind))')
    db.execute("create table if not exists portals(company text, party text, token text unique, content text, primary key(company, party))")
    return db

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith('/tamam-customer/'):
            return super().do_GET()
        with connect() as db:
            row=db.execute('select content from portals where token=?',(self.path.split('/')[-1],)).fetchone()
        if not row:
            self.send_error(404)
            return
        body=row[0].encode()
        self.send_response(200)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        origin = urlsplit(self.headers.get('Origin',''))
        if (self.path not in ('/tamam-schedule','/tamam-portal') or origin.netloc != 'localhost:8765' or
            self.headers.get('Host') != origin.netloc or self.headers.get('X-Tamam') != '1'):
            self.send_error(403)
            return
        try:
            job = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            import base64
            with connect() as db:
                if self.path == '/tamam-portal':
                    party=job['snapshot']['customer']['id']
                    db.execute('insert into portals values(?,?,?,?) on conflict(company,party) do update set content=excluded.content',
                               (job['company'],party,uuid.uuid4().hex,json.dumps(job['snapshot'])))
                    token=db.execute('select token from portals where company=? and party=?',(job['company'],party)).fetchone()[0]
                    self.send_response(200)
                    self.send_header('Content-Type','text/plain')
                    self.end_headers()
                    self.wfile.write(token.encode())
                    return
                for party,snapshot in job.get('portals',{}).items():
                    db.execute('update portals set content=? where company=? and party=?',(json.dumps(snapshot),job['company'],party))
                chats=job.get('recipients',[])
                active=[]
                for kind in ('backup','reports'):
                    item=job.get(kind)
                    if not item:continue
                    content=base64.b64decode(item['content'])
                    for chat in chats:
                        key=kind+':'+chat
                        active.append(key)
                        db.execute('insert into jobs values (?,?,?,?,?,?,?) on conflict(company,kind) do update set token=excluded.token,name=excluded.name,content=excluded.content',
                                   (job['company'],key,chat,job['token'],item['name'],content,time.time()+86400))
                for (key,) in db.execute('select kind from jobs where company=?',(job['company'],)).fetchall():
                    if key not in active:
                        db.execute('delete from jobs where company=? and kind=?',(job['company'],key))
            self.send_response(204)
            self.end_headers()
        except Exception:
            self.send_error(400)

def run():
    while True:
        try:
            with connect() as db:
                jobs=db.execute('select * from jobs where due<=?',(time.time(),)).fetchall()
            for company,kind,chat,token,name,content,due in jobs:
                try:
                    boundary=uuid.uuid4().hex
                    head=(f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n'
                          f'--{boundary}\r\nContent-Disposition: form-data; name="document"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()
                    body=head+content+f'\r\n--{boundary}--\r\n'.encode()
                    req=urllib.request.Request('https://api.telegram.org/bot'+token+'/sendDocument', data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
                    with urllib.request.urlopen(req,timeout=90) as response:
                        if not json.load(response).get('ok'):continue
                    with connect() as db:
                        db.execute('update jobs set due=? where company=? and kind=? and chat=?',(time.time()+86400,company,kind,chat))
                except Exception:pass
        except sqlite3.Error:pass
        time.sleep(60)

def start():
    threading.Thread(target=run,daemon=True).start()
