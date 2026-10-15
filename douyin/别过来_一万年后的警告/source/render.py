# -*- coding: utf-8 -*-
"""分段并行渲染：python3 render.py WIDTH FPS OUTDIR NWORKERS [quality]
每个 worker 渲染连续的一段帧，直接管道送入 x264，最后无损拼接并混入音频。"""
import sys, os, time, subprocess, math, json
sys.path.insert(0, '/tmp/claude-0/proj')


def worker(idx, f0, f1, W, H, fps, path, quality):
    from engine.core import Frame
    from engine import timeline as TL
    from engine import film
    from scenes import shots as SH
    tl = TL.load()
    shots, ctx = SH.build(tl)
    subs = film.build_subs(tl)
    fr = Frame(W, H)
    if quality == 'final':
        venc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-tune', 'film', '-profile:v', 'high',
                '-level:v', '5.2', '-maxrate', '40M', '-bufsize', '80M', '-g', str(fps * 2),
                '-x264-params', 'keyint=%d:min-keyint=%d:scenecut=0:aq-mode=3' % (fps * 2, fps),
                '-threads', '3']
    else:
        venc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-g', str(fps * 2), '-threads', '2']
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '%dx%d' % (W, H),
           '-r', str(fps), '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p'] + venc + \
          ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
           '-an', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    st = time.time()
    log = open(path + '.log', 'w')
    for f in range(f0, f1):
        t = f / fps
        a = film.render_frame(fr, t, shots, subs, ctx)
        p.stdin.write(a.tobytes())
        if (f - f0) % (fps * 5) == 0:
            el = time.time() - st
            done = f - f0 + 1
            log.write('%d/%d  %.1fs  eta %.0fs\n' % (done, f1 - f0, el, el / done * (f1 - f0 - done)))
            log.flush()
    p.stdin.close()
    p.wait()
    log.write('done %.1fs\n' % (time.time() - st))
    log.close()


if __name__ == '__main__':
    W = int(sys.argv[1]); fps = int(sys.argv[2]); outdir = sys.argv[3]; nw = int(sys.argv[4])
    quality = sys.argv[5] if len(sys.argv) > 5 else 'preview'
    H = W * 9 // 16
    os.makedirs(outdir, exist_ok=True)
    tl = json.load(open('/tmp/claude-0/proj/audio/timeline.json'))
    total = tl['total']
    nf = int(math.floor(total * fps))
    if len(sys.argv) > 6 and sys.argv[6] == 'worker':
        idx, f0, f1 = int(sys.argv[7]), int(sys.argv[8]), int(sys.argv[9])
        worker(idx, f0, f1, W, H, fps, os.path.join(outdir, 'part%02d.mp4' % idx), quality)
        sys.exit(0)
    # 按 GOP 对齐切成多段，nw 个进程并发处理（任务队列，负载更均衡）
    g = fps * 2
    nchunks = int(os.environ.get('NCHUNKS', nw * 3))
    per = int(math.ceil(nf / nchunks / g)) * g
    jobs = []
    i = 0
    while i * per < nf:
        jobs.append((i, i * per, min(nf, (i + 1) * per)))
        i += 1
    running = []
    pending = list(jobs)
    while pending or running:
        while pending and len(running) < nw:
            idx, f0, f1 = pending.pop(0)
            if os.path.exists(os.path.join(outdir, 'part%02d.mp4.log' % idx)) and \
                    'done' in open(os.path.join(outdir, 'part%02d.mp4.log' % idx)).read():
                continue
            running.append(subprocess.Popen([sys.executable, __file__, str(W), str(fps), outdir, str(nw), quality,
                                             'worker', str(idx), str(f0), str(f1)]))
        time.sleep(2)
        running = [p for p in running if p.poll() is None]
    with open(os.path.join(outdir, 'list.txt'), 'w') as f:
        for idx, f0, f1 in jobs:
            f.write("file 'part%02d.mp4'\n" % idx)
    print('parts done', nf, 'frames', len(jobs), 'chunks')
