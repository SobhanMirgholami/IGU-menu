# Turns out/timeline.json + out/frames/ into out/IGU-Cafe-Demo.mp4 (needs ffmpeg).
# Usage: python3 compose.py [out-folder]
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, 'out')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BLUE, INK, POP = '0x0B3D91', '0x0E1630', '0xFFC93C'
W, H, VH, VY = 1920, 1080, 880, 150
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30']

tl = json.load(open(os.path.join(OUT, 'timeline.json')))
t0, end = tl['t0'], tl['end']
dur = end - t0
tmp = os.path.join(OUT, 'tmp')
os.makedirs(tmp, exist_ok=True)

def run(args):
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + args, check=True)

def concat_list(name):
    frames = tl['streams'][name]['frames']
    folder = os.path.join(OUT, 'frames', name)
    lines = ['ffconcat version 1.0']
    first = frames[0][1]
    if first > t0:
        lines += [f"file '{frames[0][0]}'", f'duration {first - t0:.4f}']
    for i, (f, ts) in enumerate(frames):
        nxt = frames[i + 1][1] if i + 1 < len(frames) else end
        start = max(ts, t0)
        if nxt <= start:
            continue
        lines += [f"file '{f}'", f'duration {nxt - start:.4f}']
    lines.append(f"file '{frames[-1][0]}'")
    path = os.path.join(folder, 'list.ffconcat')
    open(path, 'w').write('\n'.join(lines) + '\n')
    return path

def esc(path):
    return path.replace('\\', '/').replace(':', '\\:').replace("'", "\\'")

def text(i, s):
    p = os.path.join(tmp, f'text{i}.txt')
    open(p, 'w', encoding='utf-8').write(s)
    return esc(p)

def even(x):
    return int(round(x / 2)) * 2

sv, mv = tl['streams']['student']['viewport'], tl['streams']['manager']['viewport']
sw, mw = even(sv['width'] * VH / sv['height']), even(mv['width'] * VH / mv['height'])
gap = (W - sw - mw) // 3
sx, mx = gap, gap * 2 + sw

f = [
    f'[0:v]fps=30,scale={sw}:{VH}:flags=lanczos,setsar=1[s]',
    f'[1:v]fps=30,scale={mw}:{VH}:flags=lanczos,setsar=1[m]',
    f'color=c={BLUE}:s={W}x{H}:r=30:d={dur:.3f}[bg]',
    f'[bg]drawbox=x={sx+10}:y={VY+10}:w={sw}:h={VH}:color={INK}:t=fill,'
    f'drawbox=x={mx+10}:y={VY+10}:w={mw}:h={VH}:color={INK}:t=fill[bg2]',
    f'[bg2][s]overlay={sx}:{VY}[a]',
    f'[a][m]overlay={mx}:{VY}[b]',
]
chain = [
    f'drawbox=x={sx-4}:y={VY-4}:w={sw+8}:h={VH+8}:color={INK}:t=4',
    f'drawbox=x={mx-4}:y={VY-4}:w={mw+8}:h={VH+8}:color={INK}:t=4',
    f"drawtext=fontfile={FONT}:textfile='{text('ls', 'Student phone')}':fontsize=24:fontcolor=white@0.9:x={sx}+({sw}-text_w)/2:y={VY+VH+16}",
    f"drawtext=fontfile={FONT}:textfile='{text('lm', 'Café dashboard · manager account')}':fontsize=24:fontcolor=white@0.9:x={mx}+({mw}-text_w)/2:y={VY+VH+16}",
    f"drawtext=fontfile={FONT}:textfile='{text('brand', 'IGU Café · live site')}':fontsize=22:fontcolor={POP}:x={sx}:y=26",
]
caps = tl['caps']
for i, c in enumerate(caps):
    a = c['t'] - t0
    b = caps[i + 1]['t'] - t0 if i + 1 < len(caps) else dur
    chain.append(
        f"drawtext=fontfile={FONT}:textfile='{text(i, str(c['step']) + '  ·  ' + c['text'])}':fontsize=34:fontcolor=white:"
        f"box=1:boxcolor={INK}:boxborderw=20:x=(w-text_w)/2:y=62:enable='between(t,{a:.2f},{b:.2f})'"
    )
f.append('[b]' + ','.join(chain) + '[v]')

main = os.path.join(tmp, 'main.mp4')
run(['-f', 'concat', '-safe', '0', '-i', concat_list('student'),
     '-f', 'concat', '-safe', '0', '-i', concat_list('manager'),
     '-filter_complex', ';'.join(f), '-map', '[v]', '-t', f'{dur:.3f}'] + ENC + [main])

def card(name, secs, lines):
    draws = [f'drawbox=x=(iw-120)/2:y=300:w=120:h=120:color={POP}:t=fill',
             f'drawbox=x=(iw-120)/2:y=300:w=120:h=120:color={INK}:t=6']
    y = 470
    for i, (s, size, color, font) in enumerate(lines):
        draws.append(f"drawtext=fontfile={font}:textfile='{text(name + str(i), s)}':fontsize={size}:fontcolor={color}:x=(w-text_w)/2:y={y}")
        y += size + 34
    draws.append(f'fade=t=in:st=0:d=0.5,fade=t=out:st={secs-0.6}:d=0.6')
    path = os.path.join(tmp, name + '.mp4')
    run(['-f', 'lavfi', '-i', f'color=c={BLUE}:s={W}x{H}:r=30:d={secs}', '-vf', ','.join(draws)] + ENC + [path])
    return path

intro = card('intro', 3.5, [
    ('IGU Café', 110, 'white', FONT),
    ('The real app, recorded live', 38, POP, FONT),
    (tl['site'].replace('https://', ''), 30, 'white@0.85', FONT_REG),
])
outro = card('outro', 4.5, [
    ('IGU Café', 110, 'white', FONT),
    ('React + Vite  ·  Tailwind  ·  Supabase  ·  Vercel', 34, POP, FONT),
    ('Order from your phone, skip the line.', 32, 'white@0.85', FONT_REG),
])

lst = os.path.join(tmp, 'all.txt')
open(lst, 'w').write(''.join(f"file '{p}'\n" for p in [intro, main, outro]))
final = os.path.join(OUT, 'IGU-Cafe-Demo.mp4')
run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', final])
print('saved', final)
