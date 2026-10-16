/**
 * Remotion 渲染配置
 * - WebGL：无 GPU 的服务器上用 swangle（SwiftShader）软件渲染，有 GPU 可改为 'angle'
 * - 编码：H.264 / yuv420p，抖音直接可用
 */
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setChromiumOpenGlRenderer('swangle');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(22);
Config.setX264Preset('slow');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
