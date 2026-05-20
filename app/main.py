from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="mindnf", description="Минимизация ДНФ по гарвардскому алгоритму")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
@app.head("/")
async def index(request: Request) -> HTMLResponse:
    if request.method == "HEAD":
        return HTMLResponse()
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/profile", response_class=HTMLResponse)
@app.head("/profile")
async def profile(request: Request) -> HTMLResponse:
    if request.method == "HEAD":
        return HTMLResponse()
    return templates.TemplateResponse(request=request, name="profile.html")
