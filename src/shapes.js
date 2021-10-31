import undent from './undent.js';
import { createProgram, getProgramSetters } from "./glUtil.js"


export class Circle{
  numSlices = 32;
  loaded = false;

  constructor(gl){
    this.gl = gl;
  }

  setViewProj(viewProj){this.viewProj=viewProj;}
  setRadius(radius){this.radius=radius;}
  setColor(color){this.color=color;}
  setPosition(position){this.position=position;}

  load(){
    if(this.loaded) return;
    this.loaded = true;

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
    this.load();

    this.setters.uniforms.position(this.position);
    this.setters.uniforms.radius([this.radius]);
    this.setters.uniforms.color(this.color);
    this.setters.uniforms.viewProj(this.viewProj);

    this.gl.drawArrays(gl.TRIANGLES, 0, this.numSlices*3);
  }
}

export class Rect{
  loaded = false;

  constructor(gl){
    this.gl = gl;
    this.setDimensios(0,0,0,0);
  }

  setColor(color){this.color=color;}
  setViewProj(viewProj){this.viewProj=viewProj;}
  setDimensios(x,y,w,h){
    const idxs = [0,2,1,1,2,3];
    const vtxs = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]];
    this.position = new Float32Array(idxs.flatMap(i=> [...vtxs[i],0]));
  }

  load(){
    if(this.loaded) return;
    this.loaded = true;

    const vs = undent`
      #version 300 es
      uniform mat4 viewProj;
      in vec3 position;

      void main() {
        gl_Position = viewProj*vec4(position, 1);
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
    this.load();

    this.setters.uniforms.color(this.color);
    this.setters.uniforms.viewProj(this.viewProj);
    this.setters.attribs.position(this.position);

    this.gl.drawArrays(gl.TRIANGLES, 0, this.position.length/3);
  }
}
