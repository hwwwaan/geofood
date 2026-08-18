#!/usr/bin/env python3
"""
사이트 빌드.  실행:  python3 10-work/사이트/build.py

  build-data.py 로 items-national.json 을 만들고,
  _template.html 에 그 데이터를 넣어 저장소 루트의 index.html 을 새로 쓴다.

화면을 고칠 때는 _template.html 을, 데이터를 고칠 때는 build-data.py 를 고친다.
index.html 은 생성물이므로 직접 손대지 않는다.
"""
import pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent

subprocess.run([sys.executable, str(HERE / "build-data.py")], check=True)

tpl = (HERE / "_template.html").read_text(encoding="utf-8")
data = (HERE / "items-national.json").read_text(encoding="utf-8").strip()
out = ROOT / "index.html"
out.write_text(tpl.replace("/*__DATA__*/", data), encoding="utf-8")

print(f"{out} · {out.stat().st_size/1024:.0f}KB")
