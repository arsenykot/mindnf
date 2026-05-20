# mindnf

Минимизация ДНФ по гарвардскому алгоритму.

## Запуск локально

```bash
./run.sh
```

Или вручную:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Откройте http://127.0.0.1:8000

**Если `pip` ругается на externally-managed-environment** — не ставьте пакеты в системный Python; используйте `.venv` (команды выше).