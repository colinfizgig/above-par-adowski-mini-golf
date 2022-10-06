/** @format */

AFRAME.registerComponent("shadow-shader", {
  schema: {
    fade: { type: "number", default: 0.6 },
    opacity: { type: "number", default: 1 },
  },
  init: function () {
    const newMaterial = new THREE.ShaderMaterial({
      uniforms: {
        fade: {
          value: this.data.fade,
        },
        opacity: {
          value: this.data.opacity,
        },
      },

      vertexShader: `
      varying vec2 vUv;
      void main()
      {
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }

            `,

      fragmentShader: `
      precision mediump float;
      uniform float fade;
      uniform float opacity;
      varying vec2 vUv;

      float fuzzyCircle(in vec2 _st, in float _radiusInner, in float _radiusOuter){
        vec2 dist = _st-vec2(0.5);
        return 1.-smoothstep(_radiusInner-(_radiusInner*0.01),
                       _radiusOuter+(_radiusOuter*0.01),
                       dot(dist,dist)*3.0);
      }

      void main()
      {   
          
          // Start off white
          vec3 color = vec3(1.0, 1.0, 1.0); 
          
          // Subtract the white circle from white which makes the circle black
          // Made dot product *3 to make a bigger circle and then passing in .75 to reduce the radius. Results in softer circle with tighter center.
          color = color - vec3(fuzzyCircle(vUv,.75 - fade, .75));
          
          // If color is less than full white (1.0) then add to it, bringing it closer to white (white is blended out)
          if(color.x < 1.0) color = color + (1.0 - opacity);

          // Output final fragment color
          gl_FragColor = vec4( color, 1.0 );
      }
            `,
    });

    newMaterial.transparent = true;
    newMaterial.blending = THREE.MultiplyBlending;
    newMaterial.needsUpdate = true;

    this.material = newMaterial;

    this.el.object3D.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = newMaterial;
      }
    });
  },

  tick() {},
});
