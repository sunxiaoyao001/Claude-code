"""Single editable source for the script draft; writes research/script.md.

Frames are at 30 fps. BPM 75 -> beat 24 f, bar 96 f, eighth 12 f.
"""
import re
import sys

FPS = 30
BPM = 75
BEAT = FPS * 60 // BPM  # 24
BAR = BEAT * 4  # 96
BARS = 28
TOTAL = BAR * BARS  # 2688

# (start, end, zh, en, visual, images, motion, sfx, facts)
LINES = [
    # P1 · bars 1-4 · cold open, bet, title
    (0, 84, "这张林肯像，只有头是林肯的", "Only the head is Lincoln's",
     "第 0 帧即封面：档案桌上一张带白边的相纸，林肯全身像，倾斜 0.8°，主体落右三分线", "IMG01",
     "镜头呼吸 1%/s 缓推；第 0 帧字幕已在位，不做入场", "房间底噪起；无入场音", "F01"),
    (84, 148, "身体，来自另一个人", "The body is someone else's",
     "放大镜滑到脖子，框内 2.5×，框外压暗；朱砂 Underline 沿脖颈接缝画出", "IMG01",
     "Loupe 位移 bezier(0.65,0,0.35,1) 18f；Underline progress 96→120", "放大镜机械声 @84；纸张点击", "F01"),
    (148, 288, "猜猜，这身体是谁的", "Guess whose body this is",
     "相纸左移到 1/3；右侧两张牛皮纸档案签依次落下：A 华盛顿 / B 奴隶制的头号辩护者；240/256/272 帧 Plex Mono 倒计时 03·02·01", "IMG01",
     "档案签 spring(damping 200) 落在拍点 168 / 192；倒计时为四分三连音", "档案签落纸声 ×2；倒计时打字机 ×3", "F05"),
    (288, 384, "", "",
     "标题卡：「林肯的 3 张假像」Noto Serif SC 900 + 朱砂方印；英文 Three Fake Lincolns；右上档案签换成 ARCHIVE No.001 · c.1865 · NEW YORK", "IMG01",
     "印章盖下 6f 压入 + 墨晕扩散 10f；盖下即切", "印章声 @288（峰值对齐）", "F01"),
    # P2 · bars 5-8 · fake #1 (Calhoun body)
    (384, 468, "答案是 B：约翰·卡尔霍恩", "Answer: B — John C. Calhoun",
     "竖向擦除线从左扫到右：林肯合成像 → 1852 年卡尔霍恩原版画（两张已对齐），除了头完全重合", "IMG01, IMG02",
     "擦除线 bezier 24f，落在第 5 小节重拍（全片第一个高潮，钢琴进入）", "低频纸张摩擦 + 关键词印章声 @384", "F02, F05"),
    (468, 552, "他说奴隶制是「积极的善」", "He called slavery “a positive good”",
     "从身体推到卡尔霍恩的脸（match cut）；档案签 JOHN C. CALHOUN · 1782–1850", "IMG02",
     "推近 4%，bezier 36f", "纸张点击", "F04, F06"),
    (552, 624, "版画师只换了一颗头", "The engraver swapped only the head",
     "两张相纸上下叠放，像对位底片一样移动到重合；擦除线来回扫一次", "IMG01, IMG02",
     "对位 spring(damping 200)；擦除线 2 拍往返", "相纸滑动摩擦", "F01, F02"),
    (624, 684, "连桌上的字都改了", "Even the papers on the table were rewritten",
     "放大镜移到桌上文件，框内 2.5×", "IMG02",
     "Loupe 位移 18f", "放大镜机械声", "F03"),
    (684, 768, "州的主权，改成了「自由宣言」", "“Sovereignty of the States” became “Proclamation of Freedom”",
     "放大镜内左右对照：卡尔霍恩版 SOVEREIGNTY OF THE STATES 被朱砂 Box 框住 → 林肯版 PROCLAMATION OF FREEDOM 加朱砂 Underline", "IMG02, IMG01",
     "rough-notation progress 由 interpolate 驱动 20f", "关键词印章声（轻）", "F03"),
    # P3 · bars 9-12 · fake #2 (Mumler ghost)
    (768, 840, "这只是第 1 张", "That was only the first",
     "胶片条从右滑入，第一格是林肯合成像，后面几格是 Mumler 的其他灵异照片；右上档案签换成 No.002 · c.1872 · BOSTON", "IMG01, IMG08",
     "胶片条匀加速后 bezier 减速，停在第 9 小节重拍", "放映机咔嗒", ""),
    (840, 924, "第 2 张，主角是他的遗孀", "The second stars his widow",
     "胶片条选中一格放大进入下一镜：显影盘里一张小相纸（Mumler 原图低清，只占画面 35% 宽）", "IMG03",
     "选格 → 推进 match cut 20f", "显影液轻响", "F07"),
    (924, 996, "她报了假名，走进照相馆", "She gave a false name at the studio",
     "显影：先浮现最深的影调——黑裙、椅子、她的脸", "IMG03",
     "curves 密度曲线由 interpolate 驱动（不是改 opacity）", "液体轻响（低）", "F09"),
    (996, 1080, "照片洗出来，他就站在她身后", "Developed, it showed him standing behind her",
     "显影后段：最淡的灰调最后出现——她身后的「林肯」浮出来", "IMG03",
     "curves 第二段；镜头呼吸", "液体 + 极轻低频 swell", "F07"),
    (1080, 1152, "双手，搭在她肩上", "His hands on her shoulders",
     "朱砂 Circle 圈出肩上的两只手（原图低清：不做 2.5× 放大，只用圈注 + 局部压暗）", "IMG03",
     "Circle progress 20f", "红笔划纸声", "F07"),
    # P4 · bars 13-16 · trial and mechanism
    (1152, 1228, "拍照的人，上过法庭", "The photographer had been tried",
     "Harper's Weekly 1869 年漫画版面 halftone 网点 + 局部高亮写着 MUMLER'S 的招牌（若无公有领域扫描，改用 Mumler 其他照片的接触印样）", "IMG09 / IMG08",
     "版面斜向 0.5° 缓推", "翻页声", "F10"),
    (1228, 1308, "1869 年，他因欺诈受审", "In 1869, he stood trial for fraud",
     "打字机日期戳打出 NEW YORK · APRIL 1869", "IMG09 / IMG08",
     "逐字打出，每字 3f", "打字机 ×N（音高随机 ±1 半音）", "F10"),
    (1308, 1380, "证据不足，法官放了他", "No proof — the judge let him go",
     "相纸被抽走，桌面只剩档案签", "",
     "抽出 bezier 16f", "相纸滑动", "F10"),
    (1380, 1456, "可在暗房里，造鬼不难", "Yet in a darkroom, a ghost is easy",
     "转到看片灯桌（暗纸底色），两张透明底片的轮廓入画；角标「示意」", "",
     "底片 spring 落位", "放映机风扇底噪起", "F10, F11"),
    (1456, 1536, "一块底片，曝光两次", "One plate, two exposures",
     "示意：一张肖像底片与一张淡影底片叠合，叠加区显出「鬼影」；角标「示意」", "",
     "两片沿 x 轴相向滑动重合，bezier 32f", "快门 ×2（两次曝光，落在拍点）", "F11"),
    # P5 · bars 17-20 · Grant composite, then silence
    (1536, 1616, "或者三张底片，拼成一张", "Or three negatives, made into one",
     "LoC《General Grant at City Point》全幅显影；右上档案签 EXHIBIT · c.1902 · L.C. HANDY", "IMG04",
     "显影母题（快速版 24f）", "快门（重拍）", "F12"),
    (1616, 1704, "这位格兰特将军，只有头是他的", "This General Grant: only the head is his",
     "朱砂 Circle 圈头部，标签 HEAD · GRANT · COLD HARBOR 1864", "IMG04",
     "推近头部 6%，Circle 20f", "红笔划纸声", "F12"),
    (1704, 1784, "马和身体，是另一位将军", "Horse and body: another general",
     "朱砂 Box 框马和身体，标签 BODY · MAJ. GEN. McCOOK", "IMG04",
     "横移到马身，Box 20f", "红笔划纸声", "F12"),
    (1784, 1872, "背景，是一群南军俘虏", "Background: Confederate prisoners",
     "朱砂 Underline 划过背景人群，标签 BACKGROUND · FISHER'S HILL", "IMG04",
     "拉远回全幅", "红笔划纸声", "F12"),
    (1872, 1920, "", "",
     "格兰特相纸滑出画面，桌面变空；一只玻璃幻灯片盒推入画面边缘", "",
     "1905–1920 帧全片静默 0.5 秒（只留房间底噪）", "音乐静默 0.5 秒", ""),
    # P6 · bars 21-25 · twist (the one heavy punch)
    (1920, 2008, "第 3 张，出自逃脱大师胡迪尼", "The third came from escape artist Houdini",
     "【全片唯一重拳】放映机光斑从小取景框扩张成全屏：胡迪尼与「林肯鬼魂」玻璃幻灯片，此刻还原原扫描色调", "IMG05",
     "取景框扩张 20f；色彩还原 18f", "放映机咔嗒 + sub hit（峰值对齐 1920）", "F13, F20"),
    (2008, 2084, "他亲手造鬼，是为了打假", "He made the ghost himself — to expose the fraud",
     "放大镜看胡迪尼身后的淡影；朱砂 Circle 圈住「林肯」；画面回到统一调色", "IMG05",
     "Loupe 18f；Circle 20f", "放大镜机械声", "F13"),
    (2084, 2164, "1926 年万圣节，他死了", "He died on Halloween, 1926",
     "1926 年报道他死讯的剪报，halftone 网点，局部高亮死讯标题；档案签 No.003 · 1926 · DETROIT", "IMG07",
     "版面缓推 + 局部压暗", "翻页声", "F14"),
    (2164, 2236, "他和妻子约好一句暗号", "He and his wife agreed on a code",
     "牛皮纸档案签上，打字机打出 ROSABELLE, BELIEVE", "IMG06",
     "逐字打出，每字 4f，落在十六分音符", "打字机 ×17", "F15"),
    (2236, 2316, "她等这句暗号，等了 10 年", "She waited 10 years for it",
     "Plex Mono 年份计数器从 1927 跳到 1936（10 个万圣节，每个落在八分音符上），背景是胡迪尼锁链全身像", "IMG06",
     "计数器每 8f 一跳", "极轻打字机点击 ×10", "F16"),
    (2316, 2400, "最后一场降神会，什么也没来", "At the last séance, nothing came",
     "计数器停在 1936；胡迪尼相纸被慢慢压暗", "IMG06",
     "密度曲线反向（像底片曝光过度）", "钢琴单音延音", "F17"),
    # P7 · bars 26-28 · golden line, interaction, credits, loop
    (2400, 2508, "骗你的，是你想相信", "What fools you is wanting to believe",
     "金句（全片最大字号，两行以内）；背景是三张假像排成接触印样", "IMG01, IMG03, IMG05",
     "逐字落下，每字落在一个八分音符（12f）", "sub hit（低）@2400；全编制", ""),
    (2508, 2592, "如果你是林肯夫人，你信吗", "If you were Mrs. Lincoln — would you believe?",
     "Mumler 相纸回到桌上；两张档案签 A 信 / B 不信", "IMG03",
     "档案签落在拍点", "档案签落纸声 ×2", ""),
    (2592, 2664, "", "",
     "署名卡：全部图片与音效出处（档案签样式，Plex Mono 小字）", "",
     "相纸翻面露出背面的署名", "相纸翻面声", ""),
    (2664, 2688, "这张林肯像，只有头是林肯的", "Only the head is Lincoln's",
     "回到第 0 帧构图，最后一帧与第 0 帧一致，可无缝循环", "IMG01",
     "镜头复位到第 0 帧参数", "房间底噪", "F01"),
]

HOOKS = [
    ("A · 陈述句（当前采用）", "这张林肯像，只有头是林肯的", "身体，来自另一个人",
     "第 0 帧即给出完整结论式缺口；放大镜在 2.8 秒指向脖子接缝"),
    ("B · 问句", "这张林肯像，哪里是假的", "答案在脖子上",
     "第 0 帧是问题；第 2.8 秒放大镜给出位置但不给出答案"),
    ("C · 直接下注", "这具身体，不是林肯的", "猜猜是谁的",
     "跳过第二句铺垫，1.5 秒内就进入下注，倒计时提前约 1 秒"),
]

SECTIONS = [
    ("P1", 1, 4, "冷开场 → 下注 → 标题卡", "只有 pad（小调，低）"),
    ("P2", 5, 8, "证据链 · 第 1 张：卡尔霍恩的身体", "第 5 小节重拍钢琴进入 = 全片第一个高潮"),
    ("P3", 9, 12, "证据链 · 第 2 张：遗孀身后的鬼", "钢琴 + 轻脉冲"),
    ("P4", 13, 16, "机制 · 审判与双重曝光", "加低音 pad + 轻打击（刷子、滴答）"),
    ("P5", 17, 20, "机制 · 格兰特三拼 → 静默", "1905–1920 帧全静默 0.5 秒"),
    ("P6", 21, 25, "反转 · 胡迪尼（5 小节扩展乐句）", "重拳：sub hit + 色彩还原；钢琴主题回来"),
    ("P7", 26, 28, "落点金句 → 互动 → 署名 → 循环", "全编制 → 回落到 pad 尾音"),
]


def tc(frame):
    s, f = divmod(frame, FPS)
    m, s = divmod(s, 60)
    return f"{m:02d}:{s:02d}.{f:02d}"


def zh_len(s):
    return len(re.sub(r"[\s「」]", "", s))


def min_frames(n):
    return max(1.2, 0.6 + n * 0.16) * FPS


def check():
    errors = []
    prev_end = 0
    for i, (a, b, zh, *_rest) in enumerate(LINES):
        if a != prev_end:
            errors.append(f"line {i}: starts at {a}, previous ended at {prev_end}")
        prev_end = b
        # The final loop row repeats frame 0's subtitle; it is not read as a new line.
        if zh and i != len(LINES) - 1:
            n = zh_len(zh)
            if n > 14:
                errors.append(f"line {i}: {n} chars > 14: {zh}")
            if zh.endswith("。"):
                errors.append(f"line {i}: ends with a full stop")
            if b - a < min_frames(n) - 1e-6:
                errors.append(f"line {i}: {b - a}f < min {min_frames(n):.1f}f ({n} chars): {zh}")
    if prev_end != TOTAL:
        errors.append(f"timeline ends at {prev_end}, expected {TOTAL}")
    return errors


def render():
    out = []
    out.append("# 剧本：林肯的 3 张假像（Three Fake Lincolns）\n")
    out.append(f"- 总时长 **{TOTAL / FPS:.1f} 秒** = {TOTAL} 帧 @ {FPS} fps")
    out.append(f"- 节拍网格：{BPM} BPM，4/4；1 拍 = {BEAT} 帧，1 小节 = {BAR} 帧，八分音符 = {BEAT // 2} 帧；共 {BARS} 小节")
    out.append("- 画幅 9:16，1080×1920；中文主字幕 + 英文斜体副字幕；无配音\n")
    out.append("## 乐句与叙事弧\n")
    out.append("| 乐句 | 小节 | 帧 | 时间 | 占比 | 段落 | 配乐 |")
    out.append("|---|---|---|---|---|---|---|")
    for name, b0, b1, what, music in SECTIONS:
        f0, f1 = (b0 - 1) * BAR, b1 * BAR
        out.append(f"| {name} | {b0}–{b1} | {f0}–{f1} | {tc(f0)}–{tc(f1)} | "
                   f"{f0 / TOTAL:.0%}–{f1 / TOTAL:.0%} | {what} | {music} |")
    out.append("\n## 前 3 秒 · 三个钩子版本（由分镜评审选定）\n")
    out.append("| 版本 | 第 0 帧字幕 | 第 2.8 秒字幕 | 说明 |")
    out.append("|---|---|---|---|")
    for h in HOOKS:
        out.append(f"| {h[0]} | {h[1]} | {h[2]} | {h[3]} |")
    out.append("\n## 逐句表\n")
    out.append("时间码格式 `分:秒.帧`。字数不含空格和「」；停留下限 = max(1.2 s, 0.6 s + 字数 × 0.16 s)。\n")
    out.append("| # | 时间码 | 帧 | 中文字幕 | 英文副字幕 | 画面 | 图片ID | 运动 | 音效 | 事实ID |")
    out.append("|---|---|---|---|---|---|---|---|---|---|")
    for i, (a, b, zh, en, vis, img, mot, sfx, fid) in enumerate(LINES, 1):
        z = f"{zh}（{zh_len(zh)} 字）" if zh else "—"
        out.append(f"| {i:02d} | {tc(a)}–{tc(b)} | {a}–{b} | {z} | {('*' + en + '*') if en else '—'} | "
                   f"{vis} | {img or '—'} | {mot} | {sfx} | {fid or '—'} |")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    errs = check()
    for e in errs:
        print("ERROR", e)
    if errs:
        sys.exit(1)
    open(sys.argv[1], "w").write(render())
    print("ok", len(LINES), "rows,", TOTAL, "frames")
