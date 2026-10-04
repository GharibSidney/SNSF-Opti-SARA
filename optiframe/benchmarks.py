"""
Benchmark the vision pipeline (finalSam.py) against every image in ../images/.

Run with:
    cd optiframe
    python benchmarks.py

Produces a rich table with, for each image:
    - number of lenses detected
    - ArUco reprojection error (mean / max, in mm)
    - wall-clock processing time
    - status (OK / LENS NOT FOUND / NO REFERENCE / ERROR)

And a summary listing every image where lens detection failed.
"""

import sys
import os
import time
import glob as _glob
from datetime import datetime

# Make the segment-anything package importable (same trick as server.py)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "segment-anything"))

from rich.console import Console
from rich.table import Table
from rich import box
from rich.panel import Panel

from src.segment.finalSam import (
    load_image,
    segment_lenses,
    detect_markers,
    compute_homography_mm,
)

IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "images"))
IMAGE_EXTS = ("*.jpg", "*.jpeg", "*.png", "*.heic",
              "*.JPG", "*.JPEG", "*.PNG", "*.HEIC")


def _collect_images(directory: str) -> list:
    paths = []
    for pattern in IMAGE_EXTS:
        paths.extend(_glob.glob(os.path.join(directory, pattern)))
    # Deduplicate (case-insensitive filesystems can double-match) and sort.
    seen = set()
    unique = []
    for p in paths:
        key = p.lower()
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return sorted(unique)


def _run_one(path: str) -> dict:
    """Run the pipeline on one image and return a result dict."""
    result = {
        "n_lenses": 0,
        "mean_err": float("nan"),
        "max_err": float("nan"),
        "status": "OK",
        "status_style": "green",
    }
    try:
        img, image = load_image(path)
        boxes, masks = segment_lenses(img, image)
        result["n_lenses"] = len(masks)

        found = detect_markers(image)
        _H, err = compute_homography_mm(found)
        result["mean_err"] = float(err.mean())
        result["max_err"] = float(err.max())

        if result["n_lenses"] == 0:
            result["status"] = "no lens"
            result["status_style"] = "yellow"
    except RuntimeError as exc:
        msg = str(exc)
        if "lens_not_found" in msg:
            result["status"] = "LENS NOT FOUND"
        elif "no_reference" in msg:
            result["status"] = "NO REFERENCE"
        else:
            result["status"] = msg
        result["status_style"] = "red"
    except Exception as exc:  # anything else (corrupt file, OOM, etc.)
        result["status"] = f"ERROR: {exc}"
        result["status_style"] = "red"
    return result


# Benchmark runner + CLI entry point
def run_benchmark() -> None:
    # record=True lets us export everything printed to the console as text/HTML.
    console = Console(record=True)

    paths = _collect_images(IMAGES_DIR)
    if not paths:
        console.print(f"[red]No images found in {IMAGES_DIR}[/red]")
        return

    #  Header / note 
    console.print()
    console.print(Panel(
        f"Running the vision pipeline on [bold]{len(paths)}[/bold] images from:\n"
        f"[cyan]{IMAGES_DIR}[/cyan]\n\n"
        "Timing excludes model loading (models are cached at import time).",
        title="[bold magenta]Vision Pipeline Benchmark[/bold magenta]",
        border_style="magenta",
    ))
    console.print()

    #  Build the table 
    table = Table(
        box=box.ROUNDED,
        show_lines=True,
        header_style="bold cyan",
        border_style="bright_blue",
        title_style="bold magenta",
    )
    table.add_column("#", style="dim", justify="right", width=4, no_wrap=True)
    table.add_column("Image", style="bold", no_wrap=True)
    table.add_column("Lenses", justify="center")
    table.add_column("Mean err (mm)", justify="right")
    table.add_column("Max err (mm)", justify="right")
    table.add_column("Time (s)", justify="right")
    table.add_column("Status", justify="center")

    failed_images: list = []
    n_ok = 0
    mean_errs: list = []
    max_errs: list = []
    lens_counts: list = []
    times: list = []
    total_start = time.time()

    for i, path in enumerate(paths, start=1):
        name = os.path.basename(path)
        t0 = time.time()
        res = _run_one(path)
        elapsed = time.time() - t0

        # Track stats for the summary AVERAGE row (skip NaNs for error columns).
        times.append(elapsed)
        lens_counts.append(res["n_lenses"])
        if res["mean_err"] == res["mean_err"]:  # not NaN
            mean_errs.append(res["mean_err"])
        if res["max_err"] == res["max_err"]:
            max_errs.append(res["max_err"])

        if res["n_lenses"] >= 1 and res["status_style"] != "red":
            n_ok += 1
        else:
            failed_images.append(name)

        mean_str = "-" if res["mean_err"] != res["mean_err"] else f"{res['mean_err']:.3f}"
        max_str  = "-" if res["max_err"]  != res["max_err"]  else f"{res['max_err']:.3f}"

        # Color the error cells: warn if max error is high (>1 mm)
        mean_style = "yellow" if (res["mean_err"] == res["mean_err"] and res["mean_err"] > 0.5) else ""
        max_style  = "red"    if (res["max_err"]  == res["max_err"]  and res["max_err"]  > 1.0) else ""

        table.add_row(
            str(i),
            name,
            str(res["n_lenses"]),
            f"[{mean_style}]{mean_str}[/]" if mean_style else mean_str,
            f"[{max_style}]{max_str}[/]"   if max_style  else max_str,
            f"{elapsed:.2f}",
            f"[{res['status_style']}]{res['status']}[/]",
        )

    total_elapsed = time.time() - total_start

    #  Add a bold "AVERAGE" summary row at the bottom of the table 
    avg_lenses = sum(lens_counts) / len(lens_counts) if lens_counts else 0.0
    avg_mean   = sum(mean_errs)   / len(mean_errs)   if mean_errs   else float("nan")
    avg_max    = sum(max_errs)    / len(max_errs)     if max_errs    else float("nan")
    avg_time   = sum(times)       / len(times)        if times       else 0.0

    avg_mean_str = "-" if avg_mean != avg_mean else f"{avg_mean:.3f}"
    avg_max_str  = "-" if avg_max  != avg_max  else f"{avg_max:.3f}"

    # Visual separator row made of box-drawing chars.
    sep = "─"
    table.add_row(
        sep * 4, sep * 14, sep * 6, sep * 13, sep * 12, sep * 8, sep * 6,
        style="dim",
    )
    # The actual AVERAGE row, bold across all cells.
    table.add_row(
        "",
        "AVERAGE",
        f"{avg_lenses:.2f}",
        avg_mean_str,
        avg_max_str,
        f"{avg_time:.2f}",
        "—",
        style="bold",
    )

    #  Render table + summary 
    console.print(table)
    console.print()

    console.rule("[bold magenta]Summary", style="magenta")
    summary = Table(box=None, show_header=False, padding=(0, 2))
    summary.add_column(style="bold")
    summary.add_column()
    summary.add_row("Total images",   str(len(paths)))
    summary.add_row("Detected lens",  f"[green]{n_ok}[/green]")
    summary.add_row("Failed",         f"[red]{len(failed_images)}[/red]")
    summary.add_row("Total time",     f"{total_elapsed:.2f} s")
    summary.add_row("Avg time/image", f"{total_elapsed / len(paths):.2f} s")
    console.print(summary)
    console.print()

    if failed_images:
        console.print("[bold red]Images where lens detection failed:[/bold red]")
        for name in failed_images:
            console.print(f"  [red]• {name}[/red]")
        console.print()
    else:
        console.print("[bold green]All images produced at least one lens.[/bold green]")
        console.print()

    #  Save the report to disk (.txt + styled .html)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = os.path.dirname(os.path.abspath(__file__))
    txt_path  = os.path.join(out_dir, f"benchmark_{stamp}.txt")
    html_path = os.path.join(out_dir, f"benchmark_{stamp}.html")

    with open(txt_path, "w", encoding="utf-8") as f:
        # clear=False keeps the record buffer alive so export_html() below
        # still has something to render. export_html() clears by default itself.
        f.write(console.export_text(clear=False))
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(console.export_html())

    # Use a non-recording console for the "saved" notice so it doesn't end up
    # inside the exported report itself.
    Console().print()
    Console().print("[bold]Saved benchmark report to:[/bold]")
    Console().print(f"  [cyan]{txt_path}[/cyan]")
    Console().print(f"  [cyan]{html_path}[/cyan]")
    Console().print(
        "[dim](open the .html in a browser for a styled version; "
        "use your browser's Print → Save as PDF for a PDF copy)[/dim]"
    )
    Console().print()


if __name__ == "__main__":
    run_benchmark()

