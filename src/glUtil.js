import undent from './undent.js';

export function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    console.error(gl.getShaderInfoLog(shader));
    debugger;
    gl.deleteShader(shader);
  }

  // Create Shaders
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.error(gl.getProgramInfoLog(program));
  debugger;
  gl.deleteProgram(program);
}

const wgl = WebGL2RenderingContext;
const typeData = {
  [wgl.INT]:       { size: 1, type: wgl.INT,   locs:1, typeBytes: 4, uniformFunc:'uniform1iv' },
  [wgl.FLOAT]:     { size: 1, type: wgl.FLOAT, locs:1, typeBytes: 4, uniformFunc:'uniform1fv' },
  [wgl.FLOAT_VEC2]:{ size: 2, type: wgl.FLOAT, locs:1, typeBytes: 4, uniformFunc:'uniform2fv' },
  [wgl.FLOAT_VEC3]:{ size: 3, type: wgl.FLOAT, locs:1, typeBytes: 4, uniformFunc:'uniform3fv' },
  [wgl.FLOAT_VEC4]:{ size: 4, type: wgl.FLOAT, locs:1, typeBytes: 4, uniformFunc:'uniform4fv' },
  [wgl.FLOAT_MAT2]:{ size: 2, type: wgl.FLOAT, locs:2, typeBytes: 4, uniformFunc:'uniformMatrix2fv', transpose:false },
  [wgl.FLOAT_MAT3]:{ size: 3, type: wgl.FLOAT, locs:3, typeBytes: 4, uniformFunc:'uniformMatrix3fv', transpose:false },
  [wgl.FLOAT_MAT4]:{ size: 4, type: wgl.FLOAT, locs:4, typeBytes: 4, uniformFunc:'uniformMatrix4fv', transpose:false },
}

export function getProgramSetters(gl, program, definitions){
  gl.useProgram(program);


  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);


  // Attribs
  const attribs = {};
  const attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for(let i=0;i<attribCount;i++){
    const info = gl.getActiveAttrib(program, i);
    const loc = gl.getAttribLocation(program,info.name);
    if(loc<0) continue; // ignore used builtins ( gl_InstanceID, ... )

    const def = { // defaults
      dynamic: false,
      instanced: 0, // 0 is default tightly packed attributes
      ...(definitions?.attribs?.[info.name] || {}) 
    };

    const typeInfo = typeData[info.type];
    const stride = typeInfo.size*typeInfo.locs;

    const glBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

    for(let i=0;i<typeInfo.locs;i++){
      gl.enableVertexAttribArray(loc+i);
      gl.vertexAttribPointer(loc+i, typeInfo.size, typeInfo.type, false, 
        stride*typeInfo.typeBytes,
        i*typeInfo.size*typeInfo.typeBytes)
      gl.vertexAttribDivisor(loc+i, def.instanced|0);
    }

    if(attribs[info.name]) throw new Error('Why??');
    // create our setter
    let lastBufferSize = 0;
    let lastBuffer;
    attribs[info.name] = newData => {
      if(newData == undefined) return lastBuffer;
      lastBuffer = newData;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
      if(newData.byteLength != lastBufferSize){
        gl.bufferData(gl.ARRAY_BUFFER, 
          newData.byteLength,
          def.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
        lastBufferSize = newData.byteLength;
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);
    }

    attribs[info.name].stride = stride;
    attribs[info.name].typeInfo = typeInfo;
  }

  // Uniforms
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getActiveUniform
  const uniforms = {};
  const unifromCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for(let i=0;i<unifromCount;i++){
    const info = gl.getActiveUniform(program, i);
    const loc = gl.getUniformLocation(program,info.name);
    if(loc<0) continue; // ignore used builtins ( gl_InstanceID, ... )

    const typeInfo = typeData[info.type];

    if(uniforms[info.name]) throw new Error('Why??');
    let lastData = null;
    uniforms[info.name] = (newData) => {
      if(newData == undefined) return lastData;
      lastData = newData;
      gl.useProgram(program);
      if(typeInfo.transpose != undefined)
        gl[typeInfo.uniformFunc](loc, typeInfo.transpose, newData);
      else
        gl[typeInfo.uniformFunc](loc, newData);
    }
  }

  // return our array of setters
  return { attribs, uniforms, bindVAO:()=>gl.bindVertexArray(vao) };
}


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

