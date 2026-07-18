#!/usr/bin/env python3
"""CDP smoke test: scrolling game chooser must not move document scrollY."""
import json
import os
import subprocess
import time
import urllib.request

from websocket import create_connection

PORT = 9333
UD = "/tmp/chrome-scroll-cdp-test"


def main() -> None:
    os.system(f"rm -rf {UD} && mkdir -p {UD}")
    proc = subprocess.Popen(
        [
            "google-chrome",
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            f"--remote-debugging-port={PORT}",
            "--remote-allow-origins=*",
            f"--user-data-dir={UD}",
            "--window-size=390,844",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(2.5)
        tabs = json.load(
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list")
        )
        ws = create_connection(tabs[0]["webSocketDebuggerUrl"], timeout=20)
        msg_id = 0

        def send(method, params=None, timeout=45):
            nonlocal msg_id
            msg_id += 1
            payload = {"id": msg_id, "method": method}
            if params:
                payload["params"] = params
            ws.send(json.dumps(payload))
            end = time.time() + timeout
            while time.time() < end:
                resp = json.loads(ws.recv())
                if resp.get("id") == msg_id:
                    return resp
            raise TimeoutError(method)

        send("Page.enable")
        send("Runtime.enable")
        send("Page.navigate", {"url": "http://127.0.0.1:3000/?game=klondike"})
        time.sleep(10)

        has = send(
            "Runtime.evaluate",
            {
                "expression": (
                    "!!(window.Y && Y.Solitaire && Y.Solitaire.Application"
                    " && Y.Solitaire.Application.GameChooser)"
                ),
                "returnByValue": True,
            },
        )
        print("hasGC", has.get("result", {}).get("result", {}).get("value"))

        result = send(
            "Runtime.evaluate",
            {
                "expression": """
(async () => {
  const GC = Y.Solitaire.Application.GameChooser;
  GC.show(false);
  await new Promise(r => setTimeout(r, 200));
  const chooser = document.getElementById('game-chooser');
  const locked = document.body.classList.contains('dc-chooser-open');
  const bodyPos = getComputedStyle(document.body).position;
  const beforeY = window.scrollY;
  const max = Math.max(0, chooser.scrollHeight - chooser.clientHeight);
  chooser.scrollTop = Math.min(max, 450);
  await new Promise(r => setTimeout(r, 150));
  const midY = window.scrollY;
  const midChooser = chooser.scrollTop;
  GC.select('freecell');
  await new Promise(r => setTimeout(r, 150));
  chooser.scrollTop = Math.min(chooser.scrollHeight - chooser.clientHeight, 700);
  await new Promise(r => setTimeout(r, 150));
  const afterY = window.scrollY;
  const afterChooser = chooser.scrollTop;
  const card = document.querySelector('.card');
  const cardVis = card ? getComputedStyle(card).visibility : 'none';
  GC.hide();
  await new Promise(r => setTimeout(r, 100));
  const unlocked = !document.body.classList.contains('dc-chooser-open');
  const pass = !!(
    locked && midY === 0 && afterY === 0 && midChooser > 0
    && unlocked && bodyPos === 'fixed'
  );
  return {
    locked, unlocked, bodyPos, beforeY, midY, afterY,
    midChooser, afterChooser, max, cardVis, pass
  };
})()
""",
                "awaitPromise": True,
                "returnByValue": True,
            },
            timeout=60,
        )
        value = result.get("result", {}).get("result", {}).get("value")
        print("RESULT", json.dumps(value, indent=2))
        if not value or not value.get("pass"):
            raise SystemExit(1)
        print("PASS chooser scroll isolation")
        ws.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
