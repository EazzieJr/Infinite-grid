uniform float uRotation;
uniform float uTime;
uniform float uWaveAmplitude;

varying vec2 vUv;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float speed     = 200.0;
    float frequency = 2.0;
    float drag      = uRotation * 2.0;

    // Anchor inner edge (position.x = -0.75), max flutter at outer edge (position.x = 0.75)
    // Remap position.x from [-0.75, 0.75] to [0, 1]
    float t        = (position.x + 0.75) / 1.5;   // 0 at inner, 1 at outer
    float edgeFade = t * t;                         // ease in — subtle near anchor, strong at tip

    float wave = sin(position.x * frequency - sign(drag) * uTime * speed)
               * drag
               * edgeFade;

    wave = clamp(wave, -uWaveAmplitude, uWaveAmplitude);

    modelPosition.x += wave;
    modelPosition.z += wave * 0.2;

    vec4 viewPosition      = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    vUv = uv;
}