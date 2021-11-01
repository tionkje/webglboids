import undent from './undent.js';
import { createProgram, getProgramSetters } from "./glUtil.js"

import "../node_modules/gl-matrix/gl-matrix.js";
const { vec3 } = glMatrix;

function lineSegmentToQuad(start,end,width){
  var dir = vec3.sub(vec3.create(),end,start);
  var up = vec3.fromValues(dir[1],-dir[0],dir[2]);
  vec3.normalize(up,up);
  var up = vec3.scale(up, up, width);
  var down = vec3.scale(vec3.create(), up, -1);
  var up2 = vec3.add(vec3.create(), up, dir);
  var down2 = vec3.add(vec3.create(), down, dir);
  return [up, up2, down, down2].map(x=>vec3.add(x,x,start));
}

export const S_CIRCLE=0;
export const S_RECT=1;
export const S_LINE=2;
export function createDebugShape(shape,color,nr){
  let s;
  switch(shape) {
    case S_CIRCLE:{
      const [pos,radius] = nr;
      s = new Circle(gl);
      s.setPosition(pos);
      s.setRadius(radius);
      break;
    }case S_RECT:{
      const [dims] = nr;
      s = new Rect(gl);
      s.setRect(...dims);
      break;
    }case S_LINE:{
      const [start,end,width] = nr;
      s = new Rect(gl);
      s.setCorners(lineSegmentToQuad(start,end,width));
      break;
    }default: return;
  }
  s.setColor(color);
  return s;
}


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
    this.setRect(0,0,0,0);
  }

  setColor(color){this.color=color;}
  setViewProj(viewProj){this.viewProj=viewProj;}
  setRect(x,y,w,h){
    this.setCorners([[x,y],[x+w,y],[x,y+h],[x+w,y+h]]);
  }
  setCorners(vtxs){
    const idxs = [0,2,1,1,2,3];
    this.position = new Float32Array(idxs.flatMap(i=> [...vtxs[i].slice(0,2),0]));
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
