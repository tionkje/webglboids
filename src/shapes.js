import undent from './undent.js';
import { createProgram, getProgramSetters } from "./glUtil.js"

export class CircleRender{
  constructor(gl){
    this.numSlices = 32;
    this.gl = gl;
    this.load();
  }

  load(){
    const vs = undent`
      #version 300 es
      uniform mat4 viewProj;
      uniform vec3 position;
      uniform float radius;

      #define PI radians(180.0)

      void main() {
        int numSlices = ${this.numSlices};
        int sliceId = gl_VertexID / 3;
        int triVertexId = gl_VertexID % 3;
        int edge = triVertexId + sliceId;
        float angleU = 1.-float(edge) / float(numSlices);  // 0.0 to 1.0
        float angle = angleU * PI * 2.0;
        float radius = step(float(triVertexId), 1.5)*radius;
        vec3 pos = vec3(cos(angle), sin(angle), 0) * radius;
        pos += position;
        gl_Position = viewProj*vec4(pos, 1);
      }
    `;

    const fs = undent`
      #version 300 es
      precision highp float;

      uniform vec4 color;

      out vec4 outColor;

      void main() {
        outColor = color;
      }
    `;

    const program = this.program = createProgram(gl,vs,fs);
    this.setters = getProgramSetters(gl, program);
  }
  
  render(){
    const gl = this.gl;
    const numVerts = this.numSlices * 3;
    this.setters.uniforms.resolution?.([gl.canvas.width, gl.canvas.height]);

    gl.drawArrays(gl.TRIANGLES, 0, numVerts);
  }
}
