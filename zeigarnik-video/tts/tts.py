# Kokoro v1.1（Apache-2.0）本地中文配音：python3 tts.py <out.wav> <speaker_id> <speed> <text>
import sys, sherpa_onnx, soundfile as sf
M = '/home/user/tts/kokoro-multi-lang-v1_1/'
_tts = None
def tts():
    global _tts
    if _tts is None:
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=M + 'model.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt',
                    data_dir=M + 'espeak-ng-data', dict_dir=M + 'dict',
                    lexicon=M + 'lexicon-us-en.txt,' + M + 'lexicon-zh.txt'),
                num_threads=4, provider='cpu'),
            rule_fsts=M + 'date-zh.fst,' + M + 'number-zh.fst', max_num_sentences=1)
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts
def say(out, sid, speed, text):
    a = tts().generate(text, sid=sid, speed=speed)
    sf.write(out, a.samples, samplerate=a.sample_rate, subtype='PCM_16')
    return len(a.samples) / a.sample_rate
if __name__ == '__main__':
    print(round(say(sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]), 3))
