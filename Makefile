# Copyright (C) 2022 Ethan Uppal. All rights reserved.

PY = python3
PORT = 8002

serve:
	${PY} -m http.server ${PORT}
