"""Koşu kaydı. DATABASE_URL yoksa yerel SQLite."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

_DEFAULT = "sqlite:///data/backtests.db"


class Base(DeclarativeBase):
    pass


class Kosu(Base):
    __tablename__ = "kosular"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ad: Mapped[str] = mapped_column(String(200))
    yaml_text: Mapped[str] = mapped_column(Text)
    ozet: Mapped[str] = mapped_column(Text)


def _engine():
    url = os.environ.get("DATABASE_URL", _DEFAULT)
    if url.startswith("sqlite:///"):
        Path("data").mkdir(exist_ok=True)
    return create_engine(url, future=True)


_ENG = None
_Session = None


def oturum():
    global _ENG, _Session
    if _Session is None:
        _ENG = _engine()
        Base.metadata.create_all(_ENG)
        _Session = sessionmaker(_ENG, expire_on_commit=False)
    return _Session()


def kaydet(ad: str, yaml_text: str, payload: dict[str, Any]) -> int:
    s = oturum()
    row = Kosu(
        created_at=datetime.now(timezone.utc),
        ad=ad[:200],
        yaml_text=yaml_text,
        ozet=json.dumps(
            {k: payload[k] for k in ("metrik", "uyari") if k in payload},
            ensure_ascii=False,
            default=str,
        ),
    )
    s.add(row)
    s.commit()
    rid = int(row.id)
    s.close()
    return rid


def liste(limit: int = 30) -> list[dict[str, Any]]:
    s = oturum()
    rows = s.query(Kosu).order_by(Kosu.id.desc()).limit(limit).all()
    out = [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "ad": r.ad,
            "metrik": json.loads(r.ozet).get("metrik") if r.ozet else None,
        }
        for r in rows
    ]
    s.close()
    return out
