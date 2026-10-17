"""Utilidades de interfaz con `rich`."""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.text import Text

console = Console()


def clear() -> None:
    console.clear()


def title(text: str, subtitle: str = "") -> None:
    console.print(Panel(Text(text, style="bold white", justify="center"),
                        subtitle=subtitle or None, border_style="cyan"))


def ask(prompt: str, default: str | None = None) -> str:
    return Prompt.ask(f"[bold cyan]›[/] {prompt}", default=default, show_default=default is not None)


def choose(prompt: str, options: list[tuple[str, str]], default: str | None = None) -> str:
    """Muestra un menú numerado y devuelve la clave elegida."""
    for key, label in options:
        console.print(f"  [bold cyan]{key}[/]. {label}")
    keys = [k for k, _ in options]
    return Prompt.ask(f"\n[bold cyan]›[/] {prompt}", choices=keys, default=default,
                      show_choices=False)


def confirm(prompt: str, default: bool = False) -> bool:
    return Confirm.ask(f"[bold cyan]›[/] {prompt}", default=default)


def multiline(prompt: str) -> str:
    """Lee varias líneas; termina con una línea vacía."""
    console.print(f"[bold cyan]›[/] {prompt} [dim](línea vacía para terminar)[/]")
    lines: list[str] = []
    while True:
        line = console.input("  ")
        if not line.strip():
            if lines:
                break
            continue
        lines.append(line)
    return "\n".join(lines)


def pause() -> None:
    console.input("\n[dim]Pulsa Enter para continuar...[/]")


def success(msg: str) -> None:
    console.print(f"[bold green]✓[/] {msg}")


def error(msg: str) -> None:
    console.print(f"[bold red]✗[/] {msg}")


def info(msg: str) -> None:
    console.print(f"[cyan]ℹ[/] {msg}")


def explain(msg: str, heading: str = "¿Por qué?") -> None:
    console.print(Panel(msg, title=f"💡 {heading}", title_align="left",
                        border_style="yellow", padding=(0, 1)))


def stream_text(chunk: str) -> None:
    """Imprime un fragmento de texto en streaming sin interpretar markup."""
    console.print(chunk, end="", markup=False, highlight=False, soft_wrap=True)


def progress_bar(done: int, total: int, width: int = 20) -> str:
    filled = round(width * done / total) if total else 0
    return f"[green]{'█' * filled}[/][dim]{'░' * (width - filled)}[/] {done}/{total}"
