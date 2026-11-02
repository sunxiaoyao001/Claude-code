import {continueRender, delayRender, staticFile} from 'remotion';

const FILES: [string, string, string, string][] = [
  ['Serif SC', 'serif-sc.woff2', '600', 'normal'],
  ['Cormorant', 'cormorant.woff2', '300 700', 'normal'],
  ['Cormorant', 'cormorant-italic.woff2', '300 700', 'italic'],
  ['WenKai', 'wenkai.woff2', '400', 'normal'],
];

let started = false;
export const loadFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender('Loading fonts');
  Promise.all(
    FILES.map(([family, file, weight, style]) =>
      new FontFace(family, `url(${staticFile('fonts/' + file)})`, {weight, style})
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
};
