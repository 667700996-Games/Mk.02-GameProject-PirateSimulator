#!/usr/bin/env bash
set -euo pipefail

asset_dir="static/audio"
mkdir -p "$asset_dir"

ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=brown:amplitude=0.18:duration=24:sample_rate=44100" -af "lowpass=f=900,tremolo=f=0.11:d=0.35,afade=t=in:d=1,afade=t=out:st=23:d=1" -c:a libvorbis -q:a 3 "$asset_dir/ocean-loop.ogg"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.07:duration=24:sample_rate=44100" -af "bandpass=f=720:w=1.2,tremolo=f=0.1:d=0.2,afade=t=in:d=1,afade=t=out:st=23:d=1" -c:a libvorbis -q:a 3 "$asset_dir/harbor-loop.ogg"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=white:amplitude=0.11:duration=18:sample_rate=44100" -af "highpass=f=900,lowpass=f=6500,tremolo=f=7:d=0.18,afade=t=in:d=0.5,afade=t=out:st=17.5:d=0.5" -c:a libvorbis -q:a 3 "$asset_dir/rain-loop.ogg"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=62:duration=1.1:sample_rate=44100" -f lavfi -i "anoisesrc=color=brown:amplitude=0.45:duration=1.1:sample_rate=44100" -filter_complex "[0:a]volume=0.85,afade=t=out:st=0.08:d=1.02[a];[1:a]lowpass=f=1700,afade=t=out:st=0.02:d=0.95[b];[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.9" -c:a libvorbis -q:a 4 "$asset_dir/cannon-heavy.ogg"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=brown:amplitude=0.42:duration=0.55:sample_rate=44100" -af "bandpass=f=520:w=1.3,afade=t=out:st=0.02:d=0.5,alimiter=limit=0.8" -c:a libvorbis -q:a 4 "$asset_dir/hull-impact.ogg"
