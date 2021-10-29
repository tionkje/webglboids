const { mat3, mat4, vec2, vec3, vec4 } = glMatrix;

// [N , N.P] // 4 nrs // N*-N[3] gives point on plane
// ax+by+cz+d = 0 // a,b,c is plane normal, x,y,z is a point on the plane, so (N.P) = -d
export const mkplane = (N,P)=>vec4.fromValues(...N,-vec3.dot(N,P));

export const rayIntersectPlane = (ori,dir,plane)=>{
  // make a copy as not to edit original data
  plane = vec4.clone(plane);

  // if denom = 0 ray is parallell to plane
  const denom = vec3.dot(dir,plane);
  if(Math.abs(denom) < 0.00001) return false; // parallel to plane

  // ori + t*dir = point on plane
  const t = -(vec3.dot(ori,plane) + plane[3])/denom;
  if(t < 0) return false; // raycasting away from plane
  const res = vec3.create();
  return vec3.scaleAndAdd(vec3.create(), ori, dir, t);
}

export const screenToPlane = (mousePos,plane,screen,invViewProj)=>{
  const DN = x=>x*2-1;

  // screen position in clipping space
  const x = DN(mousePos[0]/screen[0]);
  const y = -DN(mousePos[1]/screen[1]);

  // point on near plane
  const near = vec4.fromValues(x,y,-1,1);
  vec4.transformMat4(near, near, invViewProj);
  vec4.scale(near,near,1/near[3]);

  // point on far plane
  const far = vec4.fromValues(x,y,1,1);
  vec4.transformMat4(far, far, invViewProj);
  vec4.scale(far,far,1/far[3]);

  // create ray direction
  vec3.sub(far, far, near);
  vec3.normalize(far,far);

  // intersect ray with plane
  return rayIntersectPlane(near, far, plane);
}
