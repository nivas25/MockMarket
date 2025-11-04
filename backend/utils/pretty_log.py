from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.rule import Rule
from rich.text import Text
from rich import box
import datetime as _dt
import logging

# Global console for the backend
console = Console(highlight=False)
logger = logging.getLogger(__name__)


def banner(title: str, subtitle: str | None = None, style: str = "bold cyan"):
    text = Text(title, style=style)
    if subtitle:
        text.append("\n")
        text.append(subtitle, style="dim")
    console.print(Panel(text, box=box.ROUNDED))


def status_ok(msg: str):
    """Log success message - removes emojis for clean logs"""
    # Remove emojis from the message for logging
    clean_msg = msg.replace("📅", "").replace("✓", "").strip()
    logger.info(clean_msg)


def status_warn(msg: str):
    """Log warning message"""
    clean_msg = msg.replace("⚠️", "").replace("!", "").strip()
    logger.warning(clean_msg)


def status_err(msg: str):
    """Log error message"""
    clean_msg = msg.replace("❌", "").replace("✗", "").strip()
    logger.error(clean_msg)


def rule(title: str | None = None):
    console.print(Rule(title or ""))


def updates_table(rows: list[dict]):
    """Print a pretty table of index updates.
    rows: [{name, ltp, change_percent, change_value, tag, time}]
    """
    if not rows:
        status_warn("No indices updated.")
        return

    table = Table(box=box.SIMPLE_HEAVY)
    table.add_column("Index", style="bold")
    table.add_column("LTP", justify="right")
    table.add_column("% Change", justify="right")
    table.add_column("Δ Value", justify="right")
    table.add_column("Tag")
    table.add_column("Time", justify="center", style="dim")

    for r in rows:
        pct = r.get("change_percent")
        pct_str = f"{pct:+.2f}%" if pct is not None else "—"
        pct_style = "green" if (pct is not None and pct >= 0) else "red"
        chg_val = r.get("change_value")
        chg_val_str = f"{chg_val:+,.2f}" if chg_val is not None else "—"
        ltp = r.get("ltp")
        ltp_str = f"{ltp:,.2f}" if ltp is not None else "—"
        when = r.get("time") or _dt.datetime.now().strftime("%H:%M:%S")

        table.add_row(
            r.get("name") or "—",
            ltp_str,
            f"[{pct_style}]{pct_str}[/]",
            chg_val_str,
            r.get("tag") or "",
            when,
        )

    console.print(table)
