import { createProgram, getProgramSetters } from "./glUtil.js"
import undent from './undent.js';

export class InstancedRenderer{
  uniformDefs = {};
  uniforms = {};
  attribDefs = {};
  attribs = {
    a_position: new Float32Array([
      -1, -.5,
      1, 0,
      -1,  .5,
    ]),
  }

  vertexShaderSource = undent`
    #version 300 es
    in vec2 a_position;
    void main() {
      float factor = float(gl_InstanceID+1)/11.0*2.-1.;
      gl_Position = vec4((vec3((a_position*vec2(1,0.2)+vec2(0,factor)),1)).xy,0,1);
    }
  `;
 
  fragmentShaderSource = undent`
    #version 300 es
    precision highp float;
    out vec4 outColor;
    void main() {
      outColor = vec4(1,0,0,1);
    }
  `;

  constructor(gl){
    this.gl = gl;
  }

  load(){
    if(this.loaded) return;
    this.loaded = 1;
    const gl = this.gl;
    if(!this.program) this.program = createProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
    gl.useProgram(this.program);

    const program = this.program;

    this.setters = getProgramSetters(gl, program, { attribs: this.attribDefs });

    if(!this.instances) this.instances = Array(10).fill().map(x=>({}));
    for(let i=0;i<this.instances.length;i++) this.instances[i] = this.instances[i] || {};

    Object.entries(this.setters.attribs).forEach(([name, setter])=>{
      const def = this.attribDefs[name] || {};

      if(def.instanced){

        const arrayLength = this.instances.length*setter.stride;

        // Already have a big enough buffer
        const needsNewBuffer = !this.attribs[name] || this.attribs[name].length < arrayLength;

        if(needsNewBuffer) this.attribs[name] = new Float32Array(arrayLength);
        this.instances.forEach((instance,i)=>{
          // create a view on the part of the buffer for this instance
          let x = new Float32Array(this.attribs[name].buffer, i*setter.stride*4, setter.stride);

          // copy over old value if it exists
          if(instance[name] !== undefined){
            for(let i=0;i<setter.stride;i++) x[i] = instance[name][i];
          }
          // set property that can not be overwritten
          Object.defineProperty(instance, name, { value:x, writable:false, configurable:true });
        });
      }
      setter(this.attribs[name]);
    });
  }

  render(){
    this.load();

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // set uniforms
    Object.entries(this.uniforms).forEach(([name, data])=>{
      const set = this.setters.uniforms[name];
      if(!set) return;
      set(data);
    });

    // set attributes
    Object.entries(this.attribDefs).forEach(([name, def])=>{
      const set = this.setters.attribs[name];
      if(!set) return;
      set(this.attribs[name]);
    });

    // Draw
    gl.drawArraysInstanced(
      gl.TRIANGLES,
      0,             // offset
      this.attribs.a_position.length/this.setters.attribs.a_position.typeInfo.size, // num vertices per instance
      this.instances.length,  // num instances
    );
  }
}
