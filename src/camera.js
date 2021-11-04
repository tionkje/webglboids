import "../node_modules/gl-matrix/gl-matrix.js";
const { mat3, mat4, vec2, vec3, vec4 } = glMatrix;

export class Camera{
  zNear = 100;
  zFar = 1000;
  perspective = false;

  camMat = mat4.create();
  viewMat = mat4.create();
  projMat = mat4.create();
  viewProj = mat4.create();
  invViewProj = mat4.create();

  viewChanged = 1;

  update(){
    if(!this.viewChanged) return
    this.viewChanged=0;

    mat4.invert(this.viewMat, this.camMat);
    mat4.multiply(this.viewProj, this.projMat, this.viewMat);
    mat4.invert(this.invViewProj, this.viewProj);
  }

  resize(width, height){
    mat4.identity(this.camMat);
    const aspect = width/height
    if(this.perspective){
      // create perspective camera where z-nul plane has coords that align to screen coords
      mat4.perspective(this.projMat, Math.PI/2, aspect, this.zNear, this.zFar);
      mat4.scale(this.projMat, this.projMat, vec3.fromValues(1,-1,1));
      mat4.translate(this.camMat, this.camMat, vec3.fromValues(width/2,height/2,height/2));
    }else{
      mat4.ortho(this.projMat, 0, width, height,0, this.zNear, this.zFar)
      mat4.translate(this.camMat, this.camMat, vec3.fromValues(0,0,height/2));
    }

    this.viewChanged=1;
  }
}
