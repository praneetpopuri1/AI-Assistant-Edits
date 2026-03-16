import yt_dlp

url = "https://www.youtube.com/watch?v=OhKM1l7Lfs4"

ydl_opts = {
    "outtmpl": "videos/%(title)s.%(ext)s",
    "format": "bestvideo+bestaudio/best",
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([url])