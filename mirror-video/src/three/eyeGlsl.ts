// Shared GLSL: value noise + eyelid aperture used by both skin and eyeball shaders.

export const NOISE_GLSL = /* glsl */ `
float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise3(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x),
                 mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),
                 mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise3(p); p*=2.03; a*=0.5; } return s; }
`;

/**
 * Almond-shaped palpebral aperture in eye-centred angular coordinates.
 * Returns signed angular distance: < 0 inside the opening.
 * side = -1 for the eye on -x (outer corner towards -x), +1 otherwise.
 */
export const APERTURE_GLSL = /* glsl */ `
uniform vec3 uEyeC0;
uniform vec3 uEyeC1;
uniform float uEyeR;
uniform float uOpen;
uniform vec4 uAp;     // inner az, outer az, upper lift, lower drop
uniform float uSlit0;
uniform float uSlit1;
float apertureD(vec3 p, vec3 C, float side, float slit, out float tt, out float above){
  vec3 r = p - C;
  float rr = length(r);
  float th = atan(side * r.x, r.z);
  float ph = atan(r.y, length(r.xz));
  float t = (th - uAp.x) / (uAp.y - uAp.x);
  tt = t;
  if (t <= 0.0 || t >= 1.0 || rr > uEyeR * 1.75 || r.z < -0.2 * uEyeR) { above = 1e3; return 1e3; }
  float s = sin(3.14159265 * pow(t, 0.92));
  float up = slit + uAp.z * uOpen * pow(s, 0.62) - 0.02 * (1.0 - uOpen);
  float lo = slit - uAp.w * uOpen * pow(s, 0.95);
  above = ph - up;
  return max(ph - up, lo - ph);
}
`;
